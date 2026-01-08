#!/bin/bash

# Script para testar criação de recebedor via endpoint do backend
# Isso vai gerar logs na Vercel que podem ser visualizados

set -e

# Configurações
BASE_URL="${BASE_URL:-https://likeme-back-end-one.vercel.app}"
# BASE_URL="${BASE_URL:-http://localhost:3000}"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=========================================="
echo "TESTE: Criação de Recebedor via Endpoint"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# 1. Criar usuário de teste e obter token
echo "1. Criando usuário de teste e obtendo token..."
TIMESTAMP=$(date +%s)
USERNAME="test_recipient_${TIMESTAMP}"
EMAIL="test_recipient_${TIMESTAMP}@example.com"

REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"${USERNAME}\",
    \"password\": \"Test123!@#\",
    \"email\": \"${EMAIL}\",
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

echo -e "${GREEN}✅ Token obtido${NC}"
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Criar recebedor individual
echo "2. Criando recebedor individual..."
RECIPIENT_DATA=$(cat <<EOF
{
  "register_information": {
    "phone_numbers": [
      {
        "ddd": "21",
        "number": "994647568",
        "type": "mobile"
      }
    ],
    "address": {
      "street": "Av. General Justo",
      "complementary": "Bloco A",
      "street_number": "375",
      "neighborhood": "Centro",
      "city": "Rio de Janeiro",
      "state": "RJ",
      "zip_code": "20021130",
      "reference_point": "Ao lado da banca de jornal"
    },
    "name": "Teste Recebedor PF $(date +%s)",
    "email": "teste.recebedor.$(date +%s)@example.com",
    "document": "26224451990",
    "type": "individual",
    "site_url": "https://example.com",
    "mother_name": "Maria Silva",
    "birthdate": "12/10/1995",
    "monthly_income": 12000000,
    "professional_occupation": "Vendedor"
  },
  "default_bank_account": {
    "holder_name": "Teste Recebedor PF",
    "holder_type": "individual",
    "holder_document": "26224451990",
    "bank": "341",
    "branch_number": "1234",
    "branch_check_digit": "6",
    "account_number": "12345",
    "account_check_digit": "6",
    "type": "checking"
  },
  "transfer_settings": {
    "transfer_enabled": false,
    "transfer_interval": "Daily",
    "transfer_day": 0
  }
}
EOF
)

echo "📤 Enviando requisição para: $BASE_URL/api/payment/recipients/individual"
echo ""

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$RECIPIENT_DATA" \
  "$BASE_URL/api/payment/recipients/individual")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "📊 Resposta:"
echo "Status HTTP: $HTTP_CODE"
echo ""

if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
  echo -e "${GREEN}✅ Sucesso!${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  
  RECIPIENT_ID=$(echo "$BODY" | jq -r '.data.id // empty' 2>/dev/null)
  if [ -n "$RECIPIENT_ID" ] && [ "$RECIPIENT_ID" != "null" ]; then
    echo ""
    echo -e "${GREEN}✅ Recebedor criado com ID: $RECIPIENT_ID${NC}"
  fi
else
  echo -e "${RED}❌ Erro (HTTP $HTTP_CODE)${NC}"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
fi

echo ""
echo "=========================================="
echo "✅ Teste concluído!"
echo "=========================================="
echo ""
echo "💡 Dica: Verifique os logs na Vercel para ver detalhes completos da requisição"
echo "   Dashboard: https://vercel.com/dashboard"

