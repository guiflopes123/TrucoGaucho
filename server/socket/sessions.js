const crypto = require('crypto');
const { playerChannel } = require('./io');

// O cliente guarda um token secreto (sessionStorage) e o envia no handshake. O servidor
// converte o token em um playerId público e estável: é ele que identifica o jogador na
// partida, então F5 ou uma queda de rede não faz o jogador perder o lugar na sala.
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{16,100}$/;

const sessionsByToken = new Map();
const sessionsByPlayer = new Map();

const register = (socket) => {
  const rawToken = socket.handshake && socket.handshake.auth && socket.handshake.auth.token;
  const token = typeof rawToken === 'string' && TOKEN_PATTERN.test(rawToken)
    ? rawToken
    : crypto.randomBytes(24).toString('hex');

  let session = sessionsByToken.get(token);
  if (!session) {
    session = { token, playerId: crypto.randomUUID(), sockets: new Set() };
    sessionsByToken.set(token, session);
    sessionsByPlayer.set(session.playerId, session);
  }

  const previousSockets = [...session.sockets];
  session.sockets.add(socket.id);
  socket.data.playerId = session.playerId;
  socket.join(playerChannel(session.playerId));

  return { session, previousSockets };
};

// Remove o socket da sessão e informa quantas conexões do jogador continuam abertas.
const release = (socket) => {
  const session = sessionsByPlayer.get(socket.data.playerId);
  if (!session) return { playerId: null, remaining: 0 };
  session.sockets.delete(socket.id);
  return { playerId: session.playerId, remaining: session.sockets.size };
};

// Descarta a sessão quando o jogador não tem mais conexões nem sala.
const forget = (playerId) => {
  const session = sessionsByPlayer.get(playerId);
  if (session && session.sockets.size === 0) {
    sessionsByToken.delete(session.token);
    sessionsByPlayer.delete(playerId);
  }
};

const size = () => sessionsByToken.size;

// Sessões a persistir (só as de jogadores que ainda estão em alguma sala).
const snapshot = (shouldKeep = () => true) => [...sessionsByToken.values()]
  .filter(session => shouldKeep(session.playerId))
  .map(session => ({ token: session.token, playerId: session.playerId }));

const restore = (list) => {
  (list || []).forEach((item) => {
    if (!item || !TOKEN_PATTERN.test(item.token) || typeof item.playerId !== 'string') return;
    const session = { token: item.token, playerId: item.playerId, sockets: new Set() };
    sessionsByToken.set(session.token, session);
    sessionsByPlayer.set(session.playerId, session);
  });
};

module.exports = { register, release, forget, size, snapshot, restore };
