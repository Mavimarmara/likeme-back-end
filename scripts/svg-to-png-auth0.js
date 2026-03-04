/**
 * Converte public/logo-auth0.svg em public/logo-auth0.png (2x para tela retina).
 * Uso: node scripts/svg-to-png-auth0.js
 */
const path = require('path');
const sharp = require('sharp');

const root = path.join(__dirname, '..');
const svgPath = path.join(root, 'public', 'logo-auth0.svg');
const pngPath = path.join(root, 'public', 'logo-auth0.png');

sharp(svgPath)
  .resize(382, 72) // 2x do original 191x36
  .png()
  .toFile(pngPath)
  .then((info) => {
    console.log('PNG gerado:', pngPath);
    console.log('Dimensões:', info.width, 'x', info.height);
  })
  .catch((err) => {
    console.error('Erro ao converter SVG para PNG:', err.message);
    process.exit(1);
  });
