/**
 * Script para testar a consulta de frete (API CepCerto).
 * Uso: npx ts-node -r tsconfig-paths/register scripts/test-shipping-quote.ts [CEP]
 * Exemplo: npx ts-node -r tsconfig-paths/register scripts/test-shipping-quote.ts 01310100
 */
import { getShippingQuote } from '../src/services/shipping/cepcertoService';

const cep = (process.argv[2] || '01310100').replace(/\D/g, '');
if (cep.length !== 8) {
  console.error('Uso: npx ts-node -r tsconfig-paths/register scripts/test-shipping-quote.ts [CEP]');
  process.exit(1);
}

async function main() {
  console.log('Consultando frete para CEP:', cep, '...\n');
  const start = Date.now();
  try {
    const options = await getShippingQuote(cep);
    const elapsed = Date.now() - start;
    console.log('Sucesso em', elapsed, 'ms');
    console.log(JSON.stringify(options, null, 2));
  } catch (err: any) {
    const elapsed = Date.now() - start;
    console.error('Erro após', elapsed, 'ms:', err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  }
}

main();
