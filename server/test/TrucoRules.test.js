const assert = require('assert');
const { C, createStartedGame, play, wait } = require('./helpers');

// Joga uma rodada completa de 2 jogadores (p1 abre) e espera a mesa ser limpa.
const playRound2p = async (game, first, second, opener = 'p1', other = 'p2') => {
  play(game, opener, first[0], first[1]);
  play(game, other, second[0], second[1]);
  await wait();
};

describe('Mão com empates (2 jogadores)', () => {
  it('empate na 1ª: quem vence a 2ª leva a mão', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('3', 'paus'), C('4', 'copas'), C('6', 'copas')];

    await playRound2p(game, ['3', 'copas'], ['3', 'paus']);
    assert.deepStrictEqual(game.teams.map(t => t.score), [0, 0]);
    assert.strictEqual(game.roundResults[0].winnerTeam, null);

    play(game, 'p1', '2', 'copas');
    play(game, 'p2', '4', 'copas');

    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0], 'p1 venceu a 2ª e deve levar a mão');
    assert.strictEqual(game.roundLocked, true);
  });

  it('empate na 2ª: quem venceu a 1ª leva a mão', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('2', 'paus'), C('2', 'ouros'), C('6', 'copas')];

    await playRound2p(game, ['3', 'copas'], ['2', 'paus']);
    play(game, 'p1', '2', 'copas');
    play(game, 'p2', '2', 'ouros');

    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0]);
  });

  it('empate na 3ª (1-1): quem venceu a 1ª leva a mão', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('4', 'copas'), C('5', 'paus')];
    game.players[1].hand = [C('2', 'paus'), C('6', 'ouros'), C('5', 'copas')];

    await playRound2p(game, ['3', 'copas'], ['2', 'paus']); // p1 vence
    await playRound2p(game, ['4', 'copas'], ['6', 'ouros']); // p2 vence e abre a 3ª
    play(game, 'p2', '5', 'copas');
    play(game, 'p1', '5', 'paus');

    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0]);
  });

  it('empate na 1ª e na 2ª: quem vence a 3ª leva a mão (o cenário que travava antes)', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('3', 'paus'), C('2', 'paus'), C('6', 'copas')];

    await playRound2p(game, ['3', 'copas'], ['3', 'paus']);
    await playRound2p(game, ['2', 'copas'], ['2', 'paus']);
    play(game, 'p1', '4', 'paus');
    play(game, 'p2', '6', 'copas');

    assert.deepStrictEqual(game.teams.map(t => t.score), [0, 1]);
  });

  it('três empates: vence o time de quem foi "mão"', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('3', 'paus'), C('2', 'paus'), C('4', 'copas')];

    await playRound2p(game, ['3', 'copas'], ['3', 'paus']);
    await playRound2p(game, ['2', 'copas'], ['2', 'paus']);
    play(game, 'p1', '4', 'paus');
    play(game, 'p2', '4', 'copas');

    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0], 'p1 abriu a mão');
  });

  it('em caso de empate, quem abriu a rodada abre a próxima', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('3', 'paus'), C('2', 'paus'), C('6', 'copas')];

    await playRound2p(game, ['3', 'copas'], ['3', 'paus']);
    assert.strictEqual(game.players[game.currentTurn].id, 'p1');
  });

  it('quem vence a rodada abre a próxima', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('4', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('3', 'paus'), C('2', 'paus'), C('6', 'copas')];

    await playRound2p(game, ['4', 'copas'], ['3', 'paus']);
    assert.strictEqual(game.players[game.currentTurn].id, 'p2');
  });
});

describe('Empate entre companheiros (2x2)', () => {
  it('cartas altas iguais do mesmo time não empatam a rodada', () => {
    const game = createStartedGame(4);
    game.players[0].hand = [C('3', 'copas')];
    game.players[1].hand = [C('1', 'copas')];
    game.players[2].hand = [C('3', 'paus')];
    game.players[3].hand = [C('2', 'copas')];

    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '1', 'copas');
    play(game, 'p3', '3', 'paus');
    play(game, 'p4', '2', 'copas');

    assert.strictEqual(game.roundResults[0].winnerTeam, 1);
    assert.strictEqual(game.roundResults[0].winnerPlayerId, 'p1');
  });

  it('cartas altas iguais de times diferentes empatam', () => {
    const game = createStartedGame(4);
    game.players[0].hand = [C('3', 'copas')];
    game.players[1].hand = [C('3', 'paus')];
    game.players[2].hand = [C('2', 'paus')];
    game.players[3].hand = [C('2', 'copas')];

    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '3', 'paus');
    play(game, 'p3', '2', 'paus');
    play(game, 'p4', '2', 'copas');

    assert.strictEqual(game.roundResults[0].winnerTeam, null);
  });
});

describe('Janela entre rodadas', () => {
  it('não permite jogar nem apostar enquanto a rodada é resolvida', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
    game.players[1].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'copas')];

    play(game, 'p1', '3', 'copas');
    play(game, 'p2', '4', 'copas');

    const extra = play(game, 'p1', '2', 'copas');
    assert.strictEqual(extra.success, false);
    assert.strictEqual(game.players[0].hand.length, 2, 'a carta não pode sumir da mão');
    assert.strictEqual(game.requestTruco('p1').success, false);

    await wait();
    assert.strictEqual(game.roundLocked, false);
    assert.strictEqual(game.playedCards.length, 0);
    assert.strictEqual(play(game, 'p1', '2', 'copas').success, true);
  });
});

describe('Rotação do "mão"', () => {
  it('o mão gira um lugar a cada mão, independente de quem venceu', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('4', 'paus'), C('4', 'copas'), C('5', 'paus')];
    game.players[1].hand = [C('3', 'copas'), C('3', 'paus'), C('2', 'copas')];
    assert.strictEqual(game.handStarterIndex, 0);

    await playRound2p(game, ['4', 'paus'], ['3', 'copas']);
    play(game, 'p2', '3', 'paus');
    play(game, 'p1', '4', 'copas');
    assert.deepStrictEqual(game.teams.map(t => t.score), [0, 1]);

    await wait();
    assert.strictEqual(game.handStarterIndex, 1);
    assert.strictEqual(game.players[game.currentTurn].id, 'p2');
    game.players.forEach(p => assert.strictEqual(p.hand.length, 3));
    assert.strictEqual(game.roundResults.length, 0);
  });
});

describe('Truco, Retruco e Vale 4', () => {
  it('recusar o Truco encerra a mão e dá 1 ponto ao time que pediu', async () => {
    const game = createStartedGame(2);
    game.requestTruco('p1');
    const result = game.respondToTruco('p2', false);

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.handEnded, true);
    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0]);
    assert.strictEqual(game.roundLocked, true);
    const card = game.players[0].hand[0];
    assert.strictEqual(play(game, 'p1', card.value, card.suit).success, false, 'a mão acabou');

    await wait();
    assert.strictEqual(game.trucoState, null);
    game.players.forEach(p => assert.strictEqual(p.hand.length, 3));
    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0], 'sem pontuar duas vezes');
  });

  it('recusar o Retruco dá 2 pontos e recusar o Vale 4 dá 3', () => {
    const retruco = createStartedGame(2);
    retruco.requestTruco('p1');
    retruco.respondToTruco('p2', true);
    retruco.requestRetruco('p2');
    retruco.respondToRetruco('p1', false);
    assert.deepStrictEqual(retruco.teams.map(t => t.score), [0, 2]);

    const vale4 = createStartedGame(2);
    vale4.requestTruco('p1');
    vale4.respondToTruco('p2', true);
    vale4.requestRetruco('p2');
    vale4.respondToRetruco('p1', true);
    vale4.requestVale4('p1');
    vale4.respondToVale4('p2', false);
    assert.deepStrictEqual(vale4.teams.map(t => t.score), [3, 0]);
  });

  it('subir a aposta sem aceitar a anterior vale o nível anterior se recusada', () => {
    const game = createStartedGame(2);
    game.requestTruco('p1');
    game.requestRetruco('p2');
    game.respondToRetruco('p1', false);
    assert.deepStrictEqual(game.teams.map(t => t.score), [0, 2]);
  });

  it('aceitar o Truco não muda de quem é a vez', () => {
    const game = createStartedGame(2);
    game.requestTruco('p1');
    game.respondToTruco('p2', true);

    assert.strictEqual(game.handValue, 2);
    assert.strictEqual(game.players[game.currentTurn].id, 'p1');
    assert.strictEqual(game.requestTruco('p1').success, false);
  });

  it('só pede Truco na própria vez e só o time certo sobe a aposta', () => {
    const game = createStartedGame(2);
    assert.strictEqual(game.requestTruco('p2').success, false);
    game.requestTruco('p1');
    assert.strictEqual(game.requestRetruco('p1').success, false, 'quem pediu não sobe');
    assert.strictEqual(game.requestRetruco('p2').success, true);
    assert.strictEqual(game.requestVale4('p2').success, false, 'quem pediu o Retruco não pede Vale 4');
    assert.strictEqual(game.requestVale4('p1').success, true);
  });

  it('a mão vale o nível aceito ao final', async () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('3', 'copas'), C('3', 'paus'), C('4', 'paus')];
    game.players[1].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'copas')];
    game.requestTruco('p1');
    game.respondToTruco('p2', true);

    await playRound2p(game, ['3', 'copas'], ['4', 'copas']);
    play(game, 'p1', '3', 'paus');
    play(game, 'p2', '5', 'copas');

    assert.deepStrictEqual(game.teams.map(t => t.score), [2, 0]);
  });
});

describe('Envido', () => {
  const setup = (h1, h2) => {
    const game = createStartedGame(2);
    game.players[0].hand = h1;
    game.players[1].hand = h2;
    return game;
  };

  it('usa a mão original, mesmo depois de o oponente já ter jogado uma carta', () => {
    const game = setup(
      [C('7', 'ouros'), C('6', 'ouros'), C('1', 'paus')],
      [C('3', 'paus'), C('2', 'paus'), C('1', 'ouros')]
    );
    play(game, 'p1', '7', 'ouros');

    assert.strictEqual(game.requestEnvido('p2').success, true);
    const result = game.respondToEnvido('p1', true);

    assert.strictEqual(result.team1Envido, 33);
    assert.strictEqual(result.team2Envido, 25);
    assert.strictEqual(result.winningTeam, 1);
    assert.deepStrictEqual(game.teams.map(t => t.score), [2, 0]);
  });

  it('empate no Envido vai para o time do "mão"', () => {
    const game = setup(
      [C('7', 'copas'), C('12', 'copas'), C('3', 'paus')],
      [C('7', 'paus'), C('10', 'paus'), C('4', 'ouros')]
    );
    game.requestEnvido('p1');
    const result = game.respondToEnvido('p2', true);

    assert.strictEqual(result.team1Envido, result.team2Envido);
    assert.strictEqual(result.winningTeam, 1);
  });

  it('só pode ser pedido uma vez por mão', () => {
    const game = createStartedGame(2);
    assert.strictEqual(game.requestEnvido('p1').success, true);
    game.respondToEnvido('p2', false);

    assert.strictEqual(game.envidoResolved, true);
    assert.strictEqual(game.requestEnvido('p1').success, false);
    assert.strictEqual(game.requestRealEnvido('p1').success, false);
    assert.strictEqual(game.requestFaltaEnvido('p1').success, false);
    assert.deepStrictEqual(game.teams.map(t => t.score), [1, 0]);
  });

  it('não pode ser pedido depois da primeira rodada nem depois de jogar carta', async () => {
    const game = createStartedGame(2);
    const card = game.players[0].hand[0];
    play(game, 'p1', card.value, card.suit);
    assert.strictEqual(game.requestEnvido('p1').success, false);

    const later = createStartedGame(2);
    later.players[0].hand = [C('4', 'copas'), C('2', 'copas'), C('4', 'paus')];
    later.players[1].hand = [C('3', 'paus'), C('2', 'paus'), C('6', 'copas')];
    await playRound2p(later, ['4', 'copas'], ['3', 'paus']);
    assert.strictEqual(later.requestEnvido('p2').success, false);
  });

  it('bloqueia jogadas até a resposta', () => {
    const game = createStartedGame(2);
    game.requestEnvido('p1');
    const card = game.players[0].hand[0];
    assert.match(play(game, 'p1', card.value, card.suit).message, /Envido/);
  });

  it('Real Envido e Falta Envido sobem o Envido; recusar paga o nível anterior', () => {
    const game = createStartedGame(2);
    game.requestEnvido('p1');
    assert.strictEqual(game.requestRealEnvido('p1').success, false, 'quem pediu não sobe');
    assert.strictEqual(game.requestRealEnvido('p2').success, true);
    assert.strictEqual(game.requestFaltaEnvido('p1').success, true);
    const result = game.respondToEnvido('p2', false);

    assert.strictEqual(result.points, 5);
    assert.deepStrictEqual(game.teams.map(t => t.score), [5, 0]);
  });

  it('Falta Envido aceito dá os pontos que faltam para o vencedor', () => {
    const game = setup(
      [C('7', 'copas'), C('6', 'copas'), C('3', 'paus')],
      [C('4', 'paus'), C('5', 'copas'), C('2', 'ouros')]
    );
    game.teams[0].score = 4;
    game.requestFaltaEnvido('p1');
    game.respondToEnvido('p2', true);

    assert.strictEqual(game.gameStatus, 'finished');
    assert.strictEqual(game.gameWinner.id, 1);
  });

  it('no 2x2 só os dois últimos jogadores da rodada pedem Envido', () => {
    const game = createStartedGame(4);
    assert.strictEqual(game.requestEnvido('p1').success, false);

    const c1 = game.players[0].hand[0];
    const c2 = game.players[1].hand[0];
    play(game, 'p1', c1.value, c1.suit);
    play(game, 'p2', c2.value, c2.suit);
    assert.strictEqual(game.requestEnvido('p3').success, true);
  });
});

describe('Flor', () => {
  const florHand = (suit) => [C('4', suit), C('5', suit), C('6', suit)];

  it('sem Flor no time adversário, os 3 pontos saem na hora', () => {
    const game = createStartedGame(2);
    game.players[0].hand = florHand('copas');
    game.players[1].hand = [C('7', 'ouros'), C('6', 'paus'), C('5', 'espadas')];

    const result = game.declareFlor('p1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.resolved, true);
    assert.strictEqual(game.florState, null);
    assert.deepStrictEqual(game.teams.map(t => t.score), [3, 0]);
    assert.strictEqual(game.declareFlor('p1').success, false, 'só uma vez por mão');
  });

  it('com Flor dos dois lados fica pendente e o adversário responde', () => {
    const game = createStartedGame(2);
    game.players[0].hand = florHand('copas');
    game.players[1].hand = [C('7', 'ouros'), C('6', 'ouros'), C('5', 'ouros')];

    const declared = game.declareFlor('p1');
    assert.strictEqual(declared.resolved, undefined);
    assert.strictEqual(game.florState.level, 'flor');
    assert.strictEqual(game.florState.value, 3, 'o valor da Flor não é revelado, só os pontos em jogo');
    assert.match(play(game, 'p1', '4', 'copas').message, /Flor/);

    const result = game.respondToFlor('p2', true);
    assert.strictEqual(result.winningTeam, 2, '38 x 35');
    assert.deepStrictEqual(game.teams.map(t => t.score), [0, 3]);
    assert.strictEqual(game.declareFlor('p2').success, false);
  });

  it('Contra-Flor e Contra-Flor e o Resto exigem Flor e sobem a aposta', () => {
    const game = createStartedGame(2);
    game.players[0].hand = florHand('copas');
    game.players[1].hand = [C('7', 'ouros'), C('6', 'ouros'), C('5', 'ouros')];
    game.declareFlor('p1');

    assert.strictEqual(game.requestContraFlor('p1').success, false, 'quem cantou não contesta');
    assert.strictEqual(game.requestContraFlor('p2').success, true);
    assert.strictEqual(game.requestContraFlorResto('p1').success, true);
    const result = game.respondToFlor('p2', false);

    assert.strictEqual(result.points, 6);
    assert.deepStrictEqual(game.teams.map(t => t.score), [6, 0]);
  });

  it('recusar a Flor dá 3 pontos a quem cantou', () => {
    const game = createStartedGame(2);
    game.players[0].hand = florHand('copas');
    game.players[1].hand = [C('7', 'ouros'), C('6', 'ouros'), C('5', 'ouros')];
    game.declareFlor('p1');
    game.respondToFlor('p2', false);
    assert.deepStrictEqual(game.teams.map(t => t.score), [3, 0]);
  });

  it('só pode ser cantada antes de jogar a primeira carta', () => {
    const game = createStartedGame(2);
    game.players[0].hand = florHand('copas');
    play(game, 'p1', '4', 'copas');
    assert.strictEqual(game.declareFlor('p1').success, false);
  });

  it('não canta Flor quem não tem', () => {
    const game = createStartedGame(2);
    game.players[0].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'ouros')];
    assert.strictEqual(game.declareFlor('p1').message, 'Jogador não tem Flor');
  });
});

describe('Estado enviado aos clientes', () => {
  it('cada jogador recebe apenas a própria mão', () => {
    const game = createStartedGame(2);
    const stateP1 = game.getGameState('p1');

    assert.strictEqual(stateP1.players.find(p => p.id === 'p1').hand.length, 3);
    const opponent = stateP1.players.find(p => p.id === 'p2');
    assert.strictEqual(opponent.hand.length, 0);
    assert.strictEqual(opponent.handCount, 3);

    const publicState = game.getGameState();
    publicState.players.forEach(p => assert.strictEqual(p.hand.length, 0));
    assert.strictEqual(publicState.me, null);
  });

  it('não vaza cartas em nenhum outro campo do estado', () => {
    const game = createStartedGame(2);
    const opponentCards = game.players[1].hand.map(c => c.display);
    const json = JSON.stringify(game.getGameState('p1'));
    opponentCards.forEach(display => assert.ok(!json.includes(`"display":"${display}"`)));
  });

  it('o vencedor é enviado como id do time e o estado traz o valor do Envido/Flor só do dono', () => {
    const game = createStartedGame(2);
    game.awardPoints(game.teams[1], 12);
    assert.strictEqual(game.getGameState('p1').gameWinner, 2);
    assert.strictEqual(typeof game.getGameState('p1').me.envido, 'number');
  });
});
