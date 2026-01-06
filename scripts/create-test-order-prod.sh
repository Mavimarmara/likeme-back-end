#!/bin/bash

# Script para testar criação de pedido com pagamento bem-sucedido na Pagarme (PRODUÇÃO)
# Usa API de produção para criar usuário e obter token válido

set -e

BASE_URL="${1:-https://likeme-back-end-one.vercel.app}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=========================================="
echo "TESTE: Criação de Pedido com Pagamento Sucesso (Pagarme) - PRODUÇÃO"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# 1. Criar usuário via API de produção
echo "1. Criando usuário de teste via API de produção..."
TIMESTAMP=$(date +%s)
UNIQUE_ID="${TIMESTAMP}-${RANDOM}"

REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"test_${TIMESTAMP}\",
    \"password\": \"Test123!@#\",
    \"email\": \"test_${TIMESTAMP}@example.com\",
    \"firstName\": \"Test\",
    \"lastName\": \"User\"
  }" \
  "$BASE_URL/api/auth/register")

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token // .token // empty' 2>/dev/null)
USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.data.user.id // .data.id // empty' 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Erro ao obter token${NC}"
  echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Usuário criado${NC}"
echo "Token: ${TOKEN:0:50}..."
echo "User ID: $USER_ID"
echo ""

# 2. CPF será enviado no cardData (não precisa atualizar no perfil)
echo "2. CPF será enviado no cardData do pedido"
echo "   CPF: 12345678901"
echo ""

# 3. Criar produto de teste
echo "3. Criando produto de teste..."
PRODUCT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Produto Teste Pagarme","description":"Teste","price":99.99,"quantity":10,"category":"physical product","status":"active"}' \
  "$BASE_URL/api/products")

PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.data.id' 2>/dev/null)

if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
  echo -e "${RED}❌ Erro ao criar produto${NC}"
  echo "$PRODUCT_RESPONSE" | jq '.' 2>/dev/null || echo "$PRODUCT_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Produto criado (ID: $PRODUCT_ID)${NC}"
echo "$PRODUCT_RESPONSE" | jq '.data | {id, name, price, quantity}' 2>/dev/null || echo "$PRODUCT_RESPONSE"
echo ""

# 4. Criar pedido com pagamento (testando diferentes cartões)
echo "4. Criando pedido com pagamento..."
CPF_TEST="12345678901"
echo "   CPF no cardData: $CPF_TEST"

# Garantir que CPF está presente e válido (11 dígitos)
if [ ${#CPF_TEST} -ne 11 ]; then
  echo -e "${RED}❌ ERRO: CPF deve ter 11 dígitos!${NC}"
  exit 1
fi

# Tentar diferentes cartões de teste até um funcionar
TEST_CARDS=("4000000000000002" "4111111111111111" "5555555555554444")
CARD_INDEX=0
SUCCESS=false

for TEST_CARD in "${TEST_CARDS[@]}"; do
  CARD_INDEX=$((CARD_INDEX + 1))
  echo ""
  echo "   Tentativa $CARD_INDEX/${#TEST_CARDS[@]}: Cartão $TEST_CARD"
  
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
    "cardNumber": "$TEST_CARD",
    "cardHolderName": "Test User",
    "cardExpirationDate": "1226",
    "cardCvv": "123",
    "cpf": "$CPF_TEST"
  }
}
EOF
)

  # Verificar se CPF está no cardData antes de enviar
  if echo "$ORDER_DATA" | grep -q "\"cpf\": \"$CPF_TEST\""; then
    echo -e "${GREEN}✅ CPF confirmado no cardData${NC}"
  else
    echo -e "${RED}❌ ERRO: CPF não encontrado no cardData!${NC}"
    continue
  fi

  echo "   Enviando requisição..."
  ORDER_RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "$ORDER_DATA" \
    "$BASE_URL/api/orders")

  HTTP_STATUS=$(echo "$ORDER_RESPONSE" | grep "HTTP_STATUS" | cut -d: -f2)
  ORDER_BODY=$(echo "$ORDER_RESPONSE" | sed '/HTTP_STATUS/d')

  if [ "$HTTP_STATUS" = "201" ]; then
    ORDER_ID=$(echo "$ORDER_BODY" | jq -r '.data.id' 2>/dev/null)
    PAYMENT_STATUS=$(echo "$ORDER_BODY" | jq -r '.data.paymentStatus' 2>/dev/null)
    TRANSACTION_ID=$(echo "$ORDER_BODY" | jq -r '.data.paymentTransactionId' 2>/dev/null)
    ORDER_TOTAL=$(echo "$ORDER_BODY" | jq -r '.data.total' 2>/dev/null)
    
    if [ "$PAYMENT_STATUS" = "paid" ]; then
      echo ""
      echo -e "${GREEN}✅ SUCESSO! Pedido criado e pagamento aprovado${NC}"
      echo "  Order ID: $ORDER_ID"
      echo "  Payment Status: $PAYMENT_STATUS"
      echo "  Transaction ID: $TRANSACTION_ID"
      echo "  Total: R$ $ORDER_TOTAL"
      echo "  Cartão usado: $TEST_CARD"
      echo ""
      echo -e "${GREEN}✅ Teste concluído com sucesso!${NC}"
      SUCCESS=true
      break
    else
      echo -e "${YELLOW}⚠️  Pedido criado mas pagamento não aprovado (Status: $PAYMENT_STATUS)${NC}"
      echo "   Tentando próximo cartão..."
      continue
    fi
  else
    ERROR_MSG=$(echo "$ORDER_BODY" | jq -r '.message // .error // "Erro desconhecido"' 2>/dev/null)
    echo -e "${YELLOW}⚠️  Erro com cartão $TEST_CARD: $ERROR_MSG${NC}"
    echo "   Tentando próximo cartão..."
    continue
  fi
done

if [ "$SUCCESS" = false ]; then
  echo ""
  echo -e "${RED}❌ Nenhum cartão de teste funcionou${NC}"
  echo "   Última resposta:"
  echo "$ORDER_BODY" | jq '.' 2>/dev/null || echo "$ORDER_BODY"
  exit 1
fi

echo ""
echo "=========================================="
echo "Teste concluído!"
echo "=========================================="

