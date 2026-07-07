// Corrigindo o problema das cartas não aparecendo para o criador da sala
// Modificando o controlador do jogo para garantir que as cartas sejam distribuídas corretamente

const gameController = require('../controllers/gameController');
const { TrucoGame } = require('../models/TrucoGame');
const ioModule = require('../socket/io');

// Timers de remoção pendentes por jogador desconectado (permite cancelar se ele reconectar)
const pendingRemovals = new Map();

// Cancela a remoção agendada de um jogador que reconectou a tempo
const cancelPendingRemoval = (socketId) => {
  const timeoutHandle = pendingRemovals.get(socketId);
  if (timeoutHandle) {
    clearTimeout(timeoutHandle);
    pendingRemovals.delete(socketId);
  }
};

// Função para verificar se um jogador está em alguma sala
const checkPlayerInRooms = (socketId) => {
  console.log('Verificando jogador desconectado:', socketId);

  for (const [roomId, room] of gameController.gameRooms.entries()) {
    const player = room.players.find(p => p.id === socketId);
    if (player) {
      console.log('Jogador encontrado na sala:', roomId);

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
      const timeoutHandle = setTimeout(() => {
        pendingRemovals.delete(socketId);
        const currentRoom = gameController.gameRooms.get(roomId);
        if (currentRoom) {
          const currentPlayer = currentRoom.players.find(p => p.id === socketId);
          if (currentPlayer && !currentPlayer.connected) {
            console.log('Removendo jogador por timeout de reconexão:', socketId);
            const result = gameController.removePlayerFromRoom(roomId, socketId);

            if (result.success) {
              const currentIo = ioModule.getIO();
              if (!result.roomDeleted) {
                // Sem isso, os jogadores restantes nunca sabiam que o jogo continuou
                // sem o jogador removido e a partida ficava travada para sempre.
                gameController.broadcastGameState(roomId);
                currentIo.to(roomId).emit('player_removed', {
                  playerId: socketId,
                  playerName: currentPlayer.name
                });
              }
              currentIo.emit('rooms_updated', { rooms: gameController.getAllRooms() });
            }
          }
        }
      }, 60000); // Aumentado para 60 segundos

      pendingRemovals.set(socketId, timeoutHandle);

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
    const game = gameController.gameRooms.get(roomId);
    if (game) {
      // Marcar o jogador como não pronto por padrão
      game.players.forEach(player => {
        player.isReady = false;
      });
      
      // Atualizar o estado do jogo
      game.game.updateGameState();
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

  // Atualiza o estado do jogo para cada jogador (mão dos outros permanece oculta)
  gameController.broadcastGameState(roomId);

  return { success: true, gameState: result.gameState };
};

// Adicionando função para verificar salas vazias e removê-las
gameController.checkEmptyRooms = function() {
  for (const [roomId, game] of gameController.gameRooms.entries()) {
    if (game.players.length === 0) {
      gameController.gameRooms.delete(roomId);
      console.log(`Sala vazia removida: ${roomId}`);
    }
  }
  
  return { success: true, roomsCount: gameController.gameRooms.size };
};

// Configurar verificação periódica de salas vazias (a cada 5 minutos)
setInterval(() => {
  gameController.checkEmptyRooms();
}, 5 * 60 * 1000);

// Adicionar as funções estendidas ao gameController
gameController.checkPlayerInRooms = checkPlayerInRooms;
gameController.cancelPendingRemoval = cancelPendingRemoval;

module.exports = gameController;
