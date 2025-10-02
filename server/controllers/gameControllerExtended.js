// Corrigindo o problema das cartas não aparecendo para o criador da sala
// Modificando o controlador do jogo para garantir que as cartas sejam distribuídas corretamente

const gameController = require('../controllers/gameController');
const { TrucoGame } = require('../models/TrucoGame');
const ioModule = require('../socket/io');

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
      setTimeout(() => {
        const currentRoom = gameController.gameRooms.get(roomId);
        if (currentRoom) {
          const currentPlayer = currentRoom.players.find(p => p.id === socketId);
          if (currentPlayer && !currentPlayer.connected) {
            console.log('Removendo jogador por timeout de reconexão:', socketId);
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

  // Atualiza o estado do jogo para todos os jogadores
  const io = ioModule.getIO();
  io.to(roomId).emit('game_state_updated', { gameState: room.game.getGameState() });

  return { success: true };
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

module.exports = gameController;
