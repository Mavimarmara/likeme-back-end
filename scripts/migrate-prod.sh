#!/bin/bash

# Script para rodar migrations no banco de produção
# Uso: ./scripts/migrate-prod.sh
# 
# IMPORTANTE: Certifique-se de que as variáveis de ambiente estão configuradas
# no arquivo .env antes de executar este script

set -e

# Carregar variáveis do .env se existir
if [ -f .env ]; then
  export $(cat .env | grep -v '^#' | xargs)
fi

echo "🔄 Verificando status das migrations..."
echo ""

# Verificar se DATABASE_URL está configurada
if [ -z "$DATABASE_URL" ]; then
  echo "❌ Erro: DATABASE_URL não está configurada"
  echo "   Configure no arquivo .env ou exporte a variável de ambiente"
  exit 1
fi

echo "📊 Status atual das migrations:"
npx prisma migrate status

echo ""
echo "🚀 Aplicando migrations pendentes..."
npx prisma migrate deploy

echo ""
echo "✅ Migrations aplicadas com sucesso!"
echo ""
echo "📊 Status final:"
npx prisma migrate status

