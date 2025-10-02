const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const dotenv = require('dotenv');
const gameRoutes = require('./routes/gameRoutes');
const gameController = require('./controllers/gameControllerExtended');
const ioModule = require('./socket/io');

// Configuração do ambiente
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  pingTimeout: 60000,
  pingInterval: 25000,
  reconnection: true,
  reconnectionAttempts: 20,
  reconnectionDelay: 2000,
  connectTimeout: 60000
});

// Inicializar o módulo io
ioModule.init(io);

// Middleware
app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/game', gameRoutes);

// Rota padrão
app.get('/', (req, res) => {
  res.send('API do Truco Gaúcho está funcionando!');
});

// Configuração do Socket.IO
io.on('connection', (socket) => {
  console.log('Novo usuário conectado:', socket.id);
  
  // Desconexão
  socket.on('disconnect', () => {
    console.log('Usuário desconectado:', socket.id);
    
    // Verificar se o usuário estava em alguma sala e removê-lo
    gameController.checkPlayerInRooms(socket.id);
    
    // Verificar salas vazias
    gameController.checkEmptyRooms();
  });
  
  // Criar sala
  socket.on('create_room', (data) => {
    const { roomName, maxPlayers, playerName } = data;
    const room = gameController.createRoom(roomName, parseInt(maxPlayers));
    
    // Adicionar o jogador à sala
    const result = gameController.addPlayerToRoom(room.id, socket.id, playerName);
    
    if (result.success) {
      // Entrar na sala do socket
      socket.join(room.id);
      
      // Obter o estado do jogo
      const gameState = gameController.getGameState(room.id);
      console.log('Estado do jogo enviado para o cliente (criação de sala):', gameState);
      
      // Enviar informações da sala para o jogador
      socket.emit('room_created', { 
        room: result.room,
        gameState: gameState
      });
      
      // Atualizar a lista de salas para todos os usuários
      io.emit('rooms_updated', { rooms: gameController.getAllRooms() });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Entrar na sala
  socket.on('join_room', (data) => {
    const { roomId, playerName } = data;
    const result = gameController.addPlayerToRoom(roomId, socket.id, playerName);
    
    if (result.success) {
      // Entrar na sala do socket
      socket.join(roomId);
      
      // Enviar informações da sala para o jogador
      socket.emit('room_joined', { room: result.room });
      
      // Enviar informações do jogo para todos na sala
      const gameState = gameController.getGameState(roomId);
      console.log('Estado do jogo enviado para o cliente:', gameState);
      io.to(roomId).emit('game_state_updated', { gameState });
      
      // Enviar cartas para o jogador
      const cards = gameController.getPlayerCards(roomId, socket.id);
      socket.emit('cards_dealt', cards);
      
      // Atualizar a lista de salas para todos os usuários
      io.emit('rooms_updated', { rooms: gameController.getAllRooms() });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Sair da sala
  socket.on('leave_room', (data) => {
    const { roomId } = data;
    const result = gameController.removePlayerFromRoom(roomId, socket.id);
    
    if (result.success) {
      // Sair da sala do socket
      socket.leave(roomId);
      
      // Enviar confirmação para o jogador
      socket.emit('room_left');
      
      if (!result.roomDeleted) {
        // Enviar informações do jogo para todos na sala
        const gameState = gameController.getGameState(roomId);
        io.to(roomId).emit('game_state_updated', { gameState });
      }
      
      // Atualizar a lista de salas para todos os usuários
      io.emit('rooms_updated', { rooms: gameController.getAllRooms() });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Jogar carta
  socket.on('play_card', (data) => {
    const { roomId, card } = data;
    const result = gameController.playCard(roomId, socket.id, card);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('game_state_updated', { gameState: result.gameState });
      
      // Enviar cartas atualizadas para o jogador
      const cards = gameController.getPlayerCards(roomId, socket.id);
      socket.emit('cards_dealt', cards);
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Truco
  socket.on('truco', ({ roomId }) => {
    const result = gameController.requestTruco(roomId, socket.id);
    if (result.success) {
      io.to(roomId).emit('truco_requested', {
        playerId: socket.id,
        nextPlayer: result.nextPlayer,
        trucoState: result.trucoState
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Retruco
  socket.on('retruco', ({ roomId }) => {
    const result = gameController.requestRetruco(roomId, socket.id);
    if (result.success) {
      io.to(roomId).emit('retruco_requested', {
        playerId: socket.id,
        nextPlayer: result.nextPlayer,
        retrucoState: result.retrucoState,
        currentPlayer: result.currentPlayer
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Vale 4
  socket.on('vale4', ({ roomId }) => {
    const result = gameController.requestVale4(roomId, socket.id);
    if (result.success) {
      io.to(roomId).emit('vale4_requested', {
        playerId: socket.id,
        nextPlayer: result.nextPlayer,
        vale4State: result.vale4State,
        currentPlayer: result.currentPlayer
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Responder ao Truco
  socket.on('truco_response', ({ roomId, accept }) => {
    const result = gameController.respondToTruco(roomId, socket.id, accept);
    if (result.success) {
      io.to(roomId).emit('truco_response_received', {
        playerId: socket.id,
        accepted: accept,
        currentPlayer: result.currentPlayer,
        trucoState: result.trucoState,
        handValue: result.handValue,
        gameStatus: result.gameStatus,
        message: result.message
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Responder ao Retruco
  socket.on('retruco_response', ({ roomId, accept }) => {
    const result = gameController.respondToRetruco(roomId, socket.id, accept);
    if (result.success) {
      io.to(roomId).emit('retruco_response_received', {
        playerId: socket.id,
        accepted: accept,
        currentPlayer: result.currentPlayer,
        retrucoState: result.retrucoState,
        handValue: result.handValue,
        gameStatus: result.gameStatus,
        message: result.message
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Responder ao Vale 4
  socket.on('vale4_response', ({ roomId, accept }) => {
    const result = gameController.respondToVale4(roomId, socket.id, accept);
    if (result.success) {
      io.to(roomId).emit('vale4_response_received', {
        playerId: socket.id,
        accepted: accept,
        currentPlayer: result.currentPlayer,
        vale4State: result.vale4State,
        handValue: result.handValue,
        gameStatus: result.gameStatus,
        message: result.message
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Envido
  socket.on('envido', (data) => {
    const { roomId } = data;
    const result = gameController.requestEnvido(roomId, socket.id);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('envido_requested', { 
        playerId: socket.id,
        envidoState: result.envidoState,
        waitingResponse: result.waitingResponse,
        respondingTeam: result.respondingTeam
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Real Envido
  socket.on('real_envido', (data) => {
    const { roomId } = data;
    const result = gameController.requestRealEnvido(roomId, socket.id);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('real_envido_requested', { 
        playerId: socket.id,
        envidoState: result.envidoState,
        waitingResponse: result.waitingResponse,
        respondingTeam: result.respondingTeam
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Falta Envido
  socket.on('falta_envido', (data) => {
    const { roomId } = data;
    const result = gameController.requestFaltaEnvido(roomId, socket.id);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('falta_envido_requested', { 
        playerId: socket.id,
        envidoState: result.envidoState,
        waitingResponse: result.waitingResponse,
        respondingTeam: result.respondingTeam
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Responder ao Envido
  socket.on('envido_response', (data) => {
    const { roomId, accept } = data;
    const result = gameController.respondToEnvido(roomId, socket.id, accept);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('envido_response_received', { 
        playerId: socket.id,
        accepted: result.accepted,
        team1Envido: result.team1Envido,
        team2Envido: result.team2Envido,
        winningTeam: result.winningTeam
      });
      
      // Atualizar o estado do jogo
      const gameState = gameController.getGameState(roomId);
      io.to(roomId).emit('game_state_updated', { gameState });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Cantar Flor
  socket.on('flor', (data) => {
    const { roomId } = data;
    const result = gameController.declareFlor(roomId, socket.id);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('flor_declared', { 
        playerId: socket.id,
        florState: result.florState
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Marcar jogador como pronto
  socket.on('player_ready', (data) => {
    console.log('Evento player_ready recebido:', { roomId: data.roomId, playerId: socket.id });
    const { roomId } = data;
    const result = gameController.setPlayerReady(roomId, socket.id);
    
    console.log('Resultado do setPlayerReady:', result);
    
    if (result.success) {
      // Enviar confirmação para o jogador
      socket.emit('player_ready_confirmed', { success: true });
      
      // Atualizar o estado do jogo para todos os jogadores
      const gameState = result.gameState || gameController.getGameState(roomId);
      console.log('Estado do jogo após player_ready:', gameState);
      io.to(roomId).emit('game_state_updated', { gameState });
      
      // Se o jogo começou, enviar as cartas para cada jogador
      if (gameState && gameState.gameStatus === 'playing') {
        console.log('Jogo iniciado, distribuindo cartas para os jogadores');
        gameState.players.forEach(player => {
          const cards = gameController.getPlayerCards(roomId, player.id);
          console.log('Cartas do jogador:', { playerId: player.id, cards });
          io.to(player.id).emit('cards_dealt', cards);
        });
      }
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Contra-Flor
  socket.on('contra_flor', (data) => {
    const { roomId } = data;
    const result = gameController.requestContraFlor(roomId, socket.id);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('contra_flor_requested', { 
        playerId: socket.id,
        florState: result.florState,
        waitingResponse: result.waitingResponse,
        respondingTeam: result.respondingTeam
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Pedir Contra-Flor e o Resto
  socket.on('contra_flor_resto', (data) => {
    const { roomId } = data;
    const result = gameController.requestContraFlorResto(roomId, socket.id);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('contra_flor_resto_requested', { 
        playerId: socket.id,
        florState: result.florState,
        waitingResponse: result.waitingResponse,
        respondingTeam: result.respondingTeam
      });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Responder à Flor
  socket.on('flor_response', (data) => {
    const { roomId, accept } = data;
    const result = gameController.respondToFlor(roomId, socket.id, accept);
    
    if (result.success) {
      // Enviar informações do jogo para todos na sala
      io.to(roomId).emit('flor_response_received', { 
        playerId: socket.id,
        accepted: result.accepted,
        team1Flor: result.team1Flor,
        team2Flor: result.team2Flor,
        winningTeam: result.winningTeam
      });
      
      // Atualizar o estado do jogo
      const gameState = gameController.getGameState(roomId);
      io.to(roomId).emit('game_state_updated', { gameState });
    } else {
      socket.emit('error', { message: result.message });
    }
  });
  
  // Obter lista de salas
  socket.on('get_rooms', () => {
    const rooms = gameController.getAllRooms();
    socket.emit('rooms_list', { rooms });
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

module.exports = { app, server };