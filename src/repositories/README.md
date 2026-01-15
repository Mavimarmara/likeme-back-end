# 📦 Repositories

## 🎯 Objetivo

A camada de **repositories** implementa o **Repository Pattern** para desacoplar a lógica de negócio da persistência de dados.

## 📁 Estrutura

```
src/
├── controllers/      # HTTP handlers
├── services/         # Regras de negócio
├── routes/           # Definição de rotas
├── repositories/     # 🆕 Acesso a dados (NOVA CAMADA)
│   ├── user/
│   │   ├── UserRepository.ts              # Interface (contrato)
│   │   ├── PrismaUserRepository.ts        # Implementação com Prisma
│   │   ├── index.ts                       # Exports
│   │   └── __tests__/
│   │       └── PrismaUserRepository.test.ts
│   ├── order/        # (próximo)
│   └── product/      # (próximo)
├── interfaces/       # DTOs e Types
├── middleware/       # Middlewares Express
└── utils/            # Funções utilitárias
    └── repositoryContainer.ts  # DI Container
```

## 🏗️ Arquitetura

### Separação de Responsabilidades

```
┌─────────────┐
│ Controller  │  ← HTTP/Express (req, res)
└──────┬──────┘
       │ chama
┌──────▼──────┐
│  Service    │  ← Regras de negócio
└──────┬──────┘
       │ usa
┌──────▼──────┐
│ Repository  │  ← Acesso a dados (interface)
└──────┬──────┘
       │ implementa
┌──────▼──────┐
│   Prisma    │  ← ORM/Database
└─────────────┘
```

### Benefícios

✅ **Desacoplamento**: Services não conhecem Prisma  
✅ **Testabilidade**: Fácil criar mocks  
✅ **Manutenibilidade**: Queries centralizadas  
✅ **Flexibilidade**: Fácil trocar ORM  

## 📖 Como Usar

### 1. Em Services

```typescript
// src/services/user/userService.ts
import { getUserRepository } from '@/utils/repositoryContainer';
import type { UserRepository } from '@/repositories/user/UserRepository';

export class UserService {
  private userRepository: UserRepository;
  
  constructor(userRepository?: UserRepository) {
    // Permite injetar mock em testes
    this.userRepository = userRepository || getUserRepository();
  }
  
  async createUser(data: any) {
    // Verifica se email já existe
    const emailExists = await this.userRepository.existsByEmail(data.email);
    if (emailExists) {
      throw new Error('Email já cadastrado');
    }
    
    // Cria usuário
    const result = await this.userRepository.save({
      personId: data.personId,
      username: data.username,
      password: data.hashedPassword,
      avatar: data.avatar,
    });
    
    // Busca usuário completo
    const user = await this.userRepository.findById(result.id);
    return user;
  }
  
  async getUserByEmail(email: string) {
    return await this.userRepository.findByEmail(email);
  }
}
```

### 2. Em Controllers

```typescript
// src/controllers/user/userController.ts
import { Request, Response } from 'express';
import { UserService } from '@/services/user/userService';
import { sendSuccess, sendError } from '@/utils/response';

export class UserController {
  private userService: UserService;
  
  constructor() {
    this.userService = new UserService();
  }
  
  async getUser(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      
      if (!user) {
        sendError(res, 'User not found', 404);
        return;
      }
      
      sendSuccess(res, user);
    } catch (error) {
      console.error('Get user error:', error);
      sendError(res, 'Error retrieving user');
    }
  }
}
```

### 3. Em Testes (com Mock)

```typescript
// src/services/user/__tests__/userService.test.ts
import { UserService } from '../userService';
import type { UserRepository } from '@/repositories/user/UserRepository';

describe('UserService', () => {
  let userService: UserService;
  let mockRepository: jest.Mocked<UserRepository>;
  
  beforeEach(() => {
    // Cria mock do repository
    mockRepository = {
      save: jest.fn(),
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByUsername: jest.fn(),
      existsByEmail: jest.fn(),
      existsByUsername: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    };
    
    // Injeta mock no service
    userService = new UserService(mockRepository);
  });
  
  it('deve criar usuário com sucesso', async () => {
    mockRepository.existsByEmail.mockResolvedValue(false);
    mockRepository.save.mockResolvedValue({ id: 'user-123' });
    mockRepository.findById.mockResolvedValue({
      id: 'user-123',
      username: 'testuser',
      // ... outros campos
    });
    
    const result = await userService.createUser({
      email: 'test@example.com',
      username: 'testuser',
      // ...
    });
    
    expect(mockRepository.save).toHaveBeenCalled();
    expect(result).toBeDefined();
  });
  
  it('deve lançar erro se email já existe', async () => {
    mockRepository.existsByEmail.mockResolvedValue(true);
    
    await expect(
      userService.createUser({ email: 'exists@example.com' })
    ).rejects.toThrow('Email já cadastrado');
  });
});
```

## 🔌 Interface vs Implementação

### Interface (Contrato)

```typescript
// UserRepository.ts
export interface UserRepository {
  save(data: CreateUserData): Promise<{ id: string }>;
  findById(id: string): Promise<UserData | null>;
  // ... outros métodos
}
```

**Responsabilidade**: Define **O QUE** o repositório faz

### Implementação (Adapter)

```typescript
// PrismaUserRepository.ts
export class PrismaUserRepository implements UserRepository {
  async save(data: CreateUserData): Promise<{ id: string }> {
    // Implementação com Prisma
    return await prisma.user.create({ data });
  }
  // ... implementação dos métodos
}
```

**Responsabilidade**: Define **COMO** o repositório faz

## 🧪 Estratégia de Testes

### Testes Unitários (Services)
- ✅ Usa **mocks** do repository
- ✅ Rápido (milissegundos)
- ✅ Testa lógica de negócio isolada

### Testes de Integração (Repositories)
- ✅ Usa **banco de dados real** (ou test container)
- ✅ Testa queries e mapeamentos
- ✅ Garante funcionamento com Prisma

## 📋 Interface UserRepository

| Método | Descrição | Retorno |
|--------|-----------|---------|
| `save(data)` | Cria novo usuário | `{ id: string }` |
| `findById(id)` | Busca por ID | `UserData \| null` |
| `findByEmail(email)` | Busca por email | `UserData \| null` |
| `findByUsername(username)` | Busca por username | `UserData \| null` |
| `existsByEmail(email)` | Verifica se email existe | `boolean` |
| `existsByUsername(username)` | Verifica se username existe | `boolean` |
| `update(id, data)` | Atualiza usuário | `void` |
| `delete(id)` | Remove usuário (soft delete) | `void` |

## 🚀 Próximos Passos

1. ✅ **Fase 1**: UserRepository (concluído)
2. ⏳ **Fase 2**: Migrar services existentes para usar UserRepository
3. 📝 **Fase 3**: Criar OrderRepository
4. 📝 **Fase 4**: Criar ProductRepository
5. 📝 **Fase 5**: Criar CommunityRepository

## 📚 Arquivos Relacionados

- [UserRepository.ts](./user/UserRepository.ts) - Interface
- [PrismaUserRepository.ts](./user/PrismaUserRepository.ts) - Implementação
- [repositoryContainer.ts](../utils/repositoryContainer.ts) - DI Container
- [Exemplo completo](../../docs/guides/repository-pattern.md) - Guia detalhado

## 💡 Dicas

### Quando criar um novo repository

1. Crie a pasta: `repositories/nomedodominio/`
2. Crie a interface: `NomeDoDominioRepository.ts`
3. Crie a implementação: `PrismaNomeDoDominioRepository.ts`
4. Crie o `index.ts` exportando ambos
5. Adicione no `repositoryContainer.ts`
6. Crie testes em `__tests__/`

### Padrão de nomenclatura

- Interface: `UserRepository` (sem Prisma no nome)
- Implementação: `PrismaUserRepository` (com tecnologia no nome)
- Isso permite criar `RedisUserRepository`, `InMemoryUserRepository`, etc.

### Quando NÃO usar repository

- ❌ Queries muito simples (ex: `SELECT * FROM users WHERE id = ?`)
- ❌ Relatórios complexos com muitos joins
- ❌ Queries que mudam constantemente

Para esses casos, considere criar um **Query Service** separado.

