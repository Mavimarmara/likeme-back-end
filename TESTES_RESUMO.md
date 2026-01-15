# 📋 Resumo: Estratégia de Testes

## ✅ Testes Automatizados (Atual)

Todos os testes agora são automatizados e executados via Jest:

### Testes Unitários
```bash
npm test
```

Localização: `src/**/*.test.ts`

Características:
- ✅ Limpeza automática via `safeTestCleanup()`
- ✅ Todos os IDs com sufixo `-system-test`
- ✅ Uso de `createTestToken()` do `test-helpers.ts`
- ✅ Isolados e rápidos

### Testes de Integração
```bash
npm run test:integration
```

Localização: `src/**/*.integration.test.ts`

Características:
- ✅ Testam fluxos completos end-to-end
- ✅ Usam banco de dados real (staging/dev)
- ✅ Limpeza automática via `safeTestCleanup()`
- ✅ Executados apenas em ambiente de desenvolvimento

## 🧹 Limpeza de Dados

### Automática (Testes Automatizados)
- Executada automaticamente após cada suite de testes
- Deleta apenas dados com sufixo `-system-test`
- Nenhuma ação manual necessária

### Manual (Dados Residuais)
```bash
npm run db:cleanup-tests
```

Remove dados de testes manuais antigos (antes da padronização).

Documentação completa: `CLEANUP_TESTS_README.md`

## 🚫 Scripts Manuais Removidos

Os seguintes scripts foram **removidos** para garantir consistência:

### Scripts de Pedidos
- ~~`create-test-order.sh`~~
- ~~`create-test-order-prod.sh`~~

**Substituído por:** `src/controllers/order/orderController.test.ts`

### Scripts de Pagamento
- ~~`test-pagarme-success.sh`~~
- ~~`test-pagarme-success-direct.sh`~~
- ~~`test-split-payment-prod.sh`~~

**Substituído por:** `src/controllers/payment/paymentController.test.ts`

### Scripts de Recipients
- ~~`test-create-recipient.sh`~~
- ~~`test-create-recipient.ts`~~
- ~~`test-recipient-example.sh`~~
- ~~`test-recipient-endpoint.sh`~~

**Substituído por:** `src/controllers/payment/recipientController.integration.test.ts`

### Scripts de Anúncios
- ~~`add-test-ads.ts`~~
- ~~`delete-test-ads.ts`~~

**Substituído por:** `src/controllers/ad/adController.test.ts`

### Outros
- ~~`test-backend-prod.sh`~~
- ~~`README-SPLIT-TEST.md`~~
- ~~`RECIPIENT-PERMISSION-ERROR.md`~~

## 📊 Cobertura de Testes

```bash
npm run test:coverage
```

Gera relatório HTML em `coverage/lcov-report/index.html`

## 🔍 Debugging de Testes

### Rodar um teste específico
```bash
npm test -- paymentController.test.ts
```

### Modo watch
```bash
npm run test:watch
```

### Logs detalhados
```bash
NODE_ENV=test npm test
```

## 🎯 Próximos Passos

1. ✅ Todos os testes agora são automatizados
2. ✅ Padrão `-system-test` implementado
3. ✅ Limpeza automática funcionando
4. ⏳ Aumentar cobertura de testes para 80%+
5. ⏳ Adicionar testes E2E com Playwright/Cypress

## 📚 Documentação Relacionada

- `CLEANUP_TESTS_README.md` - Guia de limpeza de dados
- `src/utils/test-helpers.ts` - Utilitários de teste
- `jest.config.js` - Configuração do Jest
