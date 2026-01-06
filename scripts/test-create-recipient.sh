#!/bin/bash

set -e

BASE_URL="${BASE_URL:-https://likeme-back-end-one.vercel.app}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "TESTE: Criação de Recipient na Pagarme"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# 1. Criar usuário de teste
echo "1. Criando usuário de teste..."
TIMESTAMP=$(date +%s)
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"test_recipient_${TIMESTAMP}\",
    \"password\": \"Test123!@#\",
    \"email\": \"test_recipient_${TIMESTAMP}@example.com\",
    \"firstName\": \"Test\",
    \"lastName\": \"Recipient\"
  }" \
  "$BASE_URL/api/auth/register")

TOKEN=$(echo "$REGISTER_RESPONSE" | jq -r '.data.token // .token // empty' 2>/dev/null)
if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo -e "${RED}❌ Erro ao obter token${NC}"
  echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Usuário criado${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Criar recipient individual
echo "2. Criando recipient individual na Pagarme..."
RECIPIENT_DATA=$(cat <<EOF
{
  "register_information": {
    "email": "test_recipient_${TIMESTAMP}@example.com",
    "document": "11144477735",
    "type": "individual",
    "site_url": "https://example.com",
    "phone_numbers": [
      {
        "ddd": "11",
        "number": "999999999",
        "type": "mobile"
      }
    ],
    "name": "Test Recipient",
    "mother_name": "Maria da Silva",
    "birthdate": "01/01/1990",
    "monthly_income": "300000",
    "professional_occupation": "Desenvolvedor",
    "address": {
      "street": "Rua Teste",
      "complementary": "Apto 1",
      "street_number": "123",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zip_code": "01234567",
      "reference_point": "Próximo ao metrô"
    }
  },
  "default_bank_account": {
    "holder_name": "Test Recipient",
    "holder_type": "individual",
    "holder_document": "11144477735",
    "bank": "341",
    "branch_number": "1234",
    "branch_check_digit": "6",
    "account_number": "12345",
    "account_check_digit": "6",
    "type": "checking"
  },
  "transfer_settings": {
    "transfer_enabled": true,
    "transfer_interval": "Weekly",
    "transfer_day": 1
  }
}
EOF
)

echo "   Enviando requisição..."
RECIPIENT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RECIPIENT_DATA" \
  "$BASE_URL/api/payment/recipients/individual")

SUCCESS=$(echo "$RECIPIENT_RESPONSE" | jq -r '.success // false' 2>/dev/null || echo "false")
RECIPIENT_ID=$(echo "$RECIPIENT_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")

if [ "$SUCCESS" = "true" ] && [ -n "$RECIPIENT_ID" ]; then
  echo ""
  echo -e "${GREEN}✅ SUCESSO! Recipient criado${NC}"
  echo "  Recipient ID: $RECIPIENT_ID"
  echo ""
  echo "📋 Detalhes do recipient:"
  echo "$RECIPIENT_RESPONSE" | jq '.data | {id, name, email, document, type, status}' 2>/dev/null || echo "$RECIPIENT_RESPONSE"
  echo ""
  echo -e "${GREEN}✅ Teste concluído com sucesso!${NC}"
  echo ""
  echo "💡 Verifique no dashboard da Pagarme se o recipient aparece:"
  echo "   https://dashboard.pagar.me/recipients"
else
  echo ""
  echo -e "${RED}❌ Erro ao criar recipient${NC}"
  echo "$RECIPIENT_RESPONSE" | jq '.' 2>/dev/null || echo "$RECIPIENT_RESPONSE"
  exit 1
fi

echo ""
echo "=========================================="
echo "Teste concluído!"
echo "=========================================="

