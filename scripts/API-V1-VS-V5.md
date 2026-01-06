# API v1 vs v5 da Pagarme para Recipients

## Diferenças

A documentação da Pagarme mostra exemplos usando a **API v1** (`/1/recipients`), mas estamos usando a **API v5** (`/core/v5/recipients`).

### API v1 (Documentação)
- Endpoint: `https://api.pagar.me/1/recipients`
- Estrutura: `bank_account` (não `default_bank_account`)
- Requer `api_key` no body da requisição
- Mais antiga, mas ainda suportada

### API v5 (Atual)
- Endpoint: `https://api.pagar.me/core/v5/recipients`
- Estrutura: `default_bank_account`
- Autenticação via header `Authorization: Basic`
- Mais recente e recomendada

## Como Usar

### Padrão (API v5)
Não precisa configurar nada, usa v5 por padrão.

### Usar API v1
Se precisar usar a API v1 (por exemplo, se v5 não funcionar), configure:

```bash
PAGARME_API_VERSION=v1
```

O código converterá automaticamente a estrutura v5 para v1.

## Nota Importante

O erro 412 "not allowed to create a recipient" **não é resolvido** mudando de API. Este erro indica que a **conta Pagarme não tem permissão** para criar recipients, independente da versão da API.

Para resolver o erro 412, é necessário:
1. Contatar suporte da Pagarme
2. Solicitar habilitação de Marketplace/Recipients
3. Aguardar aprovação

## Recomendação

- **Use API v5** (padrão) - mais recente e mantida
- Se v5 não funcionar por questões técnicas, tente v1
- Se receber erro 412, o problema é de permissão da conta, não da API

