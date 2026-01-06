#!/bin/bash

# Script para testar criação de pedido com pagamento bem-sucedido na Pagarme
# Cria usuário diretamente no banco e usa JWT para autenticação

set -e

BASE_URL="${1:-http://localhost:3000}"
JWT_SECRET="${JWT_SECRET:-your-super-secret-jwt-key-here-change-this-in-production}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "TESTE: Criação de Pedido com Pagamento Sucesso"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# Verificar se node está disponível
if ! command -v node &> /dev/null; then
  echo -e "${RED}❌ Node.js não encontrado${NC}"
  exit 1
fi

# Criar script Node.js temporário para criar usuário e gerar token
TEMP_SCRIPT=$(mktemp)
cat > "$TEMP_SCRIPT" <<'NODE_SCRIPT'
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here-change-this-in-production';

async function createTestUser() {
  try {
    const timestamp = Date.now();
    const uniqueId = `${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
    
    // Criar pessoa
    const person = await prisma.person.create({
      data: {
        firstName: 'Test',
        lastName: 'User',
        nationalRegistration: '12345678901', // CPF necessário para Pagarme
      },
    });
    
    // Criar usuário
    const user = await prisma.user.create({
      data: {
        personId: person.id,
        username: `test-${uniqueId}@example.com`,
        password: '',
        isActive: true,
      },
    });
    
    // Criar email contact
    await prisma.personContact.create({
      data: {
        personId: person.id,
        type: 'email',
        value: `test-${uniqueId}@example.com`,
      },
    });
    
    // Gerar token JWT
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    
    console.log(JSON.stringify({
      success: true,
      userId: user.id,
      personId: person.id,
      token: token,
    }));
  } catch (error) {
    console.error(JSON.stringify({
      success: false,
      error: error.message,
    }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();
NODE_SCRIPT

echo "1. Criando usuário de teste no banco..."
USER_DATA=$(cd /Users/weber/Projetos/likeme/likeme-back-end && node "$TEMP_SCRIPT" 2>&1)
rm "$TEMP_SCRIPT"

SUCCESS=$(echo "$USER_DATA" | jq -r '.success // false' 2>/dev/null)

if [ "$SUCCESS" != "true" ]; then
  echo -e "${RED}❌ Erro ao criar usuário${NC}"
  echo "$USER_DATA"
  exit 1
fi

USER_ID=$(echo "$USER_DATA" | jq -r '.userId' 2>/dev/null)
PERSON_ID=$(echo "$USER_DATA" | jq -r '.personId' 2>/dev/null)
TOKEN=$(echo "$USER_DATA" | jq -r '.token' 2>/dev/null)

if [ -z "$TOKEN" ]; then
  echo -e "${RED}❌ Erro ao gerar token${NC}"
  echo "$USER_DATA"
  exit 1
fi

echo -e "${GREEN}✅ Usuário criado (ID: $USER_ID)${NC}"
echo -e "${GREEN}✅ Token gerado${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Criar produto de teste
echo "2. Criando produto de teste..."
PRODUCT_DATA=$(cat <<EOF
{
  "name": "Produto Teste Pagarme",
  "description": "Produto para testar pagamento bem-sucedido",
  "price": 99.99,
  "quantity": 10,
  "category": "physical product",
  "status": "active"
}
EOF
)

PRODUCT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PRODUCT_DATA" \
  "$BASE_URL/api/products")

PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)

if [ -z "$PRODUCT_ID" ]; then
  echo -e "${RED}❌ Erro ao criar produto${NC}"
  echo "$PRODUCT_RESPONSE" | jq '.' 2>/dev/null || echo "$PRODUCT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Produto criado (ID: $PRODUCT_ID)${NC}"
echo "$PRODUCT_RESPONSE" | jq '.data | {id, name, price, quantity}' 2>/dev/null || echo "$PRODUCT_RESPONSE"
echo ""

# 3. Criar pedido com pagamento (cartão de teste que retorna sucesso)
echo "3. Criando pedido com pagamento (cartão 4000000000000002 - sucesso)..."
ORDER_DATA=$(cat <<EOF
{
  "items": [
    {
      "productId": "$PRODUCT_ID",
      "quantity": 1,
      "discount": 0
    }
  ],
  "status": "pending",
  "shippingCost": 10.00,
  "tax": 0,
  "shippingAddress": "Rua Teste, 123 - São Paulo, SP - 01234567",
  "billingAddress": {
    "country": "br",
    "state": "SP",
    "city": "São Paulo",
    "street": "Rua Teste",
    "streetNumber": "123",
    "zipcode": "01234567"
  },
  "paymentMethod": "credit_card",
  "cardData": {
    "cardNumber": "4000000000000002",
    "cardHolderName": "Test User",
    "cardExpirationDate": "1226",
    "cardCvv": "123",
    "cpf": "12345678901"
  }
}
EOF
)

echo "Enviando requisição de criação de pedido..."
ORDER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA" \
  "$BASE_URL/api/orders")

HTTP_STATUS=$(echo "$ORDER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
ORDER_BODY=$(echo "$ORDER_RESPONSE" | sed '/HTTP_STATUS/d')

echo ""
echo "Status HTTP: $HTTP_STATUS"
echo ""
echo "Resposta completa:"
echo "$ORDER_BODY" | jq '.' 2>/dev/null || echo "$ORDER_BODY"
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
  ORDER_ID=$(echo "$ORDER_BODY" | jq -r '.data.id // empty' 2>/dev/null)
  PAYMENT_STATUS=$(echo "$ORDER_BODY" | jq -r '.data.paymentStatus // empty' 2>/dev/null)
  TRANSACTION_ID=$(echo "$ORDER_BODY" | jq -r '.data.paymentTransactionId // empty' 2>/dev/null)
  ORDER_TOTAL=$(echo "$ORDER_BODY" | jq -r '.data.total // empty' 2>/dev/null)
  
  if [ "$PAYMENT_STATUS" = "paid" ]; then
    echo -e "${GREEN}✅ SUCESSO! Pedido criado e pagamento aprovado${NC}"
    echo "  Order ID: $ORDER_ID"
    echo "  Payment Status: $PAYMENT_STATUS"
    echo "  Transaction ID: $TRANSACTION_ID"
    echo "  Total: R$ $ORDER_TOTAL"
    echo ""
    echo -e "${GREEN}✅ Teste concluído com sucesso!${NC}"
  else
    echo -e "${YELLOW}⚠️  Pedido criado mas pagamento não foi aprovado${NC}"
    echo "  Order ID: $ORDER_ID"
    echo "  Payment Status: $PAYMENT_STATUS"
    echo "  Transaction ID: $TRANSACTION_ID"
    echo "  Total: R$ $ORDER_TOTAL"
    echo ""
    echo -e "${RED}❌ Pagamento não foi aprovado pela Pagarme${NC}"
    exit 1
  fi
else
  echo -e "${RED}❌ Erro ao criar pedido${NC}"
  ERROR_MSG=$(echo "$ORDER_BODY" | jq -r '.message // .error // "Erro desconhecido"' 2>/dev/null)
  echo "  Erro: $ERROR_MSG"
  exit 1
fi

echo ""
echo "=========================================="
echo "Teste concluído!"
echo "=========================================="

