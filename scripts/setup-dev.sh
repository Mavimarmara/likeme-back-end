#!/bin/bash

# LikeMe Backend - Setup Development Environment
echo "🚀 Configurando ambiente de desenvolvimento do LikeMe Backend..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não está instalado. Por favor, instale Node.js 18+ primeiro."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js versão 18+ é necessária. Versão atual: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detectado"

# Install dependencies
echo "📦 Instalando dependências..."
npm install

# Generate Prisma client
echo "🔧 Gerando cliente Prisma..."
npx prisma generate

# Check if .env exists
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp env.example .env
    echo "⚠️  Configure as variáveis de ambiente no arquivo .env"
fi

# Check if PostgreSQL is running
if ! command -v psql &> /dev/null; then
    echo "⚠️  PostgreSQL não encontrado. Certifique-se de que está instalado e rodando."
    echo "   Você pode usar Docker: docker-compose up -d postgres"
fi

echo ""
echo "🎉 Setup concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Configure o arquivo .env com suas credenciais do banco"
echo "2. Execute: npm run db:push (para criar as tabelas)"
echo "3. Execute: npm run db:seed (para popular com dados iniciais)"
echo "4. Execute: npm run dev (para iniciar o servidor)"
echo ""
echo "📚 Documentação: http://localhost:3000/api-docs"
echo "🏥 Health check: http://localhost:3000/health"
