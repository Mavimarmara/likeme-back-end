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

module.exports = (req, res) => {
  const { path: rewrittenPath, ...restQuery } = req.query || {};

  if (typeof rewrittenPath !== 'undefined') {
    const sanitizedPath = rewrittenPath === '' ? '/' : `/${rewrittenPath}`;
    const searchParams = new URLSearchParams();

    for (const [key, value] of Object.entries(restQuery)) {
      if (Array.isArray(value)) {
        value.forEach((item) => searchParams.append(key, item));
      } else if (typeof value !== 'undefined') {
        searchParams.append(key, value);
      }
    }

    const queryString = searchParams.toString();
    req.url = queryString ? `${sanitizedPath}?${queryString}` : sanitizedPath;
  }

  return app(req, res);
};

