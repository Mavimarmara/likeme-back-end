# Integração Pagarme - Backend

Este documento descreve a integração do Pagarme para processamento de pagamentos no backend do LikeMe.

## Configuração

### 1. Variáveis de Ambiente

Adicione a seguinte variável ao arquivo `.env`:

```env
# Pagarme Configuration
PAGARME_API_KEY="pk_MWbvOMDHOouRgp0z"  # Chave de teste
```

**Chave de teste fornecida:** `pk_MWbvOMDHOouRgp0z`

**Onde encontrar em produção:**
- Acesse o dashboard do Pagarme
- Vá em Configurações > API Keys
- Use a chave pública (pk_*) para transações do cliente
- Use a chave secreta (sk_*) apenas no backend (nunca expor ao cliente)

### 2. Instalação de Dependências

A dependência já foi instalada:
- `pagarme`: SDK oficial da Pagarme para Node.js

## Endpoints Implementados

### POST /api/payment/process

**Descrição:** Processa pagamento de um pedido usando cartão de crédito via Pagarme.

**Headers:**
```
Authorization: Bearer {token}
```

**Request:**
```json
{
  "orderId": "uuid-do-pedido",
  "cardData": {
    "cardNumber": "4111111111111111",
    "cardHolderName": "John Doe",
    "cardExpirationDate": "1225",
    "cardCvv": "123"
  },
  "billingAddress": {
    "country": "br",
    "state": "SP",
    "city": "São Paulo",
    "neighborhood": "Jardins",
    "street": "Av. Paulista",
    "streetNumber": "1000",
    "zipcode": "01310000",
    "complement": "Apto 101"
  }
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment processed successfully",
  "data": {
    "order": {
      "id": "uuid",
      "paymentStatus": "paid",
      "paymentMethod": "credit_card",
      ...
    },
    "transaction": {
      "id": "pagarme-transaction-id",
      "status": "paid",
      "authorizationCode": "123456"
    }
  }
}
```

**Erros:**
- `400`: Dados inválidos ou pagamento recusado
- `401`: Não autenticado
- `403`: Não autorizado (pedido não pertence ao usuário)
- `404`: Pedido não encontrado

### GET /api/payment/status/:transactionId

**Descrição:** Busca o status de uma transação Pagarme.

**Headers:**
```
Authorization: Bearer {token}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Transaction status retrieved successfully",
  "data": {
    "id": "transaction-id",
    "status": "paid",
    "amount": 10000,
    "authorizationCode": "123456"
  }
}
```

### POST /api/payment/capture/:transactionId

**Descrição:** Captura uma transação autorizada (captura parcial ou total).

**Headers:**
```
Authorization: Bearer {token}
```

**Request (opcional):**
```json
{
  "amount": 50.00  // Valor em reais (opcional, para captura parcial)
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment captured successfully",
  "data": {
    "id": "transaction-id",
    "status": "paid"
  }
}
```

### POST /api/payment/refund/:transactionId

**Descrição:** Estorna um pagamento (estorno parcial ou total).

**Headers:**
```
Authorization: Bearer {token}
```

**Request (opcional):**
```json
{
  "amount": 50.00  // Valor em reais (opcional, para estorno parcial)
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Payment refunded successfully",
  "data": {
    "id": "transaction-id",
    "status": "refunded"
  }
}
```

## Fluxo de Pagamento

1. **Cliente cria um pedido** via `POST /api/orders`
2. **Cliente processa o pagamento** via `POST /api/payment/process` com dados do cartão
3. **Backend valida o pedido** e dados do cartão
4. **Backend cria transação na Pagarme** com dados do pedido e cartão
5. **Pagarme processa o pagamento** e retorna status
6. **Backend atualiza o pedido** com status do pagamento
7. **Backend retorna resultado** para o cliente

## Status de Transação

Os status possíveis da Pagarme são:
- `processing`: Pagamento em processamento
- `authorized`: Pagamento autorizado (aguardando captura)
- `paid`: Pagamento aprovado
- `refused`: Pagamento recusado
- `pending_refund`: Estorno pendente
- `refunded`: Estorno realizado
- `chargedback`: Estorno solicitado pelo cliente

O backend mapeia esses status para:
- `pending`: Status inicial ou processing
- `paid`: paid ou authorized
- `failed`: refused
- `refunded`: refunded

## Segurança

1. **Dados do Cartão**: Nunca são armazenados no banco de dados
2. **Validação**: Dados validados antes de enviar para Pagarme
3. **Autenticação**: Todos os endpoints requerem autenticação
4. **Autorização**: Usuários só podem processar pagamentos de seus próprios pedidos
5. **Rate Limiting**: Aplicado em todos os endpoints

## Estrutura de Arquivos

```
src/
├── clients/
│   └── pagarme/
│       └── pagarmeClient.ts      # Cliente Pagarme
├── controllers/
│   └── payment/
│       ├── paymentController.ts  # Endpoints de pagamento
│       └── paymentController.docs.ts  # Documentação Swagger
├── routes/
│   └── payment/
│       └── paymentRoutes.ts      # Rotas de pagamento
├── utils/
│   └── validationSchemas.ts      # Schemas de validação
└── types/
    └── pagarme.d.ts              # Type definitions
```

## Testando

### Com curl:

```bash
# Processar pagamento
curl -X POST http://localhost:3000/api/payment/process \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "orderId": "uuid-do-pedido",
    "cardData": {
      "cardNumber": "4111111111111111",
      "cardHolderName": "John Doe",
      "cardExpirationDate": "1225",
      "cardCvv": "123"
    },
    "billingAddress": {
      "country": "br",
      "state": "SP",
      "city": "São Paulo",
      "street": "Av. Paulista",
      "streetNumber": "1000",
      "zipcode": "01310000"
    }
  }'
```

### Cartões de Teste

Use estes cartões para testes na Pagarme:

- **Aprovado:** `4111111111111111`
- **Recusado:** `4000000000000002`
- **CVV:** Qualquer 3 dígitos
- **Data de expiração:** Qualquer data futura no formato MMYY

## Integração com Orders

O pagamento está integrado com o modelo `Order` existente:

- `paymentMethod`: Método de pagamento (ex: "credit_card")
- `paymentStatus`: Status do pagamento (pending, paid, failed, refunded)
- `notes`: Armazena o Transaction ID da Pagarme

**TODO:** Considerar criar uma tabela separada `Payment` no futuro para melhor rastreamento.
