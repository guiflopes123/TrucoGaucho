// PM2 em modo fork com uma instância: as salas ficam em memória do processo (com PERSIST_FILE
// elas sobrevivem a um restart). Ajuste CLIENT_ORIGIN para a URL pública do cliente.
module.exports = {
  apps: [{
    name: 'truco-gaucho-server',
    script: './index.js',
    env: {
      NODE_ENV: 'production',
      PORT: 5000,
      CLIENT_ORIGIN: 'https://seu-dominio.exemplo.com',
      TRUST_PROXY: 'true',
      PERSIST_FILE: './data/state.json'
    },
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
