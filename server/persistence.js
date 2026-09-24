// Persistência opcional do estado (PERSIST_FILE): grava as salas e as sessões em um arquivo
// JSON para que um restart do servidor não derrube as partidas em andamento.
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

const VERSION = 1;

const save = (file, controller, sessions) => {
  const data = {
    version: VERSION,
    savedAt: Date.now(),
    rooms: controller.snapshotAll(),
    sessions: sessions.snapshot(playerId => Boolean(controller.findRoomByPlayer(playerId)))
  };
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  fs.renameSync(temporary, file);
  return data.rooms.length;
};

const load = (file, controller, sessions) => {
  if (!fs.existsSync(file)) return { rooms: 0 };

  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (data.version !== VERSION) {
    logger.warn(`Arquivo de persistência com versão ${data.version} ignorado (esperado ${VERSION}).`);
    return { rooms: 0 };
  }

  sessions.restore(data.sessions);
  return { rooms: controller.restoreAll(data.rooms) };
};

// Grava periodicamente, e só quando algo mudou.
const startAutosave = (file, controller, sessions, intervalMs = 15000) => {
  const timer = setInterval(() => {
    if (!controller.consumeDirty()) return;
    try {
      save(file, controller, sessions);
    } catch (err) {
      logger.error('Falha ao gravar o arquivo de persistência:', err);
    }
  }, intervalMs);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
};

module.exports = { save, load, startAutosave };
