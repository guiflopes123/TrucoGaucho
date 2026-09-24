const gameController = require('../controllers/gameController');
const sessions = require('./sessions');
const logger = require('../utils/logger');
const { NOTICES } = require('../game/notices');
const { validatePlayerName, validatePassword, validateRoomParams } = require('../utils/validation');

const RATE_WINDOW_MS = 5000;
const RATE_MAX_EVENTS = 80;
const ROOMS_BROADCAST_INTERVAL_MS = 250;
const maxConnectionsPerIp = () => {
  const value = Number(process.env.MAX_CONNECTIONS_PER_IP);
  return Number.isFinite(value) && value > 0 ? value : 20;
};

const nameOf = (room, playerId) => {
  const player = room.game.players.find(p => p.id === playerId);
  return player ? player.name : 'Jogador';
};

// Eventos de jogo: nome do evento -> método do modelo e como ler os argumentos do payload.
const GAME_EVENTS = {
  play_card: { action: 'playCard', args: (d) => [d.card] },

  truco: { action: 'requestTruco' },
  retruco: { action: 'requestRetruco' },
  vale4: { action: 'requestVale4' },
  truco_response: { action: 'respondToTruco', args: (d) => [d.accept === true] },
  retruco_response: { action: 'respondToRetruco', args: (d) => [d.accept === true] },
  vale4_response: { action: 'respondToVale4', args: (d) => [d.accept === true] },

  envido: { action: 'requestEnvido' },
  real_envido: { action: 'requestRealEnvido' },
  falta_envido: { action: 'requestFaltaEnvido' },
  envido_response: { action: 'respondToEnvido', args: (d) => [d.accept === true] },

  flor: { action: 'declareFlor' },
  contra_flor: { action: 'requestContraFlor' },
  contra_flor_resto: { action: 'requestContraFlorResto' },
  flor_response: { action: 'respondToFlor', args: (d) => [d.accept === true] },

  onze_response: { action: 'respondToMaoDeOnze', args: (d) => [d.play === true] }
};

// IP do cliente; só confia em X-Forwarded-For se TRUST_PROXY=true (servidor atrás de proxy).
const getClientIp = (socket) => {
  if (process.env.TRUST_PROXY === 'true') {
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address || 'unknown';
};

const registerHandlers = (io) => {
  const connectionsByIp = new Map();
  let roomsTimer = null;

  // Agrupa várias mudanças seguidas em um único envio da lista de salas.
  const broadcastRooms = () => {
    if (roomsTimer) return;
    roomsTimer = setTimeout(() => {
      roomsTimer = null;
      io.emit('rooms_updated', { rooms: gameController.getAllRooms() });
    }, ROOMS_BROADCAST_INTERVAL_MS);
    if (typeof roomsTimer.unref === 'function') roomsTimer.unref();
  };
  gameController.hooks.onRoomsChanged = broadcastRooms;

  const roomPayload = (room, gameState) => ({
    room: gameController.toPublicRoom(room),
    gameState,
    chat: room.chat
  });

  io.on('connection', (socket) => {
    const ip = getClientIp(socket);
    const open = connectionsByIp.get(ip) || 0;
    if (open >= maxConnectionsPerIp()) {
      socket.emit('error', { message: 'Muitas conexões deste endereço. Feche outras abas e tente novamente.' });
      socket.disconnect(true);
      return;
    }
    connectionsByIp.set(ip, open + 1);

    const { session, previousSockets } = sessions.register(socket);
    const playerId = session.playerId;

    // Uma nova aba/conexão com o mesmo token assume a sessão; as anteriores são encerradas.
    previousSockets.forEach((socketId) => {
      const older = io.sockets.sockets.get(socketId);
      if (older) {
        older.emit('session_replaced');
        older.disconnect(true);
      }
    });

    const room = gameController.findRoomByPlayer(playerId);
    socket.emit('session', { playerId, roomId: room ? room.id : null });
    if (room) {
      socket.join(room.id);
      gameController.handlePlayerReconnected(playerId);
      socket.emit('room_rejoined', roomPayload(room, room.game.getGameState(playerId)));
    }

    const bucket = { count: 0, resetAt: 0 };
    const withinRateLimit = () => {
      const now = Date.now();
      if (now > bucket.resetAt) {
        bucket.count = 0;
        bucket.resetAt = now + RATE_WINDOW_MS;
      }
      bucket.count += 1;
      return bucket.count <= RATE_MAX_EVENTS;
    };

    // Registra um evento com proteção contra exceções, limite de frequência e ack opcional.
    const on = (eventName, handler) => {
      socket.on(eventName, (data, ack) => {
        if (typeof data === 'function') {
          ack = data;
          data = {};
        }
        const respond = typeof ack === 'function' ? ack : () => {};
        const fail = (message, extra = {}) => {
          socket.emit('error', { message });
          respond({ success: false, message, ...extra });
        };

        if (!withinRateLimit()) return fail('Muitas requisições. Aguarde um instante.');

        try {
          handler(data && typeof data === 'object' ? data : {}, respond, fail);
        } catch (err) {
          logger.error(`[socket:${eventName}] Erro não tratado:`, err);
          fail('Ocorreu um erro inesperado no servidor. Tente novamente.');
        }
      });
    };

    on('get_rooms', (data, respond) => {
      const rooms = gameController.getAllRooms();
      socket.emit('rooms_list', { rooms });
      respond({ success: true, rooms });
    });

    on('create_room', (data, respond, fail) => {
      if (gameController.findRoomByPlayer(playerId)) return fail('Você já está em uma sala');

      const nameCheck = validatePlayerName(data.playerName);
      if (!nameCheck.ok) return fail(nameCheck.message);
      const roomCheck = validateRoomParams(data.roomName, data.maxPlayers);
      if (!roomCheck.ok) return fail(roomCheck.message);
      const passwordCheck = validatePassword(data.password);
      if (!passwordCheck.ok) return fail(passwordCheck.message);

      let created;
      try {
        created = gameController.createRoom(roomCheck.name, roomCheck.maxPlayers, {
          password: passwordCheck.value,
          creatorIp: ip
        });
      } catch (err) {
        return fail(err.message);
      }

      const result = gameController.addPlayerToRoom(created.id, playerId, nameCheck.value, { skipPassword: true });
      if (!result.success) {
        gameController.removePlayerFromRoom(created.id, playerId);
        return fail(result.message);
      }

      socket.join(created.id);
      const payload = roomPayload(created, result.gameState);
      socket.emit('room_created', payload);
      respond({ success: true, ...payload });
      broadcastRooms();
    });

    on('join_room', (data, respond, fail) => {
      const roomId = typeof data.roomId === 'string' ? data.roomId : '';
      const current = gameController.findRoomByPlayer(playerId);
      if (current && current.id !== roomId) return fail('Você já está em outra sala');

      let playerName;
      if (!current) {
        const nameCheck = validatePlayerName(data.playerName);
        if (!nameCheck.ok) return fail(nameCheck.message);
        playerName = nameCheck.value;
      }

      const result = gameController.addPlayerToRoom(roomId, playerId, playerName, {
        password: typeof data.password === 'string' ? data.password : undefined
      });
      if (!result.success) return fail(result.message, { needsPassword: Boolean(result.needsPassword) });

      socket.join(roomId);
      const payload = roomPayload(result.room, result.gameState);
      socket.emit('room_joined', payload);
      respond({ success: true, ...payload });

      gameController.broadcastState(roomId);
      if (!current) {
        gameController.notify(roomId, `${nameOf(result.room, playerId)} entrou na sala.`);
        broadcastRooms();
      }
    });

    on('leave_room', (data, respond) => {
      const current = gameController.findRoomByPlayer(playerId);
      if (!current) {
        socket.emit('room_left');
        return respond({ success: true });
      }

      const roomId = current.id;
      const name = nameOf(current, playerId);
      const result = gameController.removePlayerFromRoom(roomId, playerId);

      socket.leave(roomId);
      socket.emit('room_left');
      respond({ success: true });

      if (result.success && !result.roomDeleted) {
        gameController.broadcastState(roomId);
        gameController.notify(roomId, `${name} saiu da sala.`);
      }
      broadcastRooms();
    });

    on('player_ready', (data, respond, fail) => {
      const current = gameController.findRoomByPlayer(playerId);
      if (!current) return fail('Você não está em uma sala');

      const wasWaiting = current.status === 'waiting';
      const result = gameController.setPlayerReady(current.id, playerId);
      if (!result.success) return fail(result.message);

      respond({ success: true });
      if (wasWaiting && current.status !== 'waiting') {
        gameController.notify(current.id, 'A partida começou! Boa sorte.');
        broadcastRooms();
      }
    });

    on('add_bot', (data, respond, fail) => {
      const current = gameController.findRoomByPlayer(playerId);
      if (!current) return fail('Você não está em uma sala');

      const result = gameController.addBot(current.id);
      if (!result.success) return fail(result.message);

      respond({ success: true });
      gameController.broadcastState(current.id);
      gameController.notify(current.id, `${result.bot.name} entrou na sala.`);
      if (current.status !== 'waiting') gameController.notify(current.id, 'A partida começou! Boa sorte.');
      broadcastRooms();
    });

    on('remove_bot', (data, respond, fail) => {
      const current = gameController.findRoomByPlayer(playerId);
      if (!current) return fail('Você não está em uma sala');

      const result = gameController.removeBot(current.id);
      if (!result.success) return fail(result.message);

      respond({ success: true });
      gameController.broadcastState(current.id);
      gameController.notify(current.id, `${result.bot.name} saiu da sala.`);
      broadcastRooms();
    });

    on('play_again', (data, respond, fail) => {
      const current = gameController.findRoomByPlayer(playerId);
      if (!current) return fail('Você não está em uma sala');

      const result = gameController.voteRematch(current.id, playerId);
      if (!result.success) return fail(result.message);

      respond({ success: true });
      gameController.notify(
        current.id,
        result.restarted
          ? 'Nova partida! Marquem "Pronto" para começar.'
          : `${nameOf(current, playerId)} quer jogar novamente.`
      );
      if (result.restarted) broadcastRooms();
    });

    on('chat', (data, respond, fail) => {
      const current = gameController.findRoomByPlayer(playerId);
      if (!current) return fail('Você não está em uma sala');

      const result = gameController.postChat(current.id, playerId, data.text);
      if (!result.success) return fail(result.message);
      respond({ success: true });
    });

    Object.entries(GAME_EVENTS).forEach(([eventName, definition]) => {
      on(eventName, (data, respond, fail) => {
        const current = gameController.findRoomByPlayer(playerId);
        if (!current) return fail('Você não está em uma sala');

        const args = definition.args ? definition.args(data) : [];
        const result = gameController[definition.action](current.id, playerId, ...args);
        if (!result.success) return fail(result.message);

        const notice = NOTICES[definition.action];
        if (notice) gameController.notify(current.id, notice(nameOf(current, playerId), result, current));
        respond({ success: true });
      });
    });

    socket.on('disconnect', () => {
      try {
        const remainingForIp = (connectionsByIp.get(ip) || 1) - 1;
        if (remainingForIp <= 0) connectionsByIp.delete(ip);
        else connectionsByIp.set(ip, remainingForIp);

        const { playerId: releasedId, remaining } = sessions.release(socket);
        if (!releasedId || remaining > 0) return;

        const roomOfPlayer = gameController.handlePlayerDisconnected(releasedId, (removedId) => {
          sessions.forget(removedId);
          broadcastRooms();
        });
        if (!roomOfPlayer) sessions.forget(releasedId);
      } catch (err) {
        logger.error('[socket:disconnect] Erro não tratado:', err);
      }
    });
  });
};

module.exports = { registerHandlers, GAME_EVENTS };
