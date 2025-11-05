# Integração Auth0 - Backend

Este documento descreve a integração do Auth0 no backend do LikeMe.

## Configuração

### 1. Variáveis de Ambiente

Adicione as seguintes variáveis ao arquivo `.env`:

```env
# Auth0 Configuration
AUTH0_DOMAIN="your-auth0-domain.auth0.com"
AUTH0_AUDIENCE="your-api-identifier"
```

**Onde encontrar:**
- `AUTH0_DOMAIN`: Disponível no dashboard do Auth0 (Applications > Your App > Domain)
- `AUTH0_AUDIENCE`: O identificador da API no Auth0 (APIs > Your API > Identifier)

### 2. Instalação de Dependências

As dependências já foram instaladas:
- `express-jwt`: Para validação de tokens JWT
- `jwks-rsa`: Para obter chaves públicas do Auth0

## Endpoints Implementados

### POST /api/auth/login

**Descrição:** Valida o idToken do Auth0 e retorna token de sessão do backend.

**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "email": "user@example.com",
    "name": "John Doe",
    "picture": "https://..."
  }
}
```

**Headers (alternativo):**
```
Authorization: Bearer {idToken}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "uuid",
      "personId": "uuid",
      "avatar": "https://...",
      "person": {
        "firstName": "John",
        "lastName": "Doe",
        "contacts": [...]
      }
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Erros:**
- `400`: Token não fornecido ou email não encontrado
- `401`: Token do Auth0 inválido ou expirado

### POST /api/auth/logout

**Descrição:** Logout do usuário (opcional, token será removido no frontend).

**Headers:**
```
Authorization: Bearer {sessionToken}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso",
  "data": null
}
```

## Fluxo de Autenticação

1. **Frontend** autentica com Auth0 e obtém `idToken`
2. **Frontend** envia `idToken` para `/api/auth/login`
3. **Backend** valida `idToken` com Auth0 usando JWKS
4. **Backend** extrai informações do usuário do token
5. **Backend** busca ou cria usuário no banco de dados
6. **Backend** gera token de sessão próprio (JWT)
7. **Backend** retorna token de sessão para o frontend
8. **Frontend** armazena token de sessão e usa em requisições futuras

## Validação de Token

O backend valida o `idToken` do Auth0 usando:
- **JWKS (JSON Web Key Set)**: Obtém chaves públicas do Auth0
- **Audience**: Valida se o token foi emitido para a API correta
- **Issuer**: Valida se o token foi emitido pelo Auth0 correto
- **Algoritmo**: RS256 (RSA com SHA-256)

## Gerenciamento de Usuários

### Usuário Existente
- Busca por email no `PersonContact`
- Atualiza avatar se fornecido
- Retorna token de sessão

### Novo Usuário
- Cria `Person` com informações do Auth0
- Cria `PersonContact` para email
- Cria `User` com senha aleatória (não será usada)
- Retorna token de sessão

## Segurança

1. **Validação de Token**: Todos os tokens são validados antes de processar
2. **Token de Sessão**: Backend gera seu próprio token JWT
3. **Middleware de Autenticação**: Valida token de sessão em rotas protegidas
4. **Rate Limiting**: Aplicado em endpoints de autenticação

## Estrutura de Arquivos

```
src/
├── config/
│   └── index.ts          # Configuração Auth0
├── controllers/
│   └── authController.ts # Endpoint loginWithAuth0
├── middleware/
│   └── auth.ts          # Validação de token de sessão
└── utils/
    └── auth0.ts         # Validação de token Auth0
```

## Testando

### Com curl:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {idToken}" \
  -d '{
    "idToken": "{idToken}",
    "user": {
      "email": "user@example.com",
      "name": "John Doe"
    }
  }'
```

### Resposta Esperada:

```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {...},
    "token": "session-token-jwt"
  }
}
```

## Notas

- O endpoint `/api/auth/login` agora aceita login com Auth0
- O endpoint `/api/auth/login/traditional` mantém o login tradicional (email/senha)
- Tokens de sessão são validados pelo middleware `authenticateToken`
- Tokens do Auth0 são validados apenas no endpoint de login

