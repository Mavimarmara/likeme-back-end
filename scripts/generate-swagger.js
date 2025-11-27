/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const outputPath = path.join(__dirname, '../dist/swagger.json');

async function generateSwagger() {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { swaggerOptions } = require('../dist/config/swagger');
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { config } = require('../dist/config');

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    // Substituir {baseUrl} pela URL real da configuração
    const baseUrl = config.baseUrl || 'http://localhost:3000';
    const swaggerSpecString = JSON.stringify(swaggerSpec, null, 2);
    const swaggerSpecWithBaseUrl = swaggerSpecString.replace(/{baseUrl}/g, baseUrl);
    const swaggerSpecFinal = JSON.parse(swaggerSpecWithBaseUrl);

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, JSON.stringify(swaggerSpecFinal, null, 2), 'utf-8');

    console.log(`✅ Swagger JSON gerado em ${outputPath}`);
    console.log(`   URL base usada nos exemplos: ${baseUrl}`);
  } catch (error) {
    console.error('Erro ao gerar Swagger JSON:', error);
    process.exitCode = 1;
  }
}

generateSwagger();


