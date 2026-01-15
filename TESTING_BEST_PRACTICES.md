# 📘 Guia de Boas Práticas para Testes

**Projeto:** LikeMe Backend  
**Última atualização:** 2026-01-15  
**Audiência:** Desenvolvedores

---

## 🎯 Objetivo

Este guia estabelece padrões e convenções para escrever testes de alta qualidade no projeto LikeMe Backend.

---

## 📊 Pirâmide de Testes

Seguimos a pirâmide de testes clássica:

```
        /\
       /  \     E2E (5%)
      / 🔴 \    - Fluxos críticos completos
     /______\   - Lento, frágil, alto valor
    /        \  
   /   🟡    \  Integration (15%)
  / Integration\ - API + DB + Serviços
 /____________\ - Moderado, médio valor
/              \
/   🟢 Unit    \ Unit (80%)
/    Tests      \ - Lógica isolada
/________________\ - Rápido, confiável, alto ROI
```

### Quando usar cada tipo:

#### 🟢 **Unit Tests** (80% dos testes)
**Use para:**
- Lógica de negócio pura
- Funções utilitárias
- Services (com dependências mockadas)
- Validators, parsers, transformers

**Características:**
- ⚡ **Rápido**: < 10ms por teste
- 🎯 **Isolado**: Mock todas as dependências externas
- 🔄 **Determinístico**: Sempre mesmo resultado

**Nomenclatura:** `*.test.ts`

**Exemplo:**
```typescript
// ✅ BOM: Teste unitário puro
describe('PasswordValidator', () => {
  it('should reject password shorter than 8 characters', () => {
    const result = validatePassword('abc123');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('8 characters');
  });
});
```

---

#### 🟡 **Integration Tests** (15% dos testes)
**Use para:**
- Endpoints HTTP completos
- Fluxos que envolvem DB + Service + Controller
- Integração com APIs externas (mockadas no CI)

**Características:**
- 🐢 **Moderado**: 100-500ms por teste
- 🗄️ **Usa DB real**: Mas em ambiente de teste
- 🔗 **Testa integrações**: Entre camadas

**Nomenclatura:** `*.integration.test.ts`

**Exemplo:**
```typescript
// ✅ BOM: Teste de integração
describe('POST /api/orders', () => {
  it('should create order and process payment', async () => {
    const response = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${authToken}`)
      .send(orderData);

    expect(response.status).toBe(201);
    
    // Verificar no banco
    const order = await prisma.order.findUnique({
      where: { id: response.body.data.id },
    });
    expect(order?.paymentStatus).toBe('paid');
  });
});
```

---

#### 🔴 **E2E Tests** (5% dos testes)
**Use para:**
- Fluxos críticos de usuário (login → compra → confirmação)
- Testes de regressão de features principais
- Validação pré-deploy

**Características:**
- 🐌 **Lento**: 5-30s por teste
- 🌐 **Real**: Testa sistema completo
- 💰 **Alto valor**: Confidence em prod

**Nomenclatura:** `*.e2e.test.ts`

**Exemplo:**
```typescript
// ✅ BOM: Teste E2E
describe('Complete Purchase Flow', () => {
  it('should allow user to register, login, buy product', async () => {
    // 1. Registrar
    const registerRes = await request(app).post('/api/auth/register')...
    
    // 2. Login
    const loginRes = await request(app).post('/api/auth/login')...
    
    // 3. Adicionar ao carrinho
    const cartRes = await request(app).post('/api/cart')...
    
    // 4. Checkout
    const checkoutRes = await request(app).post('/api/orders')...
    
    expect(checkoutRes.body.data.paymentStatus).toBe('paid');
  });
});
```

---

## 🏗️ Estrutura de Arquivos

```
src/
  middleware/
    auth.ts
    __tests__/
      auth.test.ts              ← Unit test do middleware
  
  services/
    order/
      orderService.ts
      __tests__/
        orderService.test.ts    ← Unit tests do service
  
  controllers/
    order/
      orderController.ts
      orderController.integration.test.ts  ← Integration test
  
  utils/
    auth.ts
    __tests__/
      auth.test.ts              ← Unit test de utils

tests/
  e2e/
    checkout-flow.e2e.test.ts   ← E2E tests
    anamnesis-flow.e2e.test.ts
```

---

## ✅ Convenções de Nomenclatura

### Arquivos
```
✅ BOM                                    ❌ RUIM
orderService.test.ts                     orderServiceTest.ts
orderService.unit.test.ts (opcional)     test_orderService.ts
orderController.integration.test.ts      orderController.test.ts (se for integration!)
checkout-flow.e2e.test.ts               e2e-checkout.test.ts
```

### Describes e Its
```typescript
// ✅ BOM: Claro, descritivo, legível
describe('OrderService', () => {
  describe('create', () => {
    it('should create order and decrease product stock', async () => {
      // ...
    });

    it('should throw error if product out of stock', async () => {
      // ...
    });
  });
});

// ❌ RUIM: Vago, confuso
describe('Tests', () => {
  it('works', () => {
    // O que "works"?
  });

  it('test1', () => {
    // Não diz o que testa
  });
});
```

---

## 🎨 Padrões de Escrita

### AAA Pattern (Arrange-Act-Assert)

```typescript
it('should calculate discount correctly', () => {
  // 🔹 ARRANGE: Preparar dados
  const order = {
    subtotal: 100,
    discountPercent: 20,
  };

  // 🔸 ACT: Executar ação
  const result = calculateDiscount(order);

  // 🔺 ASSERT: Verificar resultado
  expect(result).toBe(20);
});
```

### Given-When-Then (BDD Style)

```typescript
describe('Product Stock', () => {
  it('should revert stock when payment fails', async () => {
    // GIVEN: Produto com estoque inicial
    const product = await createProduct({ stock: 10 });

    // WHEN: Tentativa de compra falha
    await expect(
      orderService.create({ productId: product.id, quantity: 2 })
    ).rejects.toThrow('Payment failed');

    // THEN: Estoque volta ao valor original
    const updatedProduct = await productService.findById(product.id);
    expect(updatedProduct.stock).toBe(10);
  });
});
```

---

## 🧪 Boas Práticas

### 1. ✅ Teste Comportamento, Não Implementação

```typescript
// ❌ RUIM: Testa implementação (acoplado)
it('should call prisma.order.create with correct params', () => {
  const spy = jest.spyOn(prisma.order, 'create');
  orderService.create(data);
  expect(spy).toHaveBeenCalledWith({ data: ... });
  // Se mudar de Prisma para outro ORM, teste quebra
});

// ✅ BOM: Testa comportamento (desacoplado)
it('should create order with correct total', async () => {
  const order = await orderService.create(data);
  expect(order.total).toBe(110);
  // Não importa como foi salvo, importa o resultado
});
```

---

### 2. ✅ Use Mocks Apropriadamente

```typescript
// ✅ BOM: Mock de dependência externa (API, Payment Gateway)
jest.mock('@/clients/pagarme/pagarmeClient', () => ({
  createCreditCardTransaction: jest.fn().mockResolvedValue({
    id: 'trans_123',
    status: 'paid',
  }),
}));

// ❌ EVITE: Mock de lógica interna do próprio sistema
jest.mock('@/services/order/orderService'); // Não mocke o que você está testando!
```

**Regra de Ouro:** Mock apenas o que está **fora do seu controle** (APIs externas, clock, filesystem).

---

### 3. ✅ Isole Testes (Sem Dependências Entre Eles)

```typescript
// ❌ RUIM: Testes dependem de ordem de execução
describe('User CRUD', () => {
  let userId: string;

  it('should create user', () => {
    const user = createUser();
    userId = user.id; // ⚠️ Estado compartilhado!
  });

  it('should update user', () => {
    updateUser(userId); // ⚠️ Depende do teste anterior
  });
});

// ✅ BOM: Cada teste é independente
describe('User CRUD', () => {
  beforeEach(async () => {
    // Setup em cada teste
    testUser = await createTestUser();
  });

  it('should create user', () => {
    expect(testUser.id).toBeDefined();
  });

  it('should update user', () => {
    const updated = updateUser(testUser.id, { name: 'New' });
    expect(updated.name).toBe('New');
  });
});
```

---

### 4. ✅ Limpe Dados de Teste

```typescript
// ✅ BOM: Usa test-helpers centralizado
const testDataTracker = new TestDataTracker();

afterAll(async () => {
  await safeTestCleanup(testDataTracker, prisma);
  await prisma.$disconnect();
});

it('should create order', async () => {
  const order = await prisma.order.create({ data: ... });
  testDataTracker.add('order', order.id); // Registrar para limpeza
  
  expect(order).toBeDefined();
});
```

---

### 5. ✅ Teste Edge Cases

```typescript
describe('PasswordValidator', () => {
  // ✅ Casos normais
  it('should accept valid password', () => {
    expect(validatePassword('Abc123!@#')).toBe(true);
  });

  // 🔸 Edge cases
  it('should reject empty password', () => {
    expect(validatePassword('')).toBe(false);
  });

  it('should reject password with only spaces', () => {
    expect(validatePassword('        ')).toBe(false);
  });

  it('should handle very long password', () => {
    const longPassword = 'a'.repeat(10000);
    expect(validatePassword(longPassword)).toBe(false);
  });

  it('should handle special characters', () => {
    expect(validatePassword('Pássword123!')).toBe(true);
  });

  it('should handle null/undefined', () => {
    expect(validatePassword(null as any)).toBe(false);
    expect(validatePassword(undefined as any)).toBe(false);
  });
});
```

---

### 6. ✅ Use Fixtures e Factories

```typescript
// ✅ BOM: Centralize criação de dados de teste
// test/fixtures/orderFixtures.ts
export const createValidOrder = (overrides = {}) => ({
  subtotal: 100,
  shippingCost: 10,
  tax: 5,
  total: 115,
  status: 'pending',
  ...overrides,
});

// No teste:
it('should calculate total', () => {
  const order = createValidOrder({ subtotal: 200 });
  expect(order.total).toBe(215);
});
```

---

### 7. ✅ Evite Números Mágicos

```typescript
// ❌ RUIM: Números mágicos sem contexto
it('should calculate discount', () => {
  expect(calculateDiscount(100, 0.2)).toBe(20);
  // O que é 100? O que é 0.2?
});

// ✅ BOM: Constantes nomeadas
it('should calculate discount correctly', () => {
  const ORDER_SUBTOTAL = 100;
  const DISCOUNT_PERCENT = 20;
  const EXPECTED_DISCOUNT = 20;

  const discount = calculateDiscount(ORDER_SUBTOTAL, DISCOUNT_PERCENT / 100);
  
  expect(discount).toBe(EXPECTED_DISCOUNT);
});
```

---

## 🚫 Anti-Patterns (O Que Evitar)

### ❌ 1. Testes Frágeis

```typescript
// ❌ RUIM: Depende de timestamp exato
it('should set createdAt to now', () => {
  const user = createUser();
  expect(user.createdAt).toBe(new Date()); // Falha por milissegundos!
});

// ✅ BOM: Verifica range
it('should set createdAt to now', () => {
  const before = new Date();
  const user = createUser();
  const after = new Date();
  
  expect(user.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
  expect(user.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
});
```

---

### ❌ 2. Testes Muito Longos

```typescript
// ❌ RUIM: Teste gigante que faz tudo
it('should handle complete user lifecycle', async () => {
  // 200 linhas testando registro, login, update, compra, pagamento...
  // ⚠️ Se falhar, difícil saber onde está o problema
});

// ✅ BOM: Divida em testes menores e focados
describe('User Lifecycle', () => {
  it('should register new user', () => { /* ... */ });
  it('should login with valid credentials', () => { /* ... */ });
  it('should update user profile', () => { /* ... */ });
  it('should process user purchase', () => { /* ... */ });
});
```

---

### ❌ 3. Testes Redundantes

```typescript
// ❌ RUIM: 10 testes verificando "401 if no token"
// authController.test.ts
it('should return 401 if no token', () => { /* ... */ });

// orderController.test.ts
it('should return 401 if no token', () => { /* ... */ }); // Duplicado!

// paymentController.test.ts
it('should return 401 if no token', () => { /* ... */ }); // Duplicado!

// ✅ BOM: Teste uma vez no middleware
// middleware/__tests__/auth.test.ts
it('should return 401 if no token', () => { /* ... */ });
```

---

## 🎭 Mocking Strategies

### Quando Mockar vs Quando Não Mockar

| Dependência | Mockar? | Razão |
|-------------|---------|-------|
| **Prisma (DB)** | ❌ Não (integration) | Testar queries reais é valioso |
| **Prisma (DB)** | ✅ Sim (unit) | Isolar lógica de serviço |
| **Payment Gateway** | ✅ Sim | Externa, lenta, custa dinheiro |
| **Auth0 API** | ✅ Sim | Externa, necessita credenciais |
| **Date/Time** | ✅ Sim | Para testes determinísticos |
| **File System** | ✅ Sim | Evita efeitos colaterais |
| **Serviços internos** | 🟡 Depende | Unit: sim, Integration: não |

---

## 📝 Checklist de Code Review

Antes de aprovar um PR com testes, verifique:

- [ ] Nomenclatura clara (`*.test.ts`, `*.integration.test.ts`, `*.e2e.test.ts`)
- [ ] Testes isolados (não dependem de ordem)
- [ ] Limpeza de dados (`testDataTracker.add()` + `safeTestCleanup()`)
- [ ] Mocks apropriados (apenas externos)
- [ ] Edge cases cobertos
- [ ] Sem números mágicos
- [ ] Sem testes redundantes
- [ ] Descrições claras (`it('should...')`)
- [ ] AAA pattern seguido
- [ ] Performance OK (unit < 10ms, integration < 500ms)

---

## 🚀 Executando Testes

### Comandos

```bash
# Todos os testes
npm test

# Apenas unit tests
npm test -- --testPathPattern="\.test\.ts$" --testPathIgnorePatterns="integration|e2e"

# Apenas integration tests
npm test -- --testPathPattern="integration\.test\.ts$"

# Apenas E2E tests
npm test -- --testPathPattern="e2e\.test\.ts$"

# Arquivo específico
npm test -- orderService.test.ts

# Com cobertura
npm test -- --coverage

# Watch mode
npm test -- --watch
```

---

## 📚 Recursos Adicionais

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing Best Practices (goldbergyoni)](https://github.com/goldbergyoni/javascript-testing-best-practices)
- [Test Pyramid (Martin Fowler)](https://martinfowler.com/bliki/TestPyramid.html)

---

## 💡 Dúvidas Frequentes

### "Meu teste está lento, o que fazer?"
1. Verifique se é realmente unit test ou se deveria ser integration
2. Reduza setup desnecessário no `beforeEach`
3. Use `beforeAll` para setup pesado
4. Considere paralelizar

### "Como testar código assíncrono?"
```typescript
// ✅ Sempre use async/await
it('should fetch data', async () => {
  const data = await fetchData();
  expect(data).toBeDefined();
});

// ✅ Ou retorne a Promise
it('should fetch data', () => {
  return fetchData().then((data) => {
    expect(data).toBeDefined();
  });
});
```

### "Devo testar código privado?"
❌ Não. Teste apenas a interface pública. Se precisa testar método privado, talvez ele deveria ser público ou estar em outro módulo.

---

**Última revisão:** 2026-01-15  
**Manten Mantido por:** Time de Engenharia LikeMe  
**Feedback:** Abra uma issue ou PR com sugestões!

