#!/bin/bash

# Script para testar criação de pedido com pagamento bem-sucedido na Pagarme
# Usa cartão de teste 4000000000000002 que retorna sucesso

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

# 1. Criar usuário de teste
echo "1. Criando usuário de teste..."
TIMESTAMP=$(date +%s)
USERNAME="testuser_${TIMESTAMP}"
EMAIL="test_${TIMESTAMP}@example.com"

REGISTER_DATA=$(cat <<EOF
{
  "username": "${USERNAME}",
  "password": "Test123!@#",
  "email": "${EMAIL}",
  "firstName": "Test",
  "lastName": "User"
}
EOF
)

REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA" \
  "$BASE_URL/api/auth/register")

echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# 2. Login para obter token
echo "2. Fazendo login..."
LOGIN_DATA=$(cat <<EOF
{
  "username": "${USERNAME}",
  "password": "Test123!@#"
}
EOF
)

LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA" \
  "$BASE_URL/api/auth/login")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.token // .token // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Erro ao obter token${NC}"
  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token obtido${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 3. Atualizar CPF do usuário (necessário para Pagarme)
echo "3. Obtendo ID do usuário para atualizar CPF..."
USER_INFO=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/auth/me")

USER_ID=$(echo "$USER_INFO" | jq -r '.data.id // empty' 2>/dev/null)
PERSON_ID=$(echo "$USER_INFO" | jq -r '.data.personId // empty' 2>/dev/null)

if [ -z "$PERSON_ID" ]; then
  echo -e "${YELLOW}⚠️  Person ID não encontrado, tentando criar pessoa...${NC}"
  # Criar pessoa se não existir
  CREATE_PERSON_DATA=$(cat <<EOF
{
  "firstName": "Test",
  "lastName": "User",
  "nationalRegistration": "12345678901"
}
EOF
)
  
  CREATE_PERSON_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$CREATE_PERSON_DATA" \
    "$BASE_URL/api/person")
  
  PERSON_ID=$(echo "$CREATE_PERSON_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null)
fi

if [ -n "$PERSON_ID" ]; then
  echo "Atualizando CPF da pessoa (ID: $PERSON_ID)..."
  UPDATE_PERSON_DATA=$(cat <<EOF
{
  "nationalRegistration": "12345678901"
}
EOF
)
  
  UPDATE_RESPONSE=$(curl -s -X PUT \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_PERSON_DATA" \
    "$BASE_URL/api/person/$PERSON_ID")
  
  echo "$UPDATE_RESPONSE" | jq '.' 2>/dev/null || echo "$UPDATE_RESPONSE"
  echo ""
fi

# 4. Criar produto de teste
echo "4. Criando produto de teste..."
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

# 5. Criar pedido com pagamento (cartão de teste que retorna sucesso)
echo "5. Criando pedido com pagamento (cartão 4000000000000002 - sucesso)..."
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
echo "Resposta:"
echo "$ORDER_BODY" | jq '.' 2>/dev/null || echo "$ORDER_BODY"
echo ""

if [ "$HTTP_STATUS" = "201" ]; then
  ORDER_ID=$(echo "$ORDER_BODY" | jq -r '.data.id // empty' 2>/dev/null)
  PAYMENT_STATUS=$(echo "$ORDER_BODY" | jq -r '.data.paymentStatus // empty' 2>/dev/null)
  TRANSACTION_ID=$(echo "$ORDER_BODY" | jq -r '.data.paymentTransactionId // empty' 2>/dev/null)
  
  if [ "$PAYMENT_STATUS" = "paid" ]; then
    echo -e "${GREEN}✅ SUCESSO! Pedido criado e pagamento aprovado${NC}"
    echo "  Order ID: $ORDER_ID"
    echo "  Payment Status: $PAYMENT_STATUS"
    echo "  Transaction ID: $TRANSACTION_ID"
  else
    echo -e "${YELLOW}⚠️  Pedido criado mas pagamento não foi aprovado${NC}"
    echo "  Order ID: $ORDER_ID"
    echo "  Payment Status: $PAYMENT_STATUS"
    echo "  Transaction ID: $TRANSACTION_ID"
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

