// O dotenv precisa rodar antes de qualquer módulo que leia process.env.
require('dotenv').config();

const express = require('express');
const http = require('http');
const helmet = require('helmet');
const { Server } = require('socket.io');
const cors = require('cors');
const gameRoutes = require('./routes/gameRoutes');
const gameController = require('./controllers/gameController');
const ioModule = require('./socket/io');
const sessions = require('./socket/sessions');
const persistence = require('./persistence');
const { registerHandlers } = require('./socket/handlers');
const logger = require('./utils/logger');

// CLIENT_ORIGIN aceita uma lista separada por vírgulas (ex.: https://truco.exemplo.com).
// Sem ela, qualquer origem é aceita (adequado apenas para desenvolvimento).
const getAllowedOrigins = () => {
  const raw = process.env.CLIENT_ORIGIN;
  if (!raw) return '*';
  return raw.split(',').map(origin => origin.trim()).filter(Boolean);
};

const createServer = () => {
  const origin = getAllowedOrigins();
  if (origin === '*' && process.env.NODE_ENV === 'production') {
    logger.warn('CLIENT_ORIGIN não definido: aceitando conexões de qualquer origem.');
  }

  const app = express();
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin }));
  app.use(express.json({ limit: '10kb' }));

  app.use('/api/game', gameRoutes);
  app.get('/health', (req, res) => res.json({ status: 'ok' }));
  app.get('/', (req, res) => {
    res.send('API do Truco Gaúcho está funcionando!');
  });

  const server = http.createServer(app);
  const io = new Server(server, {
    cors: { origin, methods: ['GET', 'POST'] },
    pingInterval: 10000,
    pingTimeout: 20000,
    // As mensagens reais têm poucos bytes; o padrão (1 MB) só serve para abuso.
    maxHttpBufferSize: 1e4
  });

  ioModule.init(io);
  registerHandlers(io);

  return { app, server, io };
};

const start = () => {
  const { server, io } = createServer();
  const port = process.env.PORT || 5000;
  const persistFile = process.env.PERSIST_FILE;

  if (persistFile) {
    try {
      const { rooms } = persistence.load(persistFile, gameController, sessions);
      if (rooms > 0) logger.info(`${rooms} sala(s) restaurada(s) de ${persistFile}`);
    } catch (err) {
      logger.error('Não foi possível restaurar o estado salvo:', err);
    }
    persistence.startAutosave(persistFile, gameController, sessions, Number(process.env.PERSIST_INTERVAL_MS) || 15000);
  }

  server.listen(port, '0.0.0.0', () => {
    logger.info(`Servidor rodando na porta ${port}`);
  });

  // Rede de segurança: registra o erro em vez de derrubar todas as partidas em andamento.
  process.on('uncaughtException', (err) => {
    logger.error('[uncaughtException] Erro não tratado no servidor:', err);
  });
  process.on('unhandledRejection', (reason) => {
    logger.error('[unhandledRejection] Promise rejeitada sem tratamento:', reason);
  });

  const shutdown = () => {
    logger.info('Encerrando servidor...');
    if (persistFile) {
      try {
        const saved = persistence.save(persistFile, gameController, sessions);
        logger.info(`${saved} sala(s) gravada(s) em ${persistFile}`);
      } catch (err) {
        logger.error('Falha ao gravar o estado antes de encerrar:', err);
      }
    }
    io.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
};

if (require.main === module) start();

module.exports = { createServer };
