# Testes de Integração - Recebedor e Split de Pagamento

## 📋 Descrição

Este documento descreve os testes de integração para os endpoints de recebedor (recipient) e split de pagamento da Pagarme. Estes testes fazem requisições reais à API da Pagarme e criam dados reais no banco de dados.

## ⚠️ IMPORTANTE

**Estes testes SÓ devem ser executados em ambiente de desenvolvimento!**

Eles:
- Fazem requisições reais à API da Pagarme
- Criam dados reais no banco de dados
- Podem gerar custos se executados em produção

## 🚀 Como Executar

### Opção 1: Usando o script npm

```bash
npm run test:integration
```

### Opção 2: Executando diretamente com Jest

```bash
NODE_ENV=development npm test -- recipientController.integration.test.ts
```

### Opção 3: Executando apenas um teste específico

```bash
NODE_ENV=development npm test -- recipientController.integration.test.ts -t "deve criar um recebedor pessoa física com sucesso"
```

## 📝 Testes Incluídos

### Recipient Integration Tests

1. **POST /api/payment/recipients/individual**
   - ✅ Deve criar um recebedor pessoa física com sucesso
   - ✅ Deve retornar recebedor existente se já cadastrado

2. **GET /api/payment/recipients**
   - ✅ Deve listar todos os recebedores

3. **GET /api/payment/recipients/:recipientId**
   - ✅ Deve buscar um recebedor específico por ID

### Payment Split Integration Tests

1. **POST /api/orders com split de pagamento**
   - ✅ Deve criar pedido com split de pagamento quando configurado
   - ✅ Deve criar pedido sem split quando split não está configurado

## 🔧 Pré-requisitos

1. **Variáveis de Ambiente:**
   - `PAGARME_API_KEY`: Chave da API da Pagarme (deve começar com `sk_`)
   - `DATABASE_URL`: URL de conexão com o banco de dados
   - `JWT_SECRET`: Chave secreta para JWT

2. **Configuração do Banco de Dados:**
   - O banco de dados deve estar acessível
   - As migrations devem estar aplicadas

3. **Conta Pagarme:**
   - A conta deve ter a funcionalidade de Marketplace/Recipients habilitada
   - Para testes, use uma chave de teste (`sk_test_...`)

## 🧹 Limpeza de Dados

Os testes utilizam o `TestDataTracker` para rastrear todos os dados criados durante a execução. Após cada execução, os dados são automaticamente limpos usando o prefixo `-system-test` nos IDs.

**Nota:** Apenas dados com o sufixo `-system-test` são deletados, garantindo que dados de produção não sejam afetados.

## 📊 Estrutura dos Testes

```
recipientController.integration.test.ts
├── Recipient Integration Tests
│   ├── POST /api/payment/recipients/individual
│   ├── GET /api/payment/recipients
│   └── GET /api/payment/recipients/:recipientId
└── Payment Split Integration Tests
    └── POST /api/orders com split de pagamento
```

## 🐛 Troubleshooting

### Erro: "This company is not allowed to create a recipient"

**Causa:** A conta Pagarme não tem a funcionalidade de Marketplace/Recipients habilitada.

**Solução:** Entre em contato com o suporte da Pagarme para habilitar esta funcionalidade.

### Erro: "Chave Pagarme inválida"

**Causa:** A chave da API não começa com `sk_`.

**Solução:** Verifique se a variável `PAGARME_API_KEY` está configurada corretamente.

### Erro: "NODE_ENV não está definido como 'test'"

**Causa:** Os testes estão sendo executados sem o `NODE_ENV` correto.

**Solução:** Execute com `NODE_ENV=development` ou `NODE_ENV=test`.

### Testes pulados automaticamente

**Causa:** O `NODE_ENV` não está definido como `development` ou `test`.

**Solução:** Defina `NODE_ENV=development` antes de executar os testes.

## 📚 Referências

- [Documentação da API Pagarme - Recipients](https://docs.pagar.me/reference/criar-recebedor)
- [Documentação da API Pagarme - Split de Pagamento](https://docs.pagar.me/reference/criar-transacao-com-split)

