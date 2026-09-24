const assert = require('assert');
const { TrucoGame } = require('../models/TrucoGame');
const { C, createStartedGame, play, wait } = require('./helpers');

describe('Reorganização dos times', () => {
  it('a revanche reorganiza os assentos depois que alguém saiu da partida encerrada (2x2)', () => {
    const game = createStartedGame(4);
    game.removePlayer('p3'); // W.O.: partida encerrada com 3 jogadores
    ['p1', 'p2', 'p4'].forEach(id => game.voteRematch(id));

    assert.strictEqual(game.gameStatus, 'waiting');
    game.addPlayer('novo', 'Novo');
    assert.deepStrictEqual(game.players.map(p => p.team), [1, 2, 1, 2], 'os times têm de alternar na ordem de jogo');
    assert.deepStrictEqual([game.teams[0].players.length, game.teams[1].players.length], [2, 2]);
  });
});

describe('Relógio de jogada', () => {
  const build = (timeoutMs = 20) => {
    const game = createStartedGame(2);
    game.turnTimeoutMs = timeoutMs;
    game.notices = [];
    game.onNotice = (m) => game.notices.push(m);
    game._rearmTurnTimer();
    return game;
  };

  it('expõe o tempo restante no estado enquanto aguarda uma jogada', () => {
    const game = build(5000);
    const state = game.getGameState('p1');
    assert.strictEqual(state.turnTimeoutMs, 5000);
    assert.ok(state.turnRemainingMs > 0 && state.turnRemainingMs <= 5000);
    game.dispose();
  });

  it('sem jogada no prazo, joga a carta mais fraca e avisa a mesa', () => {
    const game = build(60000);
    game.players[0].hand = [C('3', 'copas'), C('4', 'paus'), C('1', 'espadas')];
    game._onTurnTimeout();

    assert.strictEqual(game.playedCards.length, 1);
    assert.strictEqual(game.playedCards[0].card.display, '4♣', 'carta mais fraca');
    assert.ok(game.notices.some(n => /jogada automática/.test(n)));
    assert.strictEqual(game.players[game.currentTurn].id, 'p2');
    game.dispose();
  });

  it('uma jogada manual reinicia o relógio e zera o contador de inatividade', async () => {
    const game = build(40);
    game.players[0].timeouts = 1;
    const card = game.players[0].hand[0];
    play(game, 'p1', card.value, card.suit);

    assert.strictEqual(game.players[0].timeouts, 0);
    await wait(15);
    assert.strictEqual(game.playedCards.length, 1, 'p2 ainda está dentro do prazo');
    game.dispose();
  });

  it('dois estouros seguidos contam como abandono (W.O.)', async () => {
    const game = build();
    game.players[0].timeouts = 1;
    await wait(60);

    assert.strictEqual(game.gameStatus, 'finished');
    assert.strictEqual(game.gameWinner.id, 2);
    assert.ok(game.notices.some(n => /W\.O\./.test(n)));
    game.dispose();
  });

  it('aposta pendente sem resposta no prazo é recusada', async () => {
    const game = build(1000);
    game.requestTruco('p1');
    game.turnTimeoutMs = 20;
    game._rearmTurnTimer();
    await wait(60);

    assert.strictEqual(game.trucoState, null);
    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0]);
    assert.ok(game.notices.some(n => /Truco recusado/.test(n)));
    game.dispose();
  });

  it('não corre durante a janela entre rodadas nem com o relógio desligado', async () => {
    const game = createStartedGame(2);
    assert.strictEqual(game.getGameState('p1').turnRemainingMs, null);

    game.turnTimeoutMs = 20;
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'copas')];
    game.roundDelayMs = 200;
    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '4', 'copas');
    assert.strictEqual(game.getGameState('p1').turnRemainingMs, null, 'mesa travada: sem relógio');
    game.dispose();
  });
});

describe('Mão de onze e mão de ferro', () => {
  it('o time com 11 pontos decide antes de jogar; o adversário não pode jogar nem apostar', () => {
    const game = createStartedGame(2);
    game.teams[0].score = 11;
    game.handStarterIndex = 0;
    game._startHand();

    assert.strictEqual(game.handMode, 'onze');
    assert.deepStrictEqual(game.onzeState, { team: 1, waitingResponse: true, accepted: false });
    const card = game.players[0].hand[0];
    assert.match(play(game, 'p1', card.value, card.suit).message, /mão de onze/);
    assert.strictEqual(game.requestTruco('p1').success, false);
    assert.strictEqual(game.requestEnvido('p1').success, false);
    assert.strictEqual(game.respondToMaoDeOnze('p2', true).success, false, 'só o time com 11 decide');
  });

  it('correr dá 1 ponto ao adversário e passa para a próxima mão', async () => {
    const game = createStartedGame(2);
    game.teams[0].score = 11;
    game._startHand();
    const result = game.respondToMaoDeOnze('p1', false);

    assert.strictEqual(result.handEnded, true);
    assert.deepStrictEqual(game.teams.map(t => t.score), [11, 1]);
    await wait();
    assert.strictEqual(game.handMode, 'onze', 'o time continua com 11 pontos na mão seguinte');
  });

  it('jogar vale 3: quem vencer a mão leva 3 pontos (e a partida, se for quem tinha 11)', async () => {
    const game = createStartedGame(2);
    game.teams[0].score = 11;
    game._startHand();
    game.players[0].hand = [C('3', 'copas'), C('3', 'paus'), C('4', 'paus')];
    game.players[1].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'copas')];

    assert.strictEqual(game.respondToMaoDeOnze('p1', true).played, true);
    assert.strictEqual(game.handValue, 3);
    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '4', 'copas');
    await wait();
    play(game, 'p1', '3', 'paus');
    play(game, 'p2', '5', 'copas');

    assert.strictEqual(game.gameStatus, 'finished');
    assert.strictEqual(game.gameWinner.id, 1);
  });

  it('no 2x2 os parceiros do time com 11 veem as cartas um do outro enquanto decidem', () => {
    const game = createStartedGame(4);
    game.teams[0].score = 11;
    game._startHand();

    const seenByP1 = game.getGameState('p1').players;
    assert.strictEqual(seenByP1.find(p => p.id === 'p3').hand.length, 3, 'parceiro visível');
    assert.strictEqual(seenByP1.find(p => p.id === 'p2').hand.length, 0, 'adversário oculto');
    assert.strictEqual(game.getGameState('p2').players.find(p => p.id === 'p1').hand.length, 0);

    game.respondToMaoDeOnze('p1', true);
    assert.strictEqual(game.getGameState('p1').players.find(p => p.id === 'p3').hand.length, 0, 'depois de decidir, volta a ser oculto');
  });

  it('mão de ferro: os dois com 11, sem apostas, vale 1 e decide a partida', async () => {
    const game = createStartedGame(2);
    game.teams[0].score = 11;
    game.teams[1].score = 11;
    game._startHand();

    assert.strictEqual(game.handMode, 'ferro');
    assert.strictEqual(game.onzeState, null);
    assert.strictEqual(game.requestTruco('p1').success, false);
    game.players[0].hand = [C('3', 'copas'), C('3', 'paus'), C('4', 'paus')];
    game.players[1].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'copas')];
    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '4', 'copas');
    await wait();
    play(game, 'p1', '3', 'paus');
    play(game, 'p2', '5', 'copas');

    assert.strictEqual(game.gameStatus, 'finished');
    assert.strictEqual(game.gameWinner.id, 1);
  });

  it('pode ser desligada', () => {
    const game = createStartedGame(2);
    game.maoDeOnze = false;
    game.teams[0].score = 11;
    game._startHand();
    assert.strictEqual(game.handMode, 'normal');
  });
});

describe('Avisos e destaque da rodada', () => {
  it('informa quem venceu a rodada, o empate e a mão', async () => {
    const game = createStartedGame(2);
    const notices = [];
    game.onNotice = (m) => notices.push(m);
    game.players[0].hand = [C('3', 'copas'), C('3', 'paus'), C('4', 'paus')];
    game.players[1].hand = [C('3', 'ouros'), C('4', 'copas'), C('6', 'copas')];

    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '3', 'ouros');
    assert.deepStrictEqual(game.getGameState('p1').lastRound, { winnerPlayerId: null, winnerTeam: null, tie: true });
    await wait();
    assert.strictEqual(game.getGameState('p1').lastRound, null, 'o destaque some quando a mesa é limpa');

    play(game, 'p1', '3', 'paus');
    play(game, 'p2', '4', 'copas');
    assert.strictEqual(game.getGameState('p1').lastRound.winnerPlayerId, 'p1');
    assert.deepStrictEqual(notices, ['Rodada empatada.', 'Time 1 ganhou a mão e faz 1 ponto.']);
  });
});

describe('Snapshot e restauração', () => {
  it('reconstrói uma partida em andamento igual à original', () => {
    const game = createStartedGame(2);
    game.requestTruco('p1');
    game.respondToTruco('p2', true);
    const card = game.players[0].hand[0];
    play(game, 'p1', card.value, card.suit);

    const snapshot = JSON.parse(JSON.stringify(game.toSnapshot()));
    const restored = TrucoGame.fromSnapshot(snapshot);

    assert.deepStrictEqual(restored.getGameState('p1').players.find(p => p.id === 'p1'),
      { ...game.getGameState('p1').players.find(p => p.id === 'p1'), connected: false });
    assert.strictEqual(restored.handValue, 2);
    assert.strictEqual(restored.playedCards.length, 1);
    assert.strictEqual(restored.playedCards[0].card.compareWith(card), 0);
    assert.strictEqual(restored.players[1].hand.length, 3);
    assert.strictEqual(restored.players[0].calculateEnvido(), game.players[0].calculateEnvido());
    assert.strictEqual(restored.currentTurn, game.currentTurn);
    game.dispose();
  });

  it('retoma a transição pendente entre rodadas ao restaurar', () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'copas')];
    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '4', 'copas');
    assert.strictEqual(game.roundLocked, true);

    const restored = TrucoGame.fromSnapshot(JSON.parse(JSON.stringify(game.toSnapshot())));
    restored.resumeAfterRestore();

    assert.strictEqual(restored.roundLocked, false);
    assert.strictEqual(restored.playedCards.length, 0);
    assert.strictEqual(restored.players[restored.currentTurn].id, 'p1', 'quem venceu a rodada abre a próxima');
    game.dispose();
  });

  it('preserva partida encerrada e o vencedor', () => {
    const game = createStartedGame(2);
    game.awardPoints(game.teams[1], 12);
    const restored = TrucoGame.fromSnapshot(JSON.parse(JSON.stringify(game.toSnapshot())));
    assert.strictEqual(restored.gameStatus, 'finished');
    assert.strictEqual(restored.gameWinner.id, 2);
  });
});
