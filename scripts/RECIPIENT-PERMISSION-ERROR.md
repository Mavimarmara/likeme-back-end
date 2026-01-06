# Erro: "This company is not allowed to create a recipient"

## Problema

Ao tentar criar um recipient na Pagarme, você recebe o erro:
```
action_forbidden | This company is not allowed to create a recipient
```

## Causa

A conta Pagarme não tem permissão para criar recipients. Isso geralmente acontece porque:

1. **Conta não habilitada para Marketplace**: A funcionalidade de recipients faz parte do Marketplace da Pagarme e precisa ser habilitada na conta.

2. **Conta em modo de teste**: Algumas contas de teste podem não ter acesso completo a todas as funcionalidades.

3. **Plano da conta**: Alguns planos da Pagarme não incluem a funcionalidade de recipients/marketplace.

## Solução

### 1. Verificar no Dashboard da Pagarme

1. Acesse https://dashboard.pagar.me
2. Vá em **Configurações** > **Marketplace** ou **Recebedores**
3. Verifique se a funcionalidade está habilitada

### 2. Contatar Suporte da Pagarme

Se a funcionalidade não estiver habilitada:

1. Entre em contato com o suporte da Pagarme:
   - Email: suporte@pagarme.com
   - Telefone: (11) 3003-0460
   - Chat no dashboard

2. Solicite a habilitação de:
   - **Marketplace**
   - **Recebedores (Recipients)**
   - **Split de pagamento**

3. Informe que você precisa criar recipients para fazer split de pagamento

### 3. Verificar Documentação

- Documentação de Recipients: https://docs.pagar.me/reference/criar-recebedor
- Documentação de Marketplace: https://docs.pagar.me/reference/marketplace

## Alternativa Temporária

Enquanto a funcionalidade não é habilitada, você pode:

1. **Desabilitar split de pagamento**: Configure `PAGARME_SPLIT_ENABLED=false`
2. **Usar conta de produção**: Se estiver usando conta de teste, verifique se precisa migrar para produção
3. **Testar com outra conta**: Se tiver acesso a outra conta Pagarme com marketplace habilitado

## Verificação

Após habilitar a funcionalidade, teste novamente:

```bash
./scripts/test-create-recipient.sh
```

## Notas

- A habilitação pode levar alguns dias úteis
- Algumas contas precisam passar por processo de aprovação
- Verifique se sua conta está em produção (não sandbox) se necessário

