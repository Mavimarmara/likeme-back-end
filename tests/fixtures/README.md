# 🏗️ Test Fixtures

Objetos reutilizáveis para testes, seguindo o padrão **Object Mother**.

## 📦 O Que São Fixtures?

Fixtures são **objetos de teste pré-configurados** que:
- ✅ Reduzem duplicação de código
- ✅ Facilitam criação de dados de teste válidos
- ✅ Centralizam configuração padrão
- ✅ Permitem overrides específicos

---

## 🎯 Como Usar

### Importação

```typescript
import {
  createValidUser,
  createValidProduct,
  createValidOrder,
} from '@/tests/fixtures/testFixtures';
```

### Uso Básico

```typescript
// Criar objeto com valores padrão
const user = createValidUser();
// { username: 'testuser_1234@example.com', password: 'hashedPassword123', isActive: true }

// Override de valores específicos
const inactiveUser = createValidUser({ isActive: false });
// { username: 'testuser_5678@example.com', password: 'hashedPassword123', isActive: false }
```

---

## 📚 Fixtures Disponíveis

### 👤 User & Person

```typescript
// Usuário válido
const user = createValidUser({
  username: 'custom@example.com',
});

// Pessoa válida
const person = createValidPerson({
  firstName: 'João',
  nationalRegistration: '12345678901',
});

// Contato válido
const contact = createValidContact(personId, {
  type: 'phone',
  value: '11999999999',
});
```

---

### 📦 Product

```typescript
// Produto válido
const product = createValidProduct({
  price: 199.99,
  quantity: 50,
});

// Produto sem estoque
const outOfStock = createOutOfStockProduct();

// Produto externo (Amazon)
const external = createExternalProduct({
  externalUrl: 'https://amazon.com/...',
});
```

---

### 🛒 Order

```typescript
// Pedido válido
const order = createValidOrder({
  userId: testUser.id,
  subtotal: 200,
});
// Total calculado automaticamente: subtotal + shippingCost + tax

// Item de pedido
const item = createValidOrderItem(orderId, productId, {
  quantity: 3,
  unitPrice: 50,
});
// Total calculado: quantity * unitPrice - discount

// Pedido completo (com items, card, address)
const completeOrder = createCompleteOrderData(userId, productId);
```

---

### 💳 Payment

```typescript
// Cartão de crédito válido (teste)
const card = createValidCardData({
  cardHolderName: 'JOHN DOE',
});
// Número: 4111111111111111 (Visa test card)

// Endereço válido
const address = createValidAddress({
  city: 'Rio de Janeiro',
  state: 'RJ',
});
```

---

### 🏥 Anamnesis

```typescript
// Pergunta genérica
const question = createValidAnamnesisQuestion({
  questionText: 'Qual sua idade?',
});

// Pergunta de "Mind"
const mindQ = createMindQuestion();
// key: 'mind_...'

// Pergunta de "Body"
const bodyQ = createBodyQuestion();
// key: 'body_...'
```

---

### 📢 Ad & Advertiser

```typescript
// Anúncio válido
const ad = createValidAd({
  advertiserId: advertiser.id,
  title: 'Promoção Especial',
});

// Anunciante válido
const advertiser = createValidAdvertiser({
  companyName: 'Empresa XYZ',
});
```

---

### 🎯 Activity

```typescript
// Atividade válida
const activity = createValidActivity({
  type: 'purchase_completed',
  data: { orderId: order.id },
});
```

---

## 🛠️ Helpers

### Conversão de Moeda

```typescript
import { toCents, toReais } from '@/tests/fixtures/testFixtures';

// Converter reais para centavos (Pagarme)
const centavos = toCents(99.99); // 9999

// Converter centavos para reais
const reais = toReais(9999); // 99.99
```

### Geração de Dados Únicos

```typescript
import {
  generateTestCPF,
  generateTestCNPJ,
  generateTestEmail,
} from '@/tests/fixtures/testFixtures';

const cpf = generateTestCPF(); // '11144477735'
const cnpj = generateTestCNPJ(); // '12345678000190'
const email = generateTestEmail('user'); // 'user_1234_abc@example.com'
```

---

## ✅ Boas Práticas

### ✅ DO: Use fixtures para dados padrão

```typescript
// ✅ BOM
it('should create order', async () => {
  const order = createValidOrder({ userId: testUser.id });
  const result = await orderService.create(order);
  expect(result).toBeDefined();
});
```

### ❌ DON'T: Repita dados de teste

```typescript
// ❌ RUIM
it('should create order', async () => {
  const order = {
    userId: testUser.id,
    subtotal: 100,
    shippingCost: 10,
    tax: 5,
    total: 115,
    status: 'pending',
    paymentStatus: 'pending',
  };
  // Repetindo isso em 50 testes...
});
```

---

### ✅ DO: Override apenas o necessário

```typescript
// ✅ BOM: Override mínimo
const product = createValidProduct({ price: 299.99 });

// ❌ RUIM: Override desnecessário
const product = createValidProduct({
  name: 'Test Product',
  price: 299.99,
  quantity: 10,
  status: 'active',
  // ... todos os campos
});
```

---

### ✅ DO: Combine fixtures

```typescript
// ✅ BOM: Composição de fixtures
it('should process order payment', async () => {
  const product = createValidProduct();
  const order = createValidOrder({ userId: user.id });
  const item = createValidOrderItem(order.id, product.id);
  const card = createValidCardData();
  
  // Teste...
});
```

---

## 🔄 Expandindo Fixtures

Para adicionar novos fixtures:

1. **Defina a interface**
```typescript
export interface TestNomeDoObjeto {
  campo1: string;
  campo2: number;
}
```

2. **Crie a factory function**
```typescript
export const createValidNomeDoObjeto = (
  overrides: Partial<TestNomeDoObjeto> = {}
): TestNomeDoObjeto => ({
  campo1: 'valor padrão',
  campo2: 123,
  ...overrides,
});
```

3. **Exporte**
```typescript
export default {
  ...
  createValidNomeDoObjeto,
};
```

4. **Documente aqui** no README

---

## 📚 Referências

- [Test Data Builders](https://www.arhohuttunen.com/test-data-builders/)
- [Object Mother Pattern](https://martinfowler.com/bliki/ObjectMother.html)
- [Testing Best Practices](../TESTING_BEST_PRACTICES.md)

---

**Última atualização:** 2026-01-15

