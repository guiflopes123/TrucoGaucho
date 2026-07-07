const { TrucoGame } = require('../models/TrucoGame');
const ioModule = require('../socket/io');

// Armazenar as salas de jogo
const gameRooms = new Map();

// Criar uma nova sala
const createRoom = (roomName, maxPlayers) => {
  const roomId = `room_${Date.now()}`;
  const room = {
    id: roomId,
    name: roomName,
    maxPlayers: maxPlayers,
    players: [],
    game: new TrucoGame(roomId, maxPlayers),
    status: 'waiting' // waiting, playing, finished
  };
  
  gameRooms.set(roomId, room);
  return room;
};

// Obter todas as salas
const getAllRooms = () => {
  return Array.from(gameRooms.values()).map(room => ({
    id: room.id,
    name: room.name,
    players: room.players.length,
    maxPlayers: room.maxPlayers,
    status: room.status
  }));
};

// Obter uma sala específica
const getRoom = (roomId) => {
  return gameRooms.get(roomId);
};

// Adicionar jogador a uma sala
const addPlayerToRoom = (roomId, playerId, playerName) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.players.length >= room.maxPlayers) {
    return { success: false, message: 'Sala cheia' };
  }
  
  // Verificar se o jogador já está na sala
  if (room.players.some(p => p.id === playerId)) {
    return { success: false, message: 'Jogador já está na sala' };
  }
  
  // Adicionar jogador à sala
  room.players.push({ 
    id: playerId, 
    name: playerName, 
    isReady: false,
    connected: true,
    socketId: playerId
  });
  
  // Adicionar jogador ao jogo
  room.game.addPlayer(playerId, playerName);
  
  // Retornar o estado inicial do jogo junto com a sala
  return { 
    success: true, 
    room,
    gameState: {
      status: room.status,
      players: room.players,
      teams: room.game.teams.map(team => ({
        id: team.id,
        name: team.name,
        score: team.score || 0,
        roundsWon: team.roundsWon || 0
      }))
    }
  };
};

// Remover jogador de uma sala
const removePlayerFromRoom = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  // Remover jogador do jogo primeiro
  const gameResult = room.game.removePlayer(playerId);
  if (!gameResult.success) {
    return { success: false, message: 'Erro ao remover jogador do jogo' };
  }
  
  // Se a sala ficou vazia após remover o jogador do jogo
  if (gameResult.roomEmpty) {
    gameRooms.delete(roomId);
    return { success: true, roomDeleted: true };
  }
  
  // Remover jogador da sala
  const playerIndex = room.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) {
    return { success: false, message: 'Jogador não está na sala' };
  }
  
  room.players.splice(playerIndex, 1);

  // Sincronizar o status da sala com o estado real do jogo (o modelo já decide
  // se o jogo continua com os jogadores restantes ou volta para "waiting")
  room.status = room.game.gameStatus;

  return { success: true, room };
};

// Remapear o socket de um jogador (usado quando ele reconecta com um novo socket.id)
const reassignPlayerSocket = (roomId, oldPlayerId, newPlayerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };

  const roomPlayer = room.players.find(p => p.id === oldPlayerId);
  if (!roomPlayer) {
    return { success: false, message: 'Jogador não encontrado nesta sala' };
  }

  const gameResult = room.game.reassignPlayerId(oldPlayerId, newPlayerId);
  if (!gameResult.success) {
    return gameResult;
  }

  roomPlayer.id = newPlayerId;
  roomPlayer.socketId = newPlayerId;
  roomPlayer.connected = true;

  return { success: true, room };
};

// Emitir o estado do jogo individualmente para cada jogador da sala,
// ocultando a mão dos demais jogadores (evita vazamento de cartas)
const broadcastGameState = (roomId) => {
  const room = gameRooms.get(roomId);
  if (!room) return;

  // Manter o status da sala sincronizado com o estado real do jogo
  room.status = room.game.gameStatus;

  const io = ioModule.getIO();
  room.game.players.forEach(player => {
    io.to(player.id).emit('game_state_updated', { gameState: room.game.getGameState(player.id) });
  });
};

// Jogar uma carta
const playCard = (roomId, playerId, card) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };

  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Jogar a carta no jogo
  const result = room.game.playCard(playerId, card);

  if (result.success) {
    // Emitir o estado atual para cada jogador (mão dos outros jogadores fica oculta)
    broadcastGameState(roomId);

    // Se todas as cartas foram jogadas, aguardar o estado atualizado após o delay
    if (room.game.playedCards.length === room.game.players.length) {
      setTimeout(() => {
        broadcastGameState(roomId);
      }, 3000);
    }
  }

  return result;
};

// Pedir Truco
const requestTruco = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Truco no jogo
  const result = room.game.requestTruco(playerId);

  if (result.success) {
    broadcastGameState(roomId);
    ioModule.getIO().to(roomId).emit('truco_requested', {
        playerId: playerId,
        trucoState: result.trucoState
      });
  }

  return result;
};

// Pedir Retruco
const requestRetruco = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Retruco no jogo
  const result = room.game.requestRetruco(playerId);

  if (result.success) {
    broadcastGameState(roomId);
    ioModule.getIO().to(roomId).emit('retruco_requested', {
        playerId: playerId,
        retrucoState: result.retrucoState
      });
  }

  return result;
};

// Pedir Vale 4
const requestVale4 = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Vale 4 no jogo
  const result = room.game.requestVale4(playerId);

  if (result.success) {
    broadcastGameState(roomId);
    ioModule.getIO().to(roomId).emit('vale4_requested', {
        playerId: playerId,
        vale4State: result.vale4State
      });
  }

  return result;
};

// Responder ao Truco
const respondToTruco = (roomId, playerId, accept) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Responder ao Truco no jogo
  const result = room.game.respondToTruco(playerId, accept);

  if (result.success) {
    broadcastGameState(roomId);
  }

  // Verificar se o jogo terminou
  if (room.game.gameStatus === 'finished') {
    room.status = 'finished';
  }
  
  return result;
};

// Responder ao Retruco
const respondToRetruco = (roomId, playerId, accept) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Responder ao Retruco no jogo
  const result = room.game.respondToRetruco(playerId, accept);

  if (result.success) {
    broadcastGameState(roomId);
  }

  // Verificar se o jogo terminou
  if (room.game.gameStatus === 'finished') {
    room.status = 'finished';
  }
  
  return result;
};

// Responder ao Vale 4
const respondToVale4 = (roomId, playerId, accept) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Responder ao Vale 4 no jogo
  const result = room.game.respondToVale4(playerId, accept);

  if (result.success) {
    broadcastGameState(roomId);
  }

  // Verificar se o jogo terminou
  if (room.game.gameStatus === 'finished') {
    room.status = 'finished';
  }
  
  return result;
};

// Pedir Envido
const requestEnvido = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Envido no jogo
  return room.game.requestEnvido(playerId);
};

// Pedir Real Envido
const requestRealEnvido = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Real Envido no jogo
  return room.game.requestRealEnvido(playerId);
};

// Pedir Falta Envido
const requestFaltaEnvido = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Falta Envido no jogo
  return room.game.requestFaltaEnvido(playerId);
};

// Responder ao Envido
const respondToEnvido = (roomId, playerId, accept) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Responder ao Envido no jogo
  const result = room.game.respondToEnvido(playerId, accept);
  
  // Verificar se o jogo terminou
  if (result.gameOver) {
    room.status = 'finished';
  }
  
  return result;
};

// Cantar Flor
const declareFlor = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Cantar Flor no jogo
  const result = room.game.declareFlor(playerId);
  
  // Verificar se o jogo terminou
  if (result.gameOver) {
    room.status = 'finished';
  }
  
  return result;
};

// Pedir Contra-Flor
const requestContraFlor = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Contra-Flor no jogo
  return room.game.requestContraFlor(playerId);
};

// Pedir Contra-Flor e o Resto
const requestContraFlorResto = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Pedir Contra-Flor e o Resto no jogo
  return room.game.requestContraFlorResto(playerId);
};

// Responder à Flor
const respondToFlor = (roomId, playerId, accept) => {
  const room = gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  
  if (room.status !== 'playing') {
    return { success: false, message: 'O jogo não está em andamento' };
  }
  
  // Responder à Flor no jogo
  const result = room.game.respondToFlor(playerId, accept);
  
  // Verificar se o jogo terminou
  if (result.gameOver) {
    room.status = 'finished';
  }
  
  return result;
};

// Obter o estado do jogo (viewerId opcional: oculta a mão dos demais jogadores)
const getGameState = (roomId, viewerId) => {
  const room = gameRooms.get(roomId);
  if (!room) return null;

  // Garantir que o estado da sala está sincronizado com o estado do jogo
  room.status = room.game.gameStatus;

  return room.game.getGameState(viewerId);
};

// Obter as cartas de um jogador
const getPlayerCards = (roomId, playerId) => {
  console.log('Obtendo cartas do jogador:', { roomId, playerId });
  const room = gameRooms.get(roomId);
  if (!room) {
    console.log('Sala não encontrada');
    return { success: false, message: 'Sala não encontrada' };
  }
  
  const result = room.game.getPlayerCards(playerId);
  console.log('Resultado do getPlayerCards:', result);
  
  if (!result.success) {
    return result;
  }
  
  return {
    success: true,
    cards: result.cards
  };
};

// Marcar jogador como pronto
const setPlayerReady = (roomId, playerId) => {
  const room = gameRooms.get(roomId);
  if (!room) {
    return { error: 'Sala não encontrada' };
  }

  const result = room.game.setPlayerReady(playerId);
  if (result.error) {
    return result;
  }

  // Atualizar o estado da sala com base no estado do jogo
  room.status = room.game.gameStatus;

  // Atualiza o estado do jogo para todos os jogadores
  const gameState = room.game.getGameState();
  return { success: true, gameState };
};

const endHand = (roomId, winningTeamId) => {
  const room = gameRooms.get(roomId);
  if (!room) return;

  const winningTeam = room.game.teams.find(team => team.id === winningTeamId);
  if (!winningTeam) return;

  const gameState = room.game.endHand(winningTeam);
  
  // Se o jogo terminou, enviar o estado final
  if (gameState.status === 'finished') {
    ioModule.getIO().to(roomId).emit('gameState', gameState);
    return;
  }

  // O estado atualizado será enviado após o timeout no endHand
  // Não precisamos enviar o estado aqui
};

module.exports = {
  gameRooms,
  createRoom,
  getAllRooms,
  getRoom,
  addPlayerToRoom,
  removePlayerFromRoom,
  reassignPlayerSocket,
  broadcastGameState,
  playCard,
  requestTruco,
  requestRetruco,
  requestVale4,
  respondToTruco,
  respondToRetruco,
  respondToVale4,
  requestEnvido,
  requestRealEnvido,
  requestFaltaEnvido,
  respondToEnvido,
  declareFlor,
  requestContraFlor,
  requestContraFlorResto,
  respondToFlor,
  getGameState,
  getPlayerCards,
  setPlayerReady,
  endHand
};
