const express = require('express');
const router = express.Router();
const gameController = require('../controllers/gameController');

// Obter todas as salas
router.get('/rooms', (req, res) => {
  const rooms = gameController.getAllRooms();
  res.json({ success: true, rooms });
});

// Criar uma nova sala
router.post('/rooms', (req, res) => {
  const { roomName, maxPlayers } = req.body;
  
  if (!roomName) {
    return res.status(400).json({ success: false, message: 'Nome da sala é obrigatório' });
  }
  
  const validMaxPlayers = [2, 4];
  if (!validMaxPlayers.includes(parseInt(maxPlayers))) {
    return res.status(400).json({ success: false, message: 'Número de jogadores deve ser 2 ou 4' });
  }
  
  const room = gameController.createRoom(roomName, parseInt(maxPlayers));
  res.json({ success: true, room });
});

// Obter informações de uma sala específica
router.get('/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const room = gameController.getRoom(roomId);
  
  if (!room) {
    return res.status(404).json({ success: false, message: 'Sala não encontrada' });
  }
  
  res.json({ success: true, room });
});

// Obter o estado do jogo de uma sala
router.get('/rooms/:roomId/state', (req, res) => {
  const { roomId } = req.params;
  const gameState = gameController.getGameState(roomId);
  
  if (!gameState) {
    return res.status(404).json({ success: false, message: 'Sala não encontrada' });
  }
  
  res.json({ success: true, gameState });
});

// Obter as cartas de um jogador
router.get('/rooms/:roomId/cards/:playerId', (req, res) => {
  const { roomId, playerId } = req.params;
  const result = gameController.getPlayerCards(roomId, playerId);
  
  if (!result.success) {
    return res.status(404).json(result);
  }
  
  res.json(result);
});

module.exports = router;
