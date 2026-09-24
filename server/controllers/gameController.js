const crypto = require('crypto');
const { TrucoGame } = require('../models/TrucoGame');
const ioModule = require('../socket/io');
const logger = require('../utils/logger');
const strategy = require('../bots/strategy');
const { NOTICES } = require('../game/notices');
const { validateChatText } = require('../utils/validation');

const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return process.env[name] !== undefined && process.env[name] !== '' && Number.isFinite(value) ? value : fallback;
};

// Configuração lida no carregamento; os testes podem alterar o objeto.
const config = {
  maxRooms: 200,
  maxRoomsPerIp: numberFromEnv('MAX_ROOMS_PER_IP', 5),
  emptyRoomTtlMs: 2 * 60 * 1000,
  roomIdleMs: numberFromEnv('ROOM_IDLE_MINUTES', 30) * 60 * 1000,
  turnTimeoutMs: numberFromEnv('TURN_TIMEOUT_SECONDS', 60) * 1000,
  botDelayMs: [900, 1800],
  botMixedResponseMs: 8000,
  chatMinIntervalMs: 800,
  chatHistory: 50
};

// Tempo que um jogador desconectado tem para voltar antes de ser removido da sala.
const RECONNECT_GRACE_MS = { playing: 60 * 1000, other: 15 * 1000 };

const gameRooms = new Map();
const disconnectTimers = new Map();
const botTimers = new Map();
const lastChatAt = new Map();

let dirty = false;
const hooks = { onRoomsChanged: null };

const NOT_FOUND = { success: false, message: 'Sala não encontrada' };

const markDirty = () => { dirty = true; };
const consumeDirty = () => {
  const wasDirty = dirty;
  dirty = false;
  return wasDirty;
};

// ------------------------------------------------------------------- senha

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32, { N: 4096 }).toString('hex');
  return { salt, hash };
};

const checkPassword = (stored, password) => {
  if (typeof password !== 'string') return false;
  const candidate = crypto.scryptSync(password, stored.salt, 32, { N: 4096 });
  return crypto.timingSafeEqual(candidate, Buffer.from(stored.hash, 'hex'));
};

// ------------------------------------------------------------------- salas

const attachGame = (room) => {
  const { game } = room;
  game.turnTimeoutMs = config.turnTimeoutMs;
  game.onStateChange = () => broadcastState(room.id);
  game.onNotice = (message) => notify(room.id, message);
};

const buildRoom = ({ id, name, maxPlayers, game, createdAt, lastActivity, passwordHash, chat, creatorIp }) => {
  const room = {
    id,
    name,
    maxPlayers,
    game,
    createdAt: createdAt || Date.now(),
    lastActivity: lastActivity || Date.now(),
    passwordHash: passwordHash || null,
    chat: chat || [],
    creatorIp: creatorIp || null,
    get players() { return game.players; },
    get status() { return game.gameStatus; }
  };
  attachGame(room);
  return room;
};

const createRoom = (roomName, maxPlayers, options = {}) => {
  if (![2, 4].includes(maxPlayers)) throw new Error('Número de jogadores deve ser 2 ou 4');
  if (gameRooms.size >= config.maxRooms) throw new Error('Limite de salas atingido, tente novamente mais tarde');

  if (options.creatorIp) {
    const owned = [...gameRooms.values()].filter(r => r.creatorIp === options.creatorIp).length;
    if (owned >= config.maxRoomsPerIp) throw new Error('Você já criou salas demais. Feche uma antes de criar outra');
  }

  const id = `room_${crypto.randomBytes(6).toString('hex')}`;
  const room = buildRoom({
    id,
    name: roomName,
    maxPlayers,
    game: new TrucoGame(id, maxPlayers),
    passwordHash: options.password ? hashPassword(options.password) : null,
    creatorIp: options.creatorIp
  });

  gameRooms.set(id, room);
  markDirty();
  return room;
};

const getRoom = (roomId) => gameRooms.get(roomId);

const playerView = (p) => ({
  id: p.id,
  name: p.name,
  team: p.team,
  isReady: p.isReady,
  isBot: p.isBot,
  connected: p.connected
});

// Visão pública da sala (nunca expõe o objeto do jogo, com baralho e mãos).
const toPublicRoom = (room) => ({
  id: room.id,
  name: room.name,
  maxPlayers: room.maxPlayers,
  status: room.status,
  hasPassword: Boolean(room.passwordHash),
  players: room.game.players.map(playerView)
});

const getAllRooms = () => Array.from(gameRooms.values()).map(room => ({
  id: room.id,
  name: room.name,
  players: room.players.length,
  maxPlayers: room.maxPlayers,
  status: room.status,
  hasPassword: Boolean(room.passwordHash),
  bots: room.players.filter(p => p.isBot).length
}));

const findRoomByPlayer = (playerId) => {
  for (const room of gameRooms.values()) {
    if (room.game.players.some(p => p.id === playerId)) return room;
  }
  return null;
};

const removeRoom = (room) => {
  room.game.dispose();
  const botTimer = botTimers.get(room.id);
  if (botTimer) clearTimeout(botTimer);
  botTimers.delete(room.id);
  gameRooms.delete(room.id);
  markDirty();
};

// Envia a cada jogador o estado da partida com apenas a própria mão.
const broadcastState = (roomId) => {
  const room = gameRooms.get(roomId);
  if (!room) return;

  room.lastActivity = Date.now();
  markDirty();

  const io = ioModule.getIO();
  room.game.players.forEach((player) => {
    if (player.isBot) return;
    io.to(ioModule.playerChannel(player.id)).emit('game_state_updated', {
      gameState: room.game.getGameState(player.id)
    });
  });

  scheduleBots(roomId);
};

const notify = (roomId, message) => {
  ioModule.getIO().to(roomId).emit('game_notice', { message });
};

const uniqueName = (room, name) => {
  const taken = new Set(room.game.players.map(p => p.name.toLowerCase()));
  if (!taken.has(name.toLowerCase())) return name;
  for (let suffix = 2; suffix < 20; suffix++) {
    const candidate = `${name.slice(0, 16)} (${suffix})`;
    if (!taken.has(candidate.toLowerCase())) return candidate;
  }
  return `${name.slice(0, 12)} ${crypto.randomBytes(2).toString('hex')}`;
};

const addPlayerToRoom = (roomId, playerId, playerName, options = {}) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;

  const existing = room.game.players.find(p => p.id === playerId);
  if (existing) {
    existing.connected = true;
    return { success: true, room, gameState: room.game.getGameState(playerId) };
  }

  if (room.passwordHash && !options.skipPassword) {
    if (!options.password) return { success: false, message: 'Esta sala exige senha', needsPassword: true };
    if (!checkPassword(room.passwordHash, options.password)) {
      return { success: false, message: 'Senha incorreta', needsPassword: true };
    }
  }

  const added = room.game.addPlayer(playerId, uniqueName(room, playerName));
  if (!added.success) return added;

  room.lastActivity = Date.now();
  markDirty();
  return { success: true, room, gameState: room.game.getGameState(playerId) };
};

const removePlayerFromRoom = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;

  const result = room.game.removePlayer(playerId);
  if (!result.success) return { success: false, message: 'Jogador não está na sala' };

  clearDisconnectTimer(playerId);
  lastChatAt.delete(`${roomId}:${playerId}`);

  // Sala sem nenhum humano (só bots) não tem por que continuar.
  if (result.roomEmpty || room.game.players.every(p => p.isBot)) {
    removeRoom(room);
    return { success: true, roomDeleted: true };
  }

  markDirty();
  return { success: true, room };
};

// -------------------------------------------------------------------- bots

const addBot = (roomId) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;
  if (room.game.gameStatus !== 'waiting') return { success: false, message: 'Só é possível adicionar bots antes da partida' };
  if (room.game.players.length >= room.maxPlayers) return { success: false, message: 'Sala cheia' };

  const botNumber = room.game.players.filter(p => p.isBot).length + 1;
  const botId = `bot:${crypto.randomBytes(4).toString('hex')}`;
  const added = room.game.addPlayer(botId, uniqueName(room, `Bot Gaúcho ${botNumber}`), { isBot: true });
  if (!added.success) return added;

  room.game.tryStart();
  return { success: true, bot: added.player };
};

const removeBot = (roomId) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;
  if (room.game.gameStatus !== 'waiting') return { success: false, message: 'Só é possível remover bots antes da partida' };

  const bot = [...room.game.players].reverse().find(p => p.isBot);
  if (!bot) return { success: false, message: 'Não há bots na sala' };

  room.game.removePlayer(bot.id);
  return { success: true, bot };
};

const randomBetween = (min, max) => min + Math.random() * (max - min);

// Agenda a próxima jogada de bot da sala (uma por vez); cada jogada bem sucedida
// retransmite o estado, o que agenda a seguinte, até nenhum bot ter o que fazer.
const scheduleBots = (roomId) => {
  const room = gameRooms.get(roomId);
  if (!room || botTimers.has(roomId)) return;

  const { game } = room;
  if (game.gameStatus !== 'playing' || game.roundLocked) return;

  const actor = game.players.find(p => p.isBot && strategy.needsAction(game, p.id));
  if (!actor) return;

  // Em time misto (humano + bot) o humano tem um tempo maior para responder primeiro.
  const mixedTeam = game.players.some(p => p.team === actor.team && !p.isBot);
  const isResponse = Boolean(strategy.pendingResponse(game, actor.team));
  const delay = isResponse && mixedTeam
    ? config.botMixedResponseMs
    : randomBetween(config.botDelayMs[0], config.botDelayMs[1]);

  const timer = setTimeout(() => {
    botTimers.delete(roomId);
    runBot(roomId, actor.id);
  }, delay);
  if (typeof timer.unref === 'function') timer.unref();
  botTimers.set(roomId, timer);
};

const runBot = (roomId, botId) => {
  const room = gameRooms.get(roomId);
  if (!room) return;

  const bot = room.game.players.find(p => p.id === botId);
  if (!bot || !strategy.needsAction(room.game, botId)) {
    scheduleBots(roomId);
    return;
  }

  const done = strategy.act(room.game, botId);
  if (!done) return;

  const notice = NOTICES[done.method];
  if (notice) notify(roomId, notice(bot.name, done.result, room));
  broadcastState(roomId);
};

// ---------------------------------------------------------------- conexão

const clearDisconnectTimer = (playerId) => {
  const timer = disconnectTimers.get(playerId);
  if (timer) {
    clearTimeout(timer);
    disconnectTimers.delete(playerId);
  }
};

// Inicia o prazo de reconexão: se o jogador não voltar, é removido da sala.
const startGraceTimer = (roomId, playerId, onRemoved) => {
  clearDisconnectTimer(playerId);
  const room = gameRooms.get(roomId);
  if (!room) return;

  const grace = room.game.gameStatus === 'playing' ? RECONNECT_GRACE_MS.playing : RECONNECT_GRACE_MS.other;
  const timer = setTimeout(() => {
    disconnectTimers.delete(playerId);
    const current = gameRooms.get(roomId);
    const currentPlayer = current && current.game.players.find(p => p.id === playerId);
    if (!currentPlayer || currentPlayer.connected) return;

    logger.info(`Removendo ${currentPlayer.name} da sala ${roomId} por falta de reconexão`);
    const name = currentPlayer.name;
    const result = removePlayerFromRoom(roomId, playerId);
    if (result.success && !result.roomDeleted) {
      broadcastState(roomId);
      notify(roomId, `${name} foi removido da sala por inatividade.`);
    }
    if (typeof onRemoved === 'function') onRemoved(playerId, roomId);
    if (typeof hooks.onRoomsChanged === 'function') hooks.onRoomsChanged();
  }, grace);
  if (typeof timer.unref === 'function') timer.unref();
  disconnectTimers.set(playerId, timer);
};

// Jogador perdeu a conexão: marca como desconectado e dá um prazo para voltar.
// `onRemoved` é chamado se o prazo expirar e o jogador for removido da sala.
const handlePlayerDisconnected = (playerId, onRemoved) => {
  const room = findRoomByPlayer(playerId);
  if (!room) return null;

  const player = room.game.players.find(p => p.id === playerId);
  room.game.setPlayerConnected(playerId, false);
  broadcastState(room.id);
  notify(room.id, `${player.name} perdeu a conexão. Aguardando reconexão...`);

  startGraceTimer(room.id, playerId, onRemoved);
  return room;
};

const handlePlayerReconnected = (playerId) => {
  const room = findRoomByPlayer(playerId);
  if (!room) return null;

  clearDisconnectTimer(playerId);
  const player = room.game.players.find(p => p.id === playerId);
  const wasDisconnected = !player.connected;
  room.game.setPlayerConnected(playerId, true);
  broadcastState(room.id);
  if (wasDisconnected) notify(room.id, `${player.name} voltou para a partida.`);
  return room;
};

// -------------------------------------------------------------------- ações

const runAction = (roomId, playerId, method, args = []) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;
  if (room.game.gameStatus !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }

  const result = room.game[method](playerId, ...args);
  if (result && result.success) broadcastState(roomId);
  return result;
};

const ACTION_METHODS = [
  'playCard',
  'requestTruco', 'requestRetruco', 'requestVale4',
  'respondToTruco', 'respondToRetruco', 'respondToVale4',
  'requestEnvido', 'requestRealEnvido', 'requestFaltaEnvido', 'respondToEnvido',
  'declareFlor', 'requestContraFlor', 'requestContraFlorResto', 'respondToFlor',
  'respondToMaoDeOnze'
];

const actions = {};
ACTION_METHODS.forEach((method) => {
  actions[method] = (roomId, playerId, ...args) => runAction(roomId, playerId, method, args);
});

const setPlayerReady = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;

  const result = room.game.setPlayerReady(playerId);
  if (result.success) broadcastState(roomId);
  return result;
};

const voteRematch = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;

  const result = room.game.voteRematch(playerId);
  if (result.success) broadcastState(roomId);
  return result;
};

const getGameState = (roomId, viewerId = null) => {
  const room = gameRooms.get(roomId);
  return room ? room.game.getGameState(viewerId) : null;
};

const getPlayerCards = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;
  return room.game.getPlayerCards(playerId);
};

// --------------------------------------------------------------------- chat

const postChat = (roomId, playerId, text) => {
  const room = gameRooms.get(roomId);
  if (!room) return NOT_FOUND;

  const player = room.game.players.find(p => p.id === playerId);
  if (!player) return { success: false, message: 'Jogador não está na sala' };

  const check = validateChatText(text);
  if (!check.ok) return { success: false, message: check.message };

  const now = Date.now();
  const throttleKey = `${roomId}:${playerId}`;
  if (now - (lastChatAt.get(throttleKey) || 0) < config.chatMinIntervalMs) {
    return { success: false, message: 'Devagar: você está enviando mensagens rápido demais' };
  }
  lastChatAt.set(throttleKey, now);

  const message = { id: crypto.randomBytes(6).toString('hex'), playerId, name: player.name, team: player.team, text: check.value, ts: now };
  room.chat.push(message);
  if (room.chat.length > config.chatHistory) room.chat.shift();
  room.lastActivity = now;
  markDirty();

  ioModule.getIO().to(roomId).emit('chat_message', message);
  return { success: true, message };
};

// -------------------------------------------------------------- manutenção

// Remove salas esquecidas: vazias, só com bots, ou sem atividade há muito tempo.
const checkEmptyRooms = () => {
  const now = Date.now();
  let changed = false;

  for (const room of [...gameRooms.values()]) {
    const noHumans = room.game.players.every(p => p.isBot);
    const abandoned = noHumans && now - room.createdAt > config.emptyRoomTtlMs;
    const idle = config.roomIdleMs > 0 && now - room.lastActivity > config.roomIdleMs;
    if (!abandoned && !idle) continue;

    if (idle && !noHumans) {
      try {
        const io = ioModule.getIO();
        io.to(room.id).emit('room_closed', { message: 'A sala foi encerrada por inatividade.' });
        io.in(room.id).socketsLeave(room.id);
      } catch (err) {
        logger.error('Erro ao encerrar sala ociosa:', err);
      }
    }
    removeRoom(room);
    changed = true;
  }

  if (changed && typeof hooks.onRoomsChanged === 'function') hooks.onRoomsChanged();
  return { success: true, roomsCount: gameRooms.size };
};

const emptyRoomsInterval = setInterval(checkEmptyRooms, 60 * 1000);
if (typeof emptyRoomsInterval.unref === 'function') emptyRoomsInterval.unref();

// --------------------------------------------------------------- persistência

const snapshotAll = () => [...gameRooms.values()].map(room => ({
  id: room.id,
  name: room.name,
  maxPlayers: room.maxPlayers,
  createdAt: room.createdAt,
  lastActivity: room.lastActivity,
  passwordHash: room.passwordHash,
  chat: room.chat,
  game: room.game.toSnapshot()
}));

// Recria as salas de um snapshot. Como ninguém está conectado após o restart, cada humano
// ganha um prazo para reconectar; os bots seguem jogando normalmente.
const restoreAll = (rooms) => {
  let restored = 0;
  (rooms || []).forEach((data) => {
    try {
      const game = TrucoGame.fromSnapshot(data.game);
      const room = buildRoom({ ...data, game });
      gameRooms.set(room.id, room);
      game.resumeAfterRestore();
      game.players.filter(p => !p.isBot).forEach(p => startGraceTimer(room.id, p.id));
      scheduleBots(room.id);
      restored += 1;
    } catch (err) {
      logger.error(`Falha ao restaurar a sala ${data && data.id}:`, err);
    }
  });
  return restored;
};

module.exports = {
  gameRooms,
  config,
  hooks,
  RECONNECT_GRACE_MS,
  createRoom,
  getRoom,
  getAllRooms,
  toPublicRoom,
  findRoomByPlayer,
  addPlayerToRoom,
  removePlayerFromRoom,
  addBot,
  removeBot,
  handlePlayerDisconnected,
  handlePlayerReconnected,
  broadcastState,
  notify,
  setPlayerReady,
  voteRematch,
  postChat,
  getGameState,
  getPlayerCards,
  checkEmptyRooms,
  snapshotAll,
  restoreAll,
  consumeDirty,
  ...actions
};
