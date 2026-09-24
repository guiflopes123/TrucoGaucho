// Corrigindo o problema das cartas não aparecendo para o criador da sala
// Modificando o controlador do jogo para garantir que as cartas sejam distribuídas corretamente
//
// CORREÇÕES APLICADAS NESTA AUDITORIA:
//  - setPlayerReady agora sincroniza `room.status` com `room.game.gameStatus`.
//    Antes, essa sobrescrita "esquecia" essa linha e o jogo ficava travado em
//    'waiting' para sempre depois que os dois jogadores ficavam prontos (bug crítico).
//  - Pontuação de Envido/Real Envido/Falta Envido agora passa por
//    `game.awardPoints(...)`, que verifica automaticamente se o time atingiu a
//    pontuação alvo e encerra a partida (antes, o jogo nunca terminava por essa via).
//  - Encoding de strings corrigido (havia caracteres corrompidos em várias mensagens).
//  - console.log trocado por logger.debug (silenciável em produção).

const gameController = require('../controllers/gameController');
const { TrucoGame } = require('../models/TrucoGame');
const ioModule = require('../socket/io');
const logger = require('../utils/logger');

// Função para verificar se um jogador está em alguma sala
const checkPlayerInRooms = (socketId) => {
  logger.debug('Verificando jogador desconectado:', socketId);
  
  for (const [roomId, room] of gameController.gameRooms.entries()) {
    const player = room.players.find(p => p.id === socketId);
    if (player) {
      logger.debug('Jogador encontrado na sala:', roomId);
      
      // Marcar jogador como desconectado
      player.connected = false;
      player.lastDisconnect = Date.now();
      
      // Notificar outros jogadores
      const io = ioModule.getIO();
      io.to(roomId).emit('player_disconnected', {
        playerId: socketId,
        playerName: player.name
      });
      
      // Configurar timeout para remoção do jogador
      setTimeout(() => {
        const currentRoom = gameController.gameRooms.get(roomId);
        if (currentRoom) {
          const currentPlayer = currentRoom.players.find(p => p.id === socketId);
          if (currentPlayer && !currentPlayer.connected) {
            logger.debug('Removendo jogador por timeout de reconexão:', socketId);
            gameController.removePlayerFromRoom(roomId, socketId);
          }
        }
      }, 60000); // Aumentado para 60 segundos
      
      break;
    }
  }
};

// Função original para adicionar jogador à sala
const originalAddPlayerToRoom = gameController.addPlayerToRoom;

// Sobrescrevendo a função para garantir que as cartas sejam distribuídas corretamente
gameController.addPlayerToRoom = function(roomId, playerId, playerName) {
  const result = originalAddPlayerToRoom.call(this, roomId, playerId, playerName);
  
  // Se o jogador foi adicionado com sucesso e é o criador da sala
  if (result.success && result.room.players.length === 1) {
    // Garantir que o estado do jogo seja atualizado
    const room = gameController.gameRooms.get(roomId);
    if (room) {
      // Marcar o jogador como não pronto por padrão
      room.game.players.forEach(player => {
        player.isReady = false;
      });
      
      // Registrar o listener de mudança de estado assíncrona (ver item 3 do
      // relatório de bugs): sempre que o TrucoGame mudar de estado dentro de um
      // setTimeout interno (limpar mesa após rodada, distribuir próxima mão),
      // ele chama esse callback para retransmitir o novo estado aos clientes.
      room.game.onStateChange = (gameState) => {
        try {
          const io = ioModule.getIO();
          io.to(roomId).emit('game_state_updated', { gameState });
        } catch (err) {
          logger.error('[onStateChange] Erro ao emitir estado do jogo:', err);
        }
      };
      
      // Atualizar o estado do jogo
      room.game.updateGameState();
    }
  }
  
  return result;
};

// Adicionando função para marcar jogador como pronto
gameController.setPlayerReady = function(roomId, playerId) {
  const room = gameController.gameRooms.get(roomId);
  if (!room) {
    return { error: 'Sala não encontrada' };
  }

  const result = room.game.setPlayerReady(playerId);
  if (result.error) {
    return result;
  }

  // CORREÇÃO CRÍTICA: sincronizar `room.status` com o status real do jogo. Sem essa
  // linha, `room.status` ficava para sempre em 'waiting' mesmo depois do jogo
  // começar (`room.game.gameStatus === 'playing'`), e toda ação subsequente
  // (jogar carta, pedir truco, envido, flor...) era rejeitada com
  // "O jogo não está em andamento", mesmo com as cartas já na tela.
  room.status = room.game.gameStatus;

  // Atualiza o estado do jogo para todos os jogadores
  const io = ioModule.getIO();
  io.to(roomId).emit('game_state_updated', { gameState: room.game.getGameState() });

  return { success: true };
};

// Adicionando função para verificar salas vazias e removê-las
gameController.checkEmptyRooms = function() {
  for (const [roomId, room] of gameController.gameRooms.entries()) {
    if (room.players.length === 0) {
      gameController.gameRooms.delete(roomId);
      logger.debug(`Sala vazia removida: ${roomId}`);
    }
  }
  
  return { success: true, roomsCount: gameController.gameRooms.size };
};

// Configurar verificação periódica de salas vazias (a cada 5 minutos)
const emptyRoomsInterval = setInterval(() => {
  gameController.checkEmptyRooms();
}, 5 * 60 * 1000);
// Não impedir o processo de encerrar (útil em testes/scripts) por causa deste timer.
if (typeof emptyRoomsInterval.unref === 'function') {
  emptyRoomsInterval.unref();
}

// Adicionar as funções estendidas ao gameController
gameController.checkPlayerInRooms = checkPlayerInRooms;

// Regras de Envido (Gaudério)
gameController.requestEnvido = function(roomId, playerId) {
  const room = gameController.gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  if (room.status !== 'playing') return { success: false, message: 'O jogo não está em andamento' };

  const game = room.game;
  const player = game.players.find(p => p.id === playerId);
  if (!player) return { success: false, message: 'Jogador não encontrado' };

  if (game.envidoState) return { success: false, message: 'Já existe um pedido de Envido em andamento' };

  const firstRoundActive = !game.roundWinners || game.roundWinners.length === 0;
  const hasPlayedThisRound = game.playedCards.some(pc => pc.playerId === playerId);
  if (!firstRoundActive) return { success: false, message: 'Envido só pode ser pedido na primeira rodada' };
  if (hasPlayedThisRound) return { success: false, message: 'Envido só pode ser pedido antes de jogar carta' };
  if (game.players.length === 4) {
    const playsThisRound = game.playedCards.length;
    if (!(playsThisRound === 2 || playsThisRound === 3)) return { success: false, message: 'No 4x4, apenas os dois últimos podem pedir Envido' };
  }
  if (!player.isCurrentPlayer) return { success: false, message: 'Não é a vez do jogador' };

  game.envidoState = {
    level: 'envido',
    value: 2,
    team: player.team,
    requestedBy: playerId,
    accepted: false,
    waitingResponse: true,
    respondingTeam: player.team === 1 ? 2 : 1,
    previousLevel: null
  };
  return { success: true, envidoState: game.envidoState, waitingResponse: true, respondingTeam: game.envidoState.respondingTeam };
};

gameController.requestRealEnvido = function(roomId, playerId) {
  const room = gameController.gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  if (room.status !== 'playing') return { success: false, message: 'O jogo não está em andamento' };

  const game = room.game;
  const player = game.players.find(p => p.id === playerId);
  if (!player) return { success: false, message: 'Jogador não encontrado' };

  const firstRoundActive = !game.roundWinners || game.roundWinners.length === 0;
  const hasPlayedThisRound = game.playedCards.some(pc => pc.playerId === playerId);

  if (!game.envidoState) {
    if (!firstRoundActive) return { success: false, message: 'Real Envido só pode ser pedido na primeira rodada' };
    if (hasPlayedThisRound) return { success: false, message: 'Real Envido só pode ser pedido antes de jogar carta' };
    if (game.players.length === 4) {
      const playsThisRound = game.playedCards.length;
      if (!(playsThisRound === 2 || playsThisRound === 3)) return { success: false, message: 'No 4x4, apenas os dois últimos podem pedir Envido' };
    }
    if (!player.isCurrentPlayer) return { success: false, message: 'Não é a vez do jogador' };

    game.envidoState = {
      level: 'real_envido',
      value: 5,
      team: player.team,
      requestedBy: playerId,
      accepted: false,
      waitingResponse: true,
      respondingTeam: player.team === 1 ? 2 : 1,
      previousLevel: null
    };
    return { success: true, envidoState: game.envidoState, waitingResponse: true, respondingTeam: game.envidoState.respondingTeam };
  }

  if (!game.envidoState.waitingResponse) return { success: false, message: 'Não há pedido de Envido pendente' };
  if (player.team !== game.envidoState.respondingTeam) return { success: false, message: 'Apenas o time respondente pode pedir Real Envido' };

  game.envidoState = {
    level: 'real_envido',
    value: 5,
    team: player.team,
    requestedBy: playerId,
    accepted: false,
    waitingResponse: true,
    respondingTeam: player.team === 1 ? 2 : 1,
    previousLevel: 'envido'
  };
  return { success: true, envidoState: game.envidoState, waitingResponse: true, respondingTeam: game.envidoState.respondingTeam };
};

gameController.requestFaltaEnvido = function(roomId, playerId) {
  const room = gameController.gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  if (room.status !== 'playing') return { success: false, message: 'O jogo não está em andamento' };

  const game = room.game;
  const player = game.players.find(p => p.id === playerId);
  if (!player) return { success: false, message: 'Jogador não encontrado' };

  const firstRoundActive = !game.roundWinners || game.roundWinners.length === 0;
  const hasPlayedThisRound = game.playedCards.some(pc => pc.playerId === playerId);

  if (!game.envidoState) {
    if (!firstRoundActive) return { success: false, message: 'Falta Envido só pode ser pedido na primeira rodada' };
    if (hasPlayedThisRound) return { success: false, message: 'Falta Envido só pode ser pedido antes de jogar carta' };
    if (game.players.length === 4) {
      const playsThisRound = game.playedCards.length;
      if (!(playsThisRound === 2 || playsThisRound === 3)) return { success: false, message: 'No 4x4, apenas os dois últimos podem pedir Envido' };
    }
    if (!player.isCurrentPlayer) return { success: false, message: 'Não é a vez do jogador' };

    game.envidoState = {
      level: 'falta_envido',
      value: 'falta',
      team: player.team,
      requestedBy: playerId,
      accepted: false,
      waitingResponse: true,
      respondingTeam: player.team === 1 ? 2 : 1,
      previousLevel: null
    };
    return { success: true, envidoState: game.envidoState, waitingResponse: true, respondingTeam: game.envidoState.respondingTeam };
  }

  if (!game.envidoState.waitingResponse) return { success: false, message: 'Não há pedido de Envido pendente' };
  if (player.team !== game.envidoState.respondingTeam) return { success: false, message: 'Apenas o time respondente pode pedir Falta Envido' };

  game.envidoState = {
    level: 'falta_envido',
    value: 'falta',
    team: player.team,
    requestedBy: playerId,
    accepted: false,
    waitingResponse: true,
    respondingTeam: player.team === 1 ? 2 : 1,
    previousLevel: game.envidoState.level || null
  };
  return { success: true, envidoState: game.envidoState, waitingResponse: true, respondingTeam: game.envidoState.respondingTeam };
};

gameController.respondToEnvido = function(roomId, playerId, accept) {
  const room = gameController.gameRooms.get(roomId);
  if (!room) return { success: false, message: 'Sala não encontrada' };
  if (room.status !== 'playing') return { success: false, message: 'O jogo não está em andamento' };

  const game = room.game;
  const state = game.envidoState;
  if (!state || !state.waitingResponse) return { success: false, message: 'Não há pedido de Envido pendente' };

  const player = game.players.find(p => p.id === playerId);
  if (!player || player.team !== state.respondingTeam) return { success: false, message: 'Jogador não autorizado a responder' };

  const team1Envido = game.players.filter(p => p.team === 1).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0);
  const team2Envido = game.players.filter(p => p.team === 2).reduce((max, p) => Math.max(max, p.calculateEnvido()), 0);

  let winningTeam = null;
  let pointsAwarded = 0;

  if (accept) {
    winningTeam = team1Envido > team2Envido ? 1 : 2;
    if (state.level === 'envido') pointsAwarded = 2;
    else if (state.level === 'real_envido') pointsAwarded = 5;
    else if (state.level === 'falta_envido') {
      const winnerTeamObj = game.teams[winningTeam - 1];
      pointsAwarded = Math.max(0, game.targetScore - winnerTeamObj.score);
    }
    // CORREÇÃO: usar awardPoints (verifica automaticamente se o jogo terminou),
    // em vez de team.addPoints direto, que nunca checava a pontuação alvo.
    if (pointsAwarded > 0) game.awardPoints(game.teams[winningTeam - 1], pointsAwarded);
  } else {
    const requestingTeamId = game.teams.find(t => t.players.some(p => p.id === state.requestedBy))?.id || state.team;
    if (state.level === 'envido') pointsAwarded = 1;
    else if (state.level === 'real_envido') pointsAwarded = state.previousLevel === 'envido' ? 2 : 1;
    else if (state.level === 'falta_envido') pointsAwarded = state.previousLevel === 'real_envido' ? 5 : 1;
    if (pointsAwarded > 0) game.awardPoints(game.teams[requestingTeamId - 1], pointsAwarded);
  }

  game.envidoState = null;

  return {
    success: true,
    accepted: accept,
    team1Envido,
    team2Envido,
    winningTeam: accept ? winningTeam : null,
    gameStatus: game.gameStatus,
    gameWinner: game.gameWinner
  };
};

module.exports = gameController;
