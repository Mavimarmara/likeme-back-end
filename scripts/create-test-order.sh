#!/bin/bash

set -e

BASE_URL="${1:-http://localhost:3000}"

cd "$(dirname "$0")/.."

echo "=========================================="
echo "TESTE: Criação de Pedido com Pagamento Sucesso (Pagarme)"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# 1. Criar usuário e obter token
echo "1. Criando usuário de teste..."
USER_DATA=$(node <<'NODE_SCRIPT'
const { PrismaClient } = require('@prisma/client');
const jwt = require('jsonwebtoken');
const prisma = new PrismaClient();
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-here-change-this-in-production';

(async () => {
  try {
    const timestamp = Date.now();
    const uniqueId = `${timestamp}-${Math.random().toString(36).substring(2, 9)}`;
    const person = await prisma.person.create({
      data: { firstName: 'Test', lastName: 'User', nationalRegistration: '12345678901' },
    });
    const user = await prisma.user.create({
      data: { personId: person.id, username: `test-${uniqueId}@example.com`, password: '', isActive: true },
    });
    await prisma.personContact.create({
      data: { personId: person.id, type: 'email', value: `test-${uniqueId}@example.com` },
    });
    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    console.log(JSON.stringify({ success: true, userId: user.id, personId: person.id, token }));
  } catch (error) {
    console.error(JSON.stringify({ success: false, error: error.message }));
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
})();
NODE_SCRIPT
)

TOKEN=$(echo "$USER_DATA" | jq -r '.token' 2>/dev/null)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "❌ Erro ao criar usuário"
  echo "$USER_DATA"
  exit 1
fi

echo "✅ Usuário criado"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Criar produto
echo "2. Criando produto de teste..."
PRODUCT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Teste Pagarme","description":"Teste","price":99.99,"quantity":10,"category":"physical product","status":"active"}' \
  "$BASE_URL/api/products")

PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.data.id' 2>/dev/null)
if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo "❌ Erro ao criar produto"
  echo "$PRODUCT_RESPONSE" | jq '.' 2>/dev/null || echo "$PRODUCT_RESPONSE"
  exit 1
fi

echo "✅ Produto criado (ID: $PRODUCT_ID)"
echo ""

# 3. Criar pedido com pagamento
echo "3. Criando pedido com pagamento (cartão 4000000000000002 - sucesso)..."
ORDER_DATA=$(cat <<EOF
{
  "items": [{"productId": "$PRODUCT_ID", "quantity": 1, "discount": 0}],
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
  ORDER_ID=$(echo "$ORDER_BODY" | jq -r '.data.id' 2>/dev/null)
  PAYMENT_STATUS=$(echo "$ORDER_BODY" | jq -r '.data.paymentStatus' 2>/dev/null)
  TRANSACTION_ID=$(echo "$ORDER_BODY" | jq -r '.data.paymentTransactionId' 2>/dev/null)
  ORDER_TOTAL=$(echo "$ORDER_BODY" | jq -r '.data.total' 2>/dev/null)
  
  if [ "$PAYMENT_STATUS" = "paid" ]; then
    echo "✅ SUCESSO! Pedido criado e pagamento aprovado"
    echo "  Order ID: $ORDER_ID"
    echo "  Payment Status: $PAYMENT_STATUS"
    echo "  Transaction ID: $TRANSACTION_ID"
    echo "  Total: R$ $ORDER_TOTAL"
  else
    echo "⚠️  Pedido criado mas pagamento não foi aprovado"
    echo "  Order ID: $ORDER_ID"
    echo "  Payment Status: $PAYMENT_STATUS"
    echo "  Transaction ID: $TRANSACTION_ID"
    exit 1
  fi
else
  echo "❌ Erro ao criar pedido"
  ERROR_MSG=$(echo "$ORDER_BODY" | jq -r '.message // .error // "Erro desconhecido"' 2>/dev/null)
  echo "  Erro: $ERROR_MSG"
  exit 1
fi

echo ""
echo "=========================================="
echo "Teste concluído!"
echo "=========================================="

