const { Card, TrucoGame } = require('../models/TrucoGame');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.DEBUG_LOGS = 'false';

const C = (value, suit) => new Card(value, suit);

// Cria uma partida já iniciada, com os jogadores p1..pN (times alternados 1,2,1,2).
const createStartedGame = (numPlayers = 2) => {
  const game = new TrucoGame('sala-teste', numPlayers);
  game.roundDelayMs = 1;
  for (let i = 1; i <= numPlayers; i++) game.addPlayer(`p${i}`, `Jogador ${i}`);
  for (let i = 1; i <= numPlayers; i++) game.setPlayerReady(`p${i}`);
  return game;
};

const play = (game, playerId, value, suit) => game.playCard(playerId, { value, suit });

const wait = (ms = 15) => new Promise(resolve => setTimeout(resolve, ms));

module.exports = { C, createStartedGame, play, wait };
