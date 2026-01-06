# Teste de Split de Pagamento

## Como testar o split de pagamento

### Pré-requisitos

1. Ter um recipient criado na Pagarme
2. Configurar as variáveis de ambiente no backend:

```bash
PAGARME_SPLIT_ENABLED=true
PAGARME_SPLIT_RECIPIENT_ID=re_xxxxx  # ID do recipient na Pagarme
PAGARME_SPLIT_PERCENTAGE=10          # Percentual do split (ex: 10 = 10%)
PAGARME_SPLIT_CHARGE_PROCESSING_FEE=false
PAGARME_SPLIT_CHARGE_REMAINDER_FEE=false
PAGARME_SPLIT_LIABLE=true
```

### Executar o teste

```bash
./scripts/test-split-payment-prod.sh
```

### O que o teste faz

1. Cria um usuário de teste
2. Verifica se há recipient configurado (ou tenta criar um)
3. Cria um produto de teste
4. Cria um pedido com pagamento
5. Verifica se o split foi aplicado

### Verificar se o split funcionou

1. Verifique os logs do backend na Vercel
2. Procure por mensagens como:
   - `[PaymentSplitService] Split calculado:`
   - `[Pagarme] 📊 Detalhes do Split que será enviado:`
   - `[Pagarme] Adicionando split:`

3. Na resposta da Pagarme, verifique se há informações de split na transação

### Notas

- O split só é aplicado se `PAGARME_SPLIT_ENABLED=true`
- O recipient_id deve ser válido na Pagarme
- O percentual deve estar entre 1 e 100
