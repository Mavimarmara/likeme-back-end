const path = require('path');

let app;

try {
  const server = require('../dist/server');
  app = server.default || server;
} catch (error) {
  try {
    require('ts-node').register({
      transpileOnly: true,
      compilerOptions: {
        module: 'commonjs',
        esModuleInterop: true,
        resolveJsonModule: true,
      },
    });
    
    require('tsconfig-paths/register');
    
    const serverPath = path.join(__dirname, '../src/server.ts');
    delete require.cache[require.resolve(serverPath)];
    const server = require(serverPath);
    app = server.default || server;
  } catch (devError) {
    console.error('Erro ao carregar servidor:', devError);
    throw devError;
  }
}

if (require.main === module && !process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📚 Documentação: http://localhost:${PORT}/api-docs`);
    console.log(`🏥 Health: http://localhost:${PORT}/health`);
  });
}

module.exports = app;

