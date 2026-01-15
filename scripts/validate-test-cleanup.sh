#!/bin/bash

# Script para validar que os testes não deixam dados no banco
# Uso: ./scripts/validate-test-cleanup.sh

set -e

echo "🔍 Validação de Limpeza de Dados de Teste"
echo "=========================================="
echo ""

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para contar dados de teste
count_test_data() {
  npx ts-node -r tsconfig-paths/register scripts/count-test-data.ts 2>&1 | grep -v "✅\|⚠️"
}

# Função para comparar contagens
compare_counts() {
  local before=$1
  local after=$2
  
  # Parse JSON
  local before_total=$(echo "$before" | grep -o '"[^"]*": [0-9]*' | awk '{sum += $2} END {print sum}')
  local after_total=$(echo "$after" | grep -o '"[^"]*": [0-9]*' | awk '{sum += $2} END {print sum}')
  
  echo "📊 Resumo:"
  echo "  Antes dos testes: $before_total registros"
  echo "  Depois dos testes: $after_total registros"
  echo ""
  
  if [ "$after_total" -gt "$before_total" ]; then
    local leaked=$((after_total - before_total))
    echo -e "${RED}❌ FALHA: $leaked registros de teste não foram limpos!${NC}"
    echo ""
    echo "Detalhes:"
    echo "Antes:"
    echo "$before"
    echo ""
    echo "Depois:"
    echo "$after"
    return 1
  elif [ "$after_total" -lt "$before_total" ]; then
    local cleaned=$((before_total - after_total))
    echo -e "${GREEN}✅ SUCESSO: $cleaned registros foram limpos!${NC}"
    return 0
  else
    echo -e "${GREEN}✅ SUCESSO: Nenhum dado de teste acumulado.${NC}"
    return 0
  fi
}

# 1. Contar ANTES dos testes
echo "1️⃣  Contando dados de teste ANTES dos testes..."
BEFORE=$(count_test_data)
echo "$BEFORE"
echo ""

# 2. Rodar os testes
echo "2️⃣  Rodando os testes..."
echo "----------------------------------------"
npm test -- --silent 2>&1 | tail -20
TEST_EXIT_CODE=$?
echo "----------------------------------------"
echo ""

if [ $TEST_EXIT_CODE -ne 0 ]; then
  echo -e "${YELLOW}⚠️  Alguns testes falharam (exit code: $TEST_EXIT_CODE)${NC}"
  echo "   Continuando validação de limpeza..."
  echo ""
fi

# 3. Contar DEPOIS dos testes
echo "3️⃣  Contando dados de teste DEPOIS dos testes..."
AFTER=$(count_test_data)
echo "$AFTER"
echo ""

# 4. Comparar
echo "4️⃣  Comparando resultados..."
echo ""
if compare_counts "$BEFORE" "$AFTER"; then
  echo ""
  echo -e "${GREEN}🎉 Validação concluída com sucesso!${NC}"
  exit 0
else
  echo ""
  echo -e "${RED}💥 Validação falhou! Verifique a limpeza dos testes.${NC}"
  exit 1
fi
