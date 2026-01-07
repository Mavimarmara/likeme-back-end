/**
 * Script para testar a criação de recebedor na Pagarme
 * Execute: npx ts-node -r tsconfig-paths/register scripts/test-create-recipient.ts
 */

import { createRecipient } from '../src/clients/pagarme/pagarmeClient';
import type { IndividualRecipientData } from '../src/interfaces/payment/payment';

async function testCreateRecipient() {
  console.log('🧪 Testando criação de recebedor pessoa física...\n');

  // Dados de teste para recebedor pessoa física
  const recipientData: IndividualRecipientData = {
    register_information: {
      phone_numbers: [
        {
          ddd: '21',
          number: '994647568',
          type: 'mobile',
        },
      ],
      address: {
        street: 'Av. General Justo',
        complementary: 'Bloco A',
        street_number: '375',
        neighborhood: 'Centro',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zip_code: '20021130',
        reference_point: 'Ao lado da banca de jornal',
      },
      name: 'Teste Recebedor PF',
      email: `teste.recebedor.${Date.now()}@example.com`,
      document: '26224451990', // CPF válido para testes
      type: 'individual',
      site_url: 'https://example.com',
      mother_name: 'Maria Silva',
      birthdate: '12/10/1995',
      monthly_income: 12000000, // R$ 120.000,00 em centavos
      professional_occupation: 'Vendedor',
    },
    default_bank_account: {
      holder_name: 'Teste Recebedor PF',
      holder_type: 'individual',
      holder_document: '26224451990',
      bank: '341', // Itaú
      branch_number: '1234',
      branch_check_digit: '6',
      account_number: '12345',
      account_check_digit: '6',
      type: 'checking',
    },
    transfer_settings: {
      transfer_enabled: false,
      transfer_interval: 'Daily',
      transfer_day: 0,
    },
  };

  try {
    console.log('📤 Enviando requisição para criar recebedor...');
    console.log('Dados:', JSON.stringify({
      name: recipientData.register_information.name,
      email: recipientData.register_information.email,
      document: recipientData.register_information.document.substring(0, 3) + '***',
      type: recipientData.register_information.type,
    }, null, 2));

    const recipient = await createRecipient(recipientData);

    console.log('\n✅ Recebedor criado com sucesso!');
    console.log('ID:', recipient.id);
    console.log('Nome:', recipient.name);
    console.log('Email:', recipient.email);
    console.log('Status:', recipient.status);
    console.log('Tipo:', recipient.type);
    
    if (recipient.transfer_settings) {
      console.log('Transfer Enabled:', recipient.transfer_settings.transfer_enabled);
    }

    console.log('\n📋 Resposta completa:');
    console.log(JSON.stringify(recipient, null, 2));

    return recipient;
  } catch (error: any) {
    console.error('\n❌ Erro ao criar recebedor:');
    console.error('Mensagem:', error.message);
    
    if (error.message.includes('not allowed to create a recipient')) {
      console.error('\n⚠️  A conta Pagarme não tem permissão para criar recipients.');
      console.error('Entre em contato com o suporte da Pagarme para habilitar esta funcionalidade.');
    }
    
    throw error;
  }
}

// Executar teste
testCreateRecipient()
  .then(() => {
    console.log('\n✅ Teste concluído com sucesso!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Teste falhou:', error.message);
    process.exit(1);
  });

