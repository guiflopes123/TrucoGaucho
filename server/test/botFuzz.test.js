const assert = require('assert');
const { TrucoGame } = require('../models/TrucoGame');
const strategy = require('../bots/strategy');
require('./helpers');

// Os atrasos entre rodadas/mãos viram uma fila que a simulação executa na hora.
const createBotGame = (numPlayers) => {
  const game = new TrucoGame('fuzz', numPlayers);
  game.queue = [];
  game._schedule = (fn) => { game.queue.push(fn); };
  for (let i = 1; i <= numPlayers; i++) game.addPlayer(`bot${i}`, `Bot ${i}`, { isBot: true });
  game.setPlayerReady('bot1');
  return game;
};

const flush = (game) => game.queue.splice(0).forEach(fn => fn());

const checkInvariants = (game) => {
  assert.ok(game.players.every(p => p.hand.length <= 3), 'mão com mais de 3 cartas');
  assert.ok(game.teams.every(t => t.score >= 0), 'placar negativo');
  assert.ok(game.handValue >= 1 && game.handValue <= 4, `valor de mão inválido: ${game.handValue}`);
  assert.ok(game.playedCards.length <= game.players.length, 'mais cartas na mesa que jogadores');
  const inPlay = game.playedCards.length + game.players.reduce((sum, p) => sum + p.hand.length, 0);
  assert.ok(inPlay <= game.players.length * 3, 'cartas demais em jogo');
};

// Joga uma partida inteira só com bots e devolve estatísticas.
const playFullGame = async (numPlayers) => {
  const game = createBotGame(numPlayers);
  const seen = { hands: 0, truco: 0, envido: 0, flor: 0, onze: 0 };
  let steps = 0;

  while (game.gameStatus === 'playing') {
    steps += 1;
    assert.ok(steps < 20000, 'partida não terminou (loop)');

    if (game.roundLocked) {
      assert.ok(game.queue.length > 0, 'mesa travada sem transição agendada');
      flush(game);
      continue;
    }

    let acted = null;
    for (const bot of game.players) {
      if (strategy.needsAction(game, bot.id)) {
        acted = strategy.act(game, bot.id);
        if (acted) break;
      }
    }
    assert.ok(acted, `partida travada: ninguém consegue agir (status=${game.gameStatus}, turno=${game.currentTurn}, ` +
      `truco=${JSON.stringify(game.trucoState)}, envido=${JSON.stringify(game.envidoState)}, flor=${JSON.stringify(game.florState)}, ` +
      `onze=${JSON.stringify(game.onzeState)}, mesa=${game.playedCards.length}, rodadas=${game.roundResults.length})`);

    if (/Truco|Retruco|Vale4/.test(acted.method)) seen.truco += 1;
    if (/Envido/.test(acted.method)) seen.envido += 1;
    if (/Flor/.test(acted.method)) seen.flor += 1;
    if (acted.method === 'respondToMaoDeOnze') seen.onze += 1;
    if (game.handMode !== 'normal') seen.hands += 1;
    checkInvariants(game);
  }

  return { game, seen, steps };
};

describe('Partidas completas só com bots (fuzz das regras)', function () {
  this.timeout(60000);

  it('1x1: 300 partidas terminam com vencedor válido, sem travar', async () => {
    const totals = { truco: 0, envido: 0, flor: 0, onze: 0 };
    for (let i = 0; i < 300; i++) {
      const { game, seen } = await playFullGame(2);
      assert.strictEqual(game.gameStatus, 'finished');
      assert.ok(game.gameWinner, 'sem vencedor');
      assert.ok(game.gameWinner.score >= game.targetScore, `vencedor com ${game.gameWinner.score} pontos`);
      Object.keys(totals).forEach(key => { totals[key] += seen[key]; });
    }
    assert.ok(totals.truco > 0, 'os bots nunca pediram Truco');
    assert.ok(totals.envido > 0, 'os bots nunca pediram Envido');
    assert.ok(totals.onze > 0, 'nenhuma mão de onze aconteceu nas partidas');
  });

  it('2x2: 120 partidas terminam com vencedor válido, sem travar', async () => {
    for (let i = 0; i < 120; i++) {
      const { game } = await playFullGame(4);
      assert.strictEqual(game.gameStatus, 'finished');
      assert.ok(game.gameWinner.score >= game.targetScore);
    }
  });
});
