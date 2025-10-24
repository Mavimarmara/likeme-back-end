# Guia de Contribuição

Obrigado por considerar contribuir para o LikeMe Backend! Este documento fornece diretrizes para contribuições.

## 🚀 Como Contribuir

### 1. Fork e Clone
```bash
git clone https://github.com/seu-usuario/likeme-back-end.git
cd likeme-back-end
```

### 2. Configurar Ambiente
```bash
# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp env.example .env

# Gerar cliente Prisma
npm run db:generate

# Executar migrações
npm run db:push

# Popular com dados iniciais
npm run db:seed
```

### 3. Criar Branch
```bash
git checkout -b feature/nova-funcionalidade
# ou
git checkout -b fix/corrigir-bug
```

### 4. Desenvolver
- Siga as convenções de código existentes
- Escreva testes para novas funcionalidades
- Atualize a documentação quando necessário
- Execute `npm run lint` para verificar o código

### 5. Testar
```bash
# Executar testes
npm test

# Executar linting
npm run lint

# Verificar build
npm run build
```

### 6. Commit
```bash
git add .
git commit -m "feat: adiciona nova funcionalidade"
```

### 7. Push e Pull Request
```bash
git push origin feature/nova-funcionalidade
```

## 📝 Convenções

### Commits
Use o padrão [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` nova funcionalidade
- `fix:` correção de bug
- `docs:` documentação
- `style:` formatação
- `refactor:` refatoração
- `test:` testes
- `chore:` tarefas de manutenção

### Código
- Use TypeScript
- Siga o ESLint configurado
- Use nomes descritivos para variáveis e funções
- Comente código complexo
- Mantenha funções pequenas e focadas

### Testes
- Escreva testes para todas as novas funcionalidades
- Mantenha cobertura de testes alta
- Use nomes descritivos para testes
- Teste casos de sucesso e erro

## 🐛 Reportar Bugs

Use o template de issue para bugs:
1. Descrição clara do problema
2. Passos para reproduzir
3. Comportamento esperado vs atual
4. Screenshots se aplicável
5. Informações do ambiente

## 💡 Sugerir Funcionalidades

Use o template de issue para features:
1. Descrição da funcionalidade
2. Casos de uso
3. Benefícios
4. Possíveis implementações

## 📋 Checklist para Pull Requests

- [ ] Código segue as convenções do projeto
- [ ] Testes passam
- [ ] Linting passa
- [ ] Documentação atualizada
- [ ] Commits seguem o padrão
- [ ] Branch está atualizada com main
- [ ] Descrição clara do PR

## 🤝 Código de Conduta

Este projeto segue o [Código de Conduta do Contributor Covenant](https://www.contributor-covenant.org/).

## 📞 Suporte

Para dúvidas sobre contribuição:
- Abra uma issue
- Entre em contato: contato@likeme.com

Obrigado por contribuir! 🎉
