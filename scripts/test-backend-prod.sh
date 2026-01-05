#!/bin/bash

# Script para testar o backend completo com curl usando banco de produção
# Uso: ./scripts/test-backend-prod.sh [BASE_URL] [JWT_TOKEN]
# Exemplo: ./scripts/test-backend-prod.sh http://localhost:3000 eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

set -e

BASE_URL="${1:-http://localhost:3000}"
JWT_TOKEN="${2:-}"

echo "🧪 Testando backend em: $BASE_URL"
echo ""

# Cores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para fazer requisições
test_endpoint() {
  local method=$1
  local endpoint=$2
  local description=$3
  local data=$4
  local requires_auth=${5:-true}
  
  echo -n "Testando: $description... "
  
  local headers=()
  if [ "$requires_auth" = "true" ] && [ -n "$JWT_TOKEN" ]; then
    headers+=(-H "Authorization: Bearer $JWT_TOKEN")
  fi
  
  if [ "$method" = "POST" ] || [ "$method" = "PUT" ] || [ "$method" = "PATCH" ]; then
    headers+=(-H "Content-Type: application/json")
  fi
  
  local response
  if [ -n "$data" ]; then
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      "${headers[@]}" \
      -d "$data" \
      "$BASE_URL$endpoint" 2>&1)
  else
    response=$(curl -s -w "\n%{http_code}" -X "$method" \
      "${headers[@]}" \
      "$BASE_URL$endpoint" 2>&1)
  fi
  
  local http_code=$(echo "$response" | tail -n1)
  local body=$(echo "$response" | sed '$d')
  
  if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
    echo -e "${GREEN}✅ OK (${http_code})${NC}"
    echo "   Resposta: $(echo "$body" | jq -c '.' 2>/dev/null || echo "$body" | head -c 100)"
  elif [ "$http_code" -eq 401 ] || [ "$http_code" -eq 403 ]; then
    echo -e "${YELLOW}⚠️  Auth required (${http_code})${NC}"
  else
    echo -e "${RED}❌ Erro (${http_code})${NC}"
    echo "   Resposta: $(echo "$body" | head -c 200)"
  fi
  echo ""
}

echo "=========================================="
echo "1. TESTES DE HEALTH E DOCUMENTAÇÃO"
echo "=========================================="
test_endpoint "GET" "/health" "Health Check" "" false
test_endpoint "GET" "/api-docs" "Swagger UI" "" false

echo "=========================================="
echo "2. TESTES DE AUTENTICAÇÃO"
echo "=========================================="

# Registrar usuário de teste
REGISTER_DATA='{
  "username": "testuser_'$(date +%s)'",
  "password": "Test123!@#",
  "email": "test_'$(date +%s)'@example.com",
  "firstName": "Test",
  "lastName": "User"
}'

echo "Registrando usuário de teste..."
REGISTER_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$REGISTER_DATA" \
  "$BASE_URL/api/auth/register")

echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"
echo ""

# Login
LOGIN_DATA='{
  "username": "testuser_'$(date +%s)'",
  "password": "Test123!@#"
}'

echo "Fazendo login..."
LOGIN_RESPONSE=$(curl -s -X POST \
  -H "Content-Type: application/json" \
  -d "$LOGIN_DATA" \
  "$BASE_URL/api/auth/login")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token // empty' 2>/dev/null)
if [ -n "$TOKEN" ] && [ "$TOKEN" != "null" ]; then
  echo -e "${GREEN}✅ Token obtido${NC}"
  JWT_TOKEN="$TOKEN"
else
  echo -e "${YELLOW}⚠️  Não foi possível obter token. Usando token fornecido ou continuando sem autenticação.${NC}"
  echo "$LOGIN_RESPONSE"
fi
echo ""

if [ -z "$JWT_TOKEN" ]; then
  echo -e "${RED}❌ Token JWT não disponível. Alguns testes serão pulados.${NC}"
  echo "   Forneça um token como segundo argumento: $0 $BASE_URL YOUR_JWT_TOKEN"
  echo ""
fi

echo "=========================================="
echo "3. TESTES DE PRODUTOS"
echo "=========================================="

# Criar produto
PRODUCT_DATA='{
  "name": "Produto Teste",
  "description": "Descrição do produto teste",
  "price": 99.99,
  "quantity": 10,
  "category": "physical product",
  "status": "active"
}'

PRODUCT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$PRODUCT_DATA" \
  "$BASE_URL/api/products")

PRODUCT_ID=$(echo "$PRODUCT_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
echo "Produto criado: $PRODUCT_ID"
echo ""

if [ -n "$PRODUCT_ID" ] && [ "$PRODUCT_ID" != "null" ]; then
  test_endpoint "GET" "/api/products" "Listar produtos" "" true
  test_endpoint "GET" "/api/products/$PRODUCT_ID" "Buscar produto por ID" "" true
  
  UPDATE_PRODUCT_DATA='{
    "name": "Produto Teste Atualizado",
    "price": 149.99
  }'
  test_endpoint "PUT" "/api/products/$PRODUCT_ID" "Atualizar produto" "$UPDATE_PRODUCT_DATA" true
  
  STOCK_DATA='{
    "operation": "add",
    "quantity": 5
  }'
  test_endpoint "PATCH" "/api/products/$PRODUCT_ID/stock" "Atualizar estoque" "$STOCK_DATA" true
fi

echo "=========================================="
echo "4. TESTES DE PEDIDOS"
echo "=========================================="

if [ -n "$PRODUCT_ID" ] && [ "$PRODUCT_ID" != "null" ]; then
  ORDER_DATA='{
    "items": [
      {
        "productId": "'$PRODUCT_ID'",
        "quantity": 2
      }
    ],
    "address": {
      "street": "Rua Teste",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567",
      "country": "BR"
    }
  }'
  
  ORDER_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$ORDER_DATA" \
    "$BASE_URL/api/orders")
  
  ORDER_ID=$(echo "$ORDER_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
  echo "Pedido criado: $ORDER_ID"
  echo ""
  
  if [ -n "$ORDER_ID" ] && [ "$ORDER_ID" != "null" ]; then
    test_endpoint "GET" "/api/orders" "Listar pedidos" "" true
    test_endpoint "GET" "/api/orders/$ORDER_ID" "Buscar pedido por ID" "" true
  fi
fi

echo "=========================================="
echo "5. TESTES DE PAGAMENTO - RECEBEDORES"
echo "=========================================="

# Criar recebedor individual
INDIVIDUAL_RECIPIENT_DATA='{
  "register_information": {
    "phone_numbers": [
      {
        "ddd": "11",
        "number": "987654321",
        "type": "mobile"
      }
    ],
    "address": {
      "street": "Rua Teste",
      "street_number": "123",
      "neighborhood": "Centro",
      "city": "São Paulo",
      "state": "SP",
      "zip_code": "01234567"
    },
    "name": "João Silva",
    "email": "joao@example.com",
    "document": "12345678900",
    "type": "individual",
    "mother_name": "Maria Silva",
    "birthdate": "01/01/1990",
    "monthly_income": 500000,
    "professional_occupation": "Desenvolvedor"
  },
  "default_bank_account": {
    "holder_name": "João Silva",
    "holder_type": "individual",
    "holder_document": "12345678900",
    "bank": "341",
    "branch_number": "1234",
    "branch_check_digit": "5",
    "account_number": "12345",
    "account_check_digit": "6",
    "type": "checking"
  },
  "transfer_settings": {
    "transfer_enabled": true,
    "transfer_interval": "Daily"
  }
}'

RECIPIENT_RESPONSE=$(curl -s -X POST \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d "$INDIVIDUAL_RECIPIENT_DATA" \
  "$BASE_URL/api/payment/recipients/individual")

RECIPIENT_ID=$(echo "$RECIPIENT_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
echo "Recebedor criado: $RECIPIENT_ID"
echo "$RECIPIENT_RESPONSE" | jq '.' 2>/dev/null || echo "$RECIPIENT_RESPONSE"
echo ""

if [ -n "$RECIPIENT_ID" ] && [ "$RECIPIENT_ID" != "null" ]; then
  test_endpoint "GET" "/api/payment/recipients" "Listar recebedores" "" true
  test_endpoint "GET" "/api/payment/recipients/$RECIPIENT_ID" "Buscar recebedor por ID" "" true
fi

echo "=========================================="
echo "6. TESTES DE COMUNIDADE"
echo "=========================================="
test_endpoint "GET" "/api/communities" "Listar comunidades" "" true
test_endpoint "GET" "/api/communities/feed" "Feed do usuário" "" true
test_endpoint "GET" "/api/communities/channels" "Listar canais" "" true

echo "=========================================="
echo "7. TESTES DE ATIVIDADES"
echo "=========================================="
test_endpoint "GET" "/api/activities" "Listar atividades" "" true

if [ -n "$JWT_TOKEN" ]; then
  ACTIVITY_DATA='{
    "name": "Atividade Teste",
    "type": "task",
    "startDate": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
    "description": "Descrição da atividade teste"
  }'
  
  ACTIVITY_RESPONSE=$(curl -s -X POST \
    -H "Authorization: Bearer $JWT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "$ACTIVITY_DATA" \
    "$BASE_URL/api/activities")
  
  ACTIVITY_ID=$(echo "$ACTIVITY_RESPONSE" | jq -r '.id // empty' 2>/dev/null)
  echo "Atividade criada: $ACTIVITY_ID"
  echo ""
  
  if [ -n "$ACTIVITY_ID" ] && [ "$ACTIVITY_ID" != "null" ]; then
    test_endpoint "GET" "/api/activities/$ACTIVITY_ID" "Buscar atividade por ID" "" true
    
    UPDATE_ACTIVITY_DATA='{
      "name": "Atividade Teste Atualizada",
      "description": "Descrição atualizada"
    }'
    test_endpoint "PUT" "/api/activities/$ACTIVITY_ID" "Atualizar atividade" "$UPDATE_ACTIVITY_DATA" true
  fi
fi

echo "=========================================="
echo "8. TESTES DE TIPS"
echo "=========================================="
test_endpoint "GET" "/api/tips" "Listar tips" "" false

echo "=========================================="
echo "9. TESTES DE OBJETIVOS PESSOAIS"
echo "=========================================="
test_endpoint "GET" "/api/personal-objectives" "Listar objetivos pessoais" "" true

echo "=========================================="
echo "10. TESTES DE ANÚNCIOS"
echo "=========================================="
test_endpoint "GET" "/api/ads" "Listar anúncios" "" true

echo "=========================================="
echo "11. TESTES DE AMAZON"
echo "=========================================="
test_endpoint "GET" "/api/amazon/products?search=test" "Buscar produtos Amazon" "" true

echo "=========================================="
echo "✅ TESTES CONCLUÍDOS"
echo "=========================================="

