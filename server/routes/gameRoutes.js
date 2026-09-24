const express = require('express');
const gameController = require('../controllers/gameController');
const { validateRoomParams } = require('../utils/validation');

const router = express.Router();

router.get('/rooms', (req, res) => {
  res.json({ success: true, rooms: gameController.getAllRooms() });
});

router.post('/rooms', (req, res) => {
  const { roomName, maxPlayers } = req.body || {};
  const check = validateRoomParams(roomName, maxPlayers);
  if (!check.ok) {
    return res.status(400).json({ success: false, message: check.message });
  }

  try {
    const room = gameController.createRoom(check.name, check.maxPlayers);
    res.json({ success: true, room: gameController.toPublicRoom(room) });
  } catch (err) {
    res.status(429).json({ success: false, message: err.message });
  }
});

router.get('/rooms/:roomId', (req, res) => {
  const room = gameController.getRoom(req.params.roomId);
  if (!room) {
    return res.status(404).json({ success: false, message: 'Sala não encontrada' });
  }
  res.json({ success: true, room: gameController.toPublicRoom(room) });
});

// Estado público da partida: nunca inclui as cartas dos jogadores.
router.get('/rooms/:roomId/state', (req, res) => {
  const gameState = gameController.getGameState(req.params.roomId);
  if (!gameState) {
    return res.status(404).json({ success: false, message: 'Sala não encontrada' });
  }
  res.json({ success: true, gameState });
});

module.exports = router;
