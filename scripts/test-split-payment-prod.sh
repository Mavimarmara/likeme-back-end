#!/bin/bash

set -e

BASE_URL="${BASE_URL:-https://likeme-back-end-one.vercel.app}"
CPF_TEST="11144477735"
PHONE_TEST="11999999999"
TEST_CARD="4000000000000002"

echo "=========================================="
echo "TESTE: Split de Pagamento - PRODUÇÃO"
echo "=========================================="
echo "Base URL: $BASE_URL"
echo ""

# 1. Criar usuário de teste
echo "1. Criando usuário de teste via API de produção..."
TIMESTAMP=$(date +%s)
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "{
    \"username\": \"test_split_${TIMESTAMP}\",
    \"password\": \"Test123!@#\",
    \"email\": \"test-split-${TIMESTAMP}@example.com\",
    \"firstName\": \"Test\",
    \"lastName\": \"Split User\"
  }" \
  "$BASE_URL/api/auth/register")

TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
if [ -z "$TOKEN" ]; then
  echo "❌ Erro ao criar usuário"
  echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
  exit 1
fi

USER_ID=$(echo "$REGISTER_RESPONSE" | grep -o '"userId":"[^"]*' | cut -d'"' -f4)
echo "✅ Usuário criado"
echo "Token: ${TOKEN:0:50}..."
echo "User ID: $USER_ID"
echo ""

# 2. Verificar se há recipient configurado
echo "2. Verificando configuração de split..."
SPLIT_ENABLED=$(curl -s -X GET \
  -H "Authorization: Bearer $TOKEN" \
  "$BASE_URL/api/payment/recipients" | jq -r '.data[0].id // empty' 2>/dev/null || echo "")

if [ -z "$SPLIT_ENABLED" ]; then
  echo "⚠️  Nenhum recipient encontrado. Criando recipient de teste..."
  
  # Criar recipient individual de teste
  RECIPIENT_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "name": "Test Recipient",
      "email": "test-recipient@example.com",
      "document": "11144477735",
      "type": "individual",
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
      },
      "address": {
        "street": "Rua Teste",
        "street_number": "123",
        "neighborhood": "Centro",
        "city": "São Paulo",
        "state": "SP",
        "zip_code": "01234567",
        "complementary": "Apto 1",
        "reference_point": "Próximo ao metrô"
      }
    }' \
    "$BASE_URL/api/payment/recipients/individual")
  
  RECIPIENT_ID=$(echo "$RECIPIENT_RESPONSE" | jq -r '.data.id // empty' 2>/dev/null || echo "")
  
  if [ -z "$RECIPIENT_ID" ]; then
    echo "❌ Erro ao criar recipient"
    echo "$RECIPIENT_RESPONSE" | jq '.' 2>/dev/null || echo "$RECIPIENT_RESPONSE"
    echo ""
    echo "⚠️  Continuando sem split (teste sem split)..."
  else
    echo "✅ Recipient criado: ${RECIPIENT_ID:0:30}..."
    echo ""
    echo "⚠️  IMPORTANTE: Configure as variáveis de ambiente no backend:"
    echo "   PAGARME_SPLIT_ENABLED=true"
    echo "   PAGARME_SPLIT_RECIPIENT_ID=$RECIPIENT_ID"
    echo "   PAGARME_SPLIT_PERCENTAGE=10"
    echo "   PAGARME_SPLIT_CHARGE_PROCESSING_FEE=false"
    echo "   PAGARME_SPLIT_CHARGE_REMAINDER_FEE=false"
    echo "   PAGARME_SPLIT_LIABLE=true"
    echo ""
    echo "⚠️  Aguardando 10 segundos para você configurar as variáveis..."
    sleep 10
  fi
else
  echo "✅ Recipient encontrado: ${SPLIT_ENABLED:0:30}..."
fi
echo ""

# 3. Criar produto de teste
echo "3. Criando produto de teste..."
PRODUCT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Produto Teste Split",
    "description": "Produto para testar split de pagamento",
    "price": 99.99,
    "quantity": 10,
    "status": "active"
  }' \
  "$BASE_URL/api/products")

PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")
if [ -z "$PRODUCT_ID" ]; then
  echo "❌ Erro ao criar produto"
  echo "$PRODUCT_RESPONSE" | jq '.' 2>/dev/null || echo "$PRODUCT_RESPONSE"
  exit 1
fi

echo "✅ Produto criado (ID: $PRODUCT_ID)"
echo "$PRODUCT_RESPONSE" | jq '{id, name, price, quantity}' 2>/dev/null || echo "$PRODUCT_RESPONSE"
echo ""

# 4. Criar pedido com pagamento e split
echo "4. Criando pedido com pagamento e split..."
echo "   CPF no cardData: $CPF_TEST"
echo "   Telefone no cardData: $PHONE_TEST"
echo "   Cartão: $TEST_CARD"
echo ""

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
    "cpf": "$CPF_TEST",
    "phone": "$PHONE_TEST"
  }
}
EOF
)

# Verificar se CPF está no JSON
if echo "$ORDER_DATA" | grep -q "\"cpf\": \"$CPF_TEST\""; then
  echo "✅ CPF confirmado no cardData"
else
  echo "❌ CPF não encontrado no cardData"
  exit 1
fi

echo "   Enviando requisição..."
ORDER_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "$ORDER_DATA" \
  "$BASE_URL/api/orders")

SUCCESS=$(echo "$ORDER_RESPONSE" | jq -r '.success // false' 2>/dev/null || echo "false")
ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.id // .id // empty' 2>/dev/null || echo "")
PAYMENT_STATUS=$(echo "$ORDER_RESPONSE" | jq -r '.data.paymentStatus // .paymentStatus // empty' 2>/dev/null || echo "")
TRANSACTION_ID=$(echo "$ORDER_RESPONSE" | jq -r '.data.paymentTransactionId // .paymentTransactionId // empty' 2>/dev/null || echo "")

if [ "$SUCCESS" = "true" ] && [ -n "$ORDER_ID" ]; then
  echo ""
  echo "✅ SUCESSO! Pedido criado e pagamento processado"
  echo "  Order ID: $ORDER_ID"
  echo "  Payment Status: $PAYMENT_STATUS"
  if [ -n "$TRANSACTION_ID" ]; then
    echo "  Transaction ID: $TRANSACTION_ID"
  fi
  
  # Verificar se há informações de split na resposta
  SPLIT_INFO=$(echo "$ORDER_RESPONSE" | jq -r '.data.split // .split // empty' 2>/dev/null || echo "")
  if [ -n "$SPLIT_INFO" ]; then
    echo ""
    echo "📊 Informações de Split:"
    echo "$ORDER_RESPONSE" | jq '.data.split' 2>/dev/null || echo "Split aplicado (detalhes não disponíveis na resposta)"
  else
    echo ""
    echo "ℹ️  Nota: Split pode ter sido aplicado, mas não está na resposta do pedido."
    echo "   Verifique os logs do backend para confirmar se o split foi enviado à Pagarme."
  fi
  
  echo ""
  echo "✅ Teste concluído com sucesso!"
else
  echo ""
  echo "❌ Erro ao criar pedido"
  echo "$ORDER_RESPONSE" | jq '.' 2>/dev/null || echo "$ORDER_RESPONSE"
  exit 1
fi

echo ""
echo "=========================================="
echo "Teste concluído!"
echo "=========================================="

