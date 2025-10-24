#!/bin/bash

# LikeMe Backend - Setup Test Environment
echo "🧪 Configurando ambiente de teste do LikeMe Backend..."

# Set test environment variables
export NODE_ENV=test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/likeme_test"
export JWT_SECRET="test-secret-key"

# Check if test database exists
echo "🔍 Verificando banco de dados de teste..."

# Create test database if it doesn't exist
createdb likeme_test 2>/dev/null || echo "Banco de teste já existe ou erro ao criar"

# Run database migrations
echo "📊 Executando migrações do banco de teste..."
npx prisma db push

# Run tests
echo "🧪 Executando testes..."
npm test

echo "✅ Setup de teste concluído!"