/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');
const swaggerJsdoc = require('swagger-jsdoc');

const outputPath = path.join(__dirname, '../dist/swagger.json');

async function generateSwagger() {
  try {
    // eslint-disable-next-line import/no-dynamic-require, global-require
    const { swaggerOptions } = require('../dist/config/swagger');

    const swaggerSpec = swaggerJsdoc(swaggerOptions);

    await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.promises.writeFile(outputPath, JSON.stringify(swaggerSpec, null, 2), 'utf-8');

    console.log(`✅ Swagger JSON gerado em ${outputPath}`);
  } catch (error) {
    console.error('Erro ao gerar Swagger JSON:', error);
    process.exitCode = 1;
  }
}

generateSwagger();


