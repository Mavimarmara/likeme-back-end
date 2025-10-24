# LikeMe Backend API

Backend API completo para o aplicativo LikeMe - Saúde e Bem-estar, desenvolvido em Node.js com TypeScript, Prisma ORM e PostgreSQL.

## 🚀 Funcionalidades

### 🔐 Autenticação e Usuários
- Registro e login de usuários
- Autenticação JWT
- Gerenciamento de perfil
- Sistema de permissões

### 📋 Anamnese
- Questionários de saúde personalizados
- Armazenamento de respostas em JSON
- Histórico de anamneses

### 🏃‍♂️ Atividades
- CRUD de atividades de saúde
- Categorização (exercício, nutrição, mental, médico)
- Sistema de dificuldade
- Agendamento e conclusão

### 📊 Bem-estar
- Dashboard com métricas de saúde
- Categorias: físico, mental, emocional, social
- Histórico de dados
- Resumos e análises

### 👥 Comunidade
- Posts e compartilhamentos
- Sistema de likes e comentários
- Categorização de conteúdo
- Tags e busca

### 🛒 Marketplace
- Catálogo de produtos
- Sistema de carrinho e pedidos
- Categorias: suplementos, equipamentos, livros, cursos
- Controle de estoque

### 👩‍⚕️ Provedores de Saúde
- Cadastro de profissionais
- Sistema de agendamentos
- Especialidades médicas
- Avaliações e reviews

## 🛠 Tecnologias Utilizadas

- **Node.js** - Runtime JavaScript
- **TypeScript** - Tipagem estática
- **Express.js** - Framework web
- **Prisma ORM** - ORM para banco de dados
- **PostgreSQL** - Banco de dados
- **JWT** - Autenticação
- **Joi** - Validação de dados
- **Swagger** - Documentação da API
- **Bcrypt** - Hash de senhas
- **CORS** - Cross-origin resource sharing
- **Helmet** - Segurança
- **Morgan** - Logging
- **Compression** - Compressão de respostas

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- PostgreSQL 12+
- npm ou yarn

### 1. Clone o repositório
```bash
git clone <repository-url>
cd likeme-back-end
```

### 2. Instale as dependências
```bash
npm install
# ou
yarn install
```

### 3. Configure as variáveis de ambiente
```bash
cp env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/likeme_db"

# JWT
JWT_SECRET="your-super-secret-jwt-key-here"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"

# Email (Nodemailer)
EMAIL_HOST="smtp.gmail.com"
EMAIL_PORT=587
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME="your-cloud-name"
CLOUDINARY_API_KEY="your-api-key"
CLOUDINARY_API_SECRET="your-api-secret"
```

### 4. Configure o banco de dados
```bash
# Gere o cliente Prisma
npm run db:generate

# Execute as migrações
npm run db:migrate

# Popule o banco com dados iniciais
npm run db:seed
```

### 5. Execute o servidor
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm start
```

## 📚 Documentação da API

A documentação completa da API está disponível através do **Swagger UI**:

### 🌐 Acesso à Documentação
- **Desenvolvimento**: http://localhost:3000/api-docs
- **Interface Interativa**: Teste todos os endpoints diretamente no navegador
- **Esquemas de Dados**: Visualize todos os modelos e tipos de dados
- **Autenticação**: Teste endpoints protegidos com JWT

### 📖 Como Usar a Documentação
1. Acesse http://localhost:3000/api-docs no seu navegador
2. Explore os endpoints organizados por categorias
3. Clique em "Try it out" para testar endpoints
4. Use o botão "Authorize" para autenticar com JWT
5. Visualize os esquemas de request/response

### 🔐 Autenticação na Documentação
Para testar endpoints protegidos:
1. Faça login via `/api/auth/login`
2. Copie o token retornado
3. Clique em "Authorize" no Swagger
4. Cole o token no formato: `Bearer SEU_TOKEN_AQUI`

### Endpoints Principais

#### 🔐 Autenticação
```
POST /api/auth/register     # Registro de usuário
POST /api/auth/login        # Login
GET  /api/auth/profile      # Perfil do usuário
PUT  /api/auth/profile      # Atualizar perfil
DELETE /api/auth/account    # Deletar conta
```

#### 📋 Anamnese
```
POST /api/anamnese          # Criar anamnese
GET  /api/anamnese          # Obter anamnese
PUT  /api/anamnese          # Atualizar anamnese
DELETE /api/anamnese        # Deletar anamnese
```

#### 🏃‍♂️ Atividades
```
POST   /api/activities           # Criar atividade
GET    /api/activities           # Listar atividades
GET    /api/activities/:id       # Obter atividade
PUT    /api/activities/:id       # Atualizar atividade
DELETE /api/activities/:id       # Deletar atividade
PATCH  /api/activities/:id/complete # Completar atividade
```

#### 📊 Bem-estar
```
POST /api/wellness              # Criar dados de bem-estar
GET  /api/wellness              # Listar dados
GET  /api/wellness/summary      # Resumo de bem-estar
PUT  /api/wellness/:id          # Atualizar dados
DELETE /api/wellness/:id        # Deletar dados
```

#### 👥 Comunidade
```
POST   /api/community           # Criar post
GET    /api/community           # Listar posts
GET    /api/community/:id       # Obter post
PUT    /api/community/:id       # Atualizar post
DELETE /api/community/:id       # Deletar post
POST   /api/community/:id/like  # Curtir post
POST   /api/community/:id/comments # Comentar
```

#### 🛒 Marketplace
```
GET    /api/marketplace/products     # Listar produtos
GET    /api/marketplace/products/:id # Obter produto
POST   /api/marketplace/orders       # Criar pedido
GET    /api/marketplace/orders       # Listar pedidos
GET    /api/marketplace/orders/:id   # Obter pedido
```

#### 👩‍⚕️ Provedores de Saúde
```
GET    /api/health-providers/providers     # Listar provedores
GET    /api/health-providers/providers/:id # Obter provedor
POST   /api/health-providers/providers     # Criar provedor
POST   /api/health-providers/appointments  # Criar agendamento
GET    /api/health-providers/appointments  # Listar agendamentos
```

## 🗄 Estrutura do Banco de Dados

### Principais Tabelas

- **users** - Usuários do sistema
- **anamnese** - Questionários de saúde
- **activities** - Atividades de saúde
- **wellness_data** - Dados de bem-estar
- **posts** - Posts da comunidade
- **comments** - Comentários
- **likes** - Curtidas
- **products** - Produtos do marketplace
- **orders** - Pedidos
- **order_items** - Itens dos pedidos
- **health_providers** - Provedores de saúde
- **appointments** - Agendamentos

## 🔒 Segurança

- **JWT Authentication** - Tokens seguros para autenticação
- **Password Hashing** - Senhas criptografadas com bcrypt
- **Rate Limiting** - Proteção contra spam e ataques
- **CORS** - Configuração de origens permitidas
- **Helmet** - Headers de segurança
- **Input Validation** - Validação rigorosa de dados
- **SQL Injection Protection** - Prisma ORM previne SQL injection

## 🧪 Testes

### Testes Automatizados
```bash
# Executar testes
npm test

# Executar testes em modo watch
npm run test:watch
```

### Testes Manuais via Swagger
1. **Acesse a documentação**: http://localhost:3000/api-docs
2. **Teste o Health Check**: GET `/health`
3. **Registre um usuário**: POST `/api/auth/register`
4. **Faça login**: POST `/api/auth/login`
5. **Use o token** para testar endpoints protegidos

### Exemplo de Teste Completo
```bash
# 1. Verificar se a API está funcionando
curl http://localhost:3000/health

# 2. Registrar usuário
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Teste","email":"teste@example.com","password":"123456"}'

# 3. Fazer login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"teste@example.com","password":"123456"}'
```

## 📝 Scripts Disponíveis

```bash
npm run dev          # Executar em modo desenvolvimento
npm run build        # Compilar TypeScript
npm start            # Executar em produção
npm test             # Executar testes
npm run lint         # Verificar código
npm run lint:fix     # Corrigir problemas de lint
npm run db:generate  # Gerar cliente Prisma
npm run db:push      # Sincronizar schema
npm run db:migrate   # Executar migrações
npm run db:studio    # Abrir Prisma Studio
npm run db:seed      # Popular banco com dados iniciais
```

## ✅ Status da Aplicação

### 🟢 Funcionando
- ✅ **Servidor**: Rodando na porta 3000
- ✅ **Health Check**: http://localhost:3000/health
- ✅ **Documentação Swagger**: http://localhost:3000/api-docs
- ✅ **Compilação TypeScript**: Sem erros
- ✅ **Estrutura de Rotas**: Todas configuradas
- ✅ **Middlewares**: Autenticação, validação, rate limiting
- ✅ **Docker**: Configurado e pronto

### ⚠️ Requer Configuração
- 🔧 **Banco de Dados**: PostgreSQL precisa ser configurado
- 🔧 **Variáveis de Ambiente**: Arquivo `.env` precisa ser criado
- 🔧 **Migrações**: Banco precisa ser inicializado

### 🚀 Para Começar Agora
```bash
# 1. Criar arquivo .env (copiar de env.example)
cp env.example .env

# 2. Configurar banco PostgreSQL
# 3. Executar migrações
npm run db:push

# 4. Popular com dados iniciais
npm run db:seed

# 5. Testar endpoints via Swagger
# Acesse: http://localhost:3000/api-docs
```

## 🚀 Deploy

### Variáveis de Ambiente para Produção

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-production-secret
PORT=3000
```

### Comandos de Deploy

```bash
# Build da aplicação
npm run build

# Executar migrações
npm run db:migrate

# Iniciar servidor
npm start
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

## 📞 Suporte

Para suporte, entre em contato:
- Email: contato@likeme.com
- GitHub Issues: [Criar issue](https://github.com/likeme/backend/issues)

---

**LikeMe API** - Sua saúde, nossa prioridade! 💚