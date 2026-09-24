const assert = require('assert');
const { Card, Deck, Player, Team, TrucoGame } = require('../models/TrucoGame');
const { C, createStartedGame, play } = require('./helpers');

describe('Card', () => {
  it('deve criar uma carta com os valores corretos', () => {
    const card = new Card('7', 'ouros');
    assert.strictEqual(card.value, '7');
    assert.strictEqual(card.suit, 'ouros');
    assert.strictEqual(card.isRed, true);
  });

  it('deve identificar manilhas corretamente', () => {
    [C('7', 'ouros'), C('7', 'espadas'), C('1', 'paus'), C('1', 'espadas')]
      .forEach(card => assert.strictEqual(card.isManilha, true));
    [C('7', 'paus'), C('7', 'copas'), C('1', 'ouros'), C('1', 'copas')]
      .forEach(card => assert.strictEqual(card.isManilha, false));
  });

  it('deve comparar cartas corretamente', () => {
    const tres = C('3', 'ouros');
    const dois = C('2', 'paus');
    const seteOuros = C('7', 'ouros');
    const asEspadas = C('1', 'espadas');

    assert.ok(tres.compareWith(dois) > 0);
    assert.ok(seteOuros.compareWith(tres) > 0);
    assert.ok(tres.compareWith(seteOuros) < 0);
    assert.ok(asEspadas.compareWith(seteOuros) > 0);
    assert.strictEqual(C('3', 'copas').compareWith(C('3', 'paus')), 0);
  });

  it('deve calcular o valor de Envido corretamente', () => {
    assert.strictEqual(C('7', 'ouros').getEnvidoValue(), 7);
    assert.strictEqual(C('1', 'paus').getEnvidoValue(), 1);
    assert.strictEqual(C('10', 'copas').getEnvidoValue(), 0);
  });
});

describe('Deck', () => {
  it('deve criar um baralho com 40 cartas sem repetições', () => {
    const deck = new Deck();
    assert.strictEqual(deck.cards.length, 40);
    assert.strictEqual(new Set(deck.cards.map(c => c.display)).size, 40);
  });

  it('deve distribuir o número correto de cartas', () => {
    const deck = new Deck();
    const hands = deck.deal(4, 3);
    assert.strictEqual(hands.length, 4);
    hands.forEach(hand => assert.strictEqual(hand.length, 3));
    assert.strictEqual(deck.cards.length, 28);
  });
});

describe('Player', () => {
  it('deve calcular o Envido com cartas do mesmo naipe', () => {
    const player = new Player('a', 'A', 1);
    player.hand = [C('7', 'ouros'), C('6', 'ouros'), C('1', 'paus')];
    assert.strictEqual(player.calculateEnvido(), 33);
  });

  it('deve calcular o Envido com naipes diferentes usando a maior carta', () => {
    const player = new Player('a', 'A', 1);
    player.hand = [C('7', 'ouros'), C('6', 'paus'), C('1', 'copas')];
    assert.strictEqual(player.calculateEnvido(), 7);
  });

  it('deve manter Envido e Flor mesmo depois de jogar cartas', () => {
    const player = new Player('a', 'A', 1);
    player.hand = [C('7', 'ouros'), C('6', 'ouros'), C('5', 'ouros')];
    player.removeFromHand({ value: '7', suit: 'ouros' });

    assert.strictEqual(player.hand.length, 2);
    assert.strictEqual(player.hasFlor(), true);
    assert.strictEqual(player.calculateFlor(), 38);
    assert.strictEqual(player.calculateEnvido(), 33);
  });

  it('deve identificar Flor e calcular seu valor', () => {
    const withFlor = new Player('a', 'A', 1);
    withFlor.hand = [C('7', 'ouros'), C('6', 'ouros'), C('1', 'ouros')];
    const withoutFlor = new Player('b', 'B', 1);
    withoutFlor.hand = [C('7', 'ouros'), C('6', 'ouros'), C('1', 'paus')];

    assert.strictEqual(withFlor.hasFlor(), true);
    assert.strictEqual(withoutFlor.hasFlor(), false);
    assert.strictEqual(withFlor.calculateFlor(), 34);
  });
});

describe('Team', () => {
  it('deve gerenciar jogadores, pontos e rodadas', () => {
    const team = new Team(1, 'Time 1');
    team.addPlayer(new Player('a', 'A', 1));
    team.addPlayer(new Player('b', 'B', 1));
    team.addPoints(3);
    team.addPoints(2);
    team.addRoundWin();
    team.addRoundWin();

    assert.strictEqual(team.players.length, 2);
    assert.strictEqual(team.score, 5);
    assert.strictEqual(team.roundsWon, 2);
    team.resetRoundWins();
    assert.strictEqual(team.roundsWon, 0);
  });
});

describe('TrucoGame - sala e início', () => {
  it('deve inicializar o jogo corretamente', () => {
    const game = new TrucoGame('room1', 2);
    assert.strictEqual(game.roomId, 'room1');
    assert.strictEqual(game.maxPlayers, 2);
    assert.strictEqual(game.players.length, 0);
    assert.strictEqual(game.teams.length, 2);
    assert.strictEqual(game.gameStatus, 'waiting');
  });

  it('deve alternar os jogadores entre os times', () => {
    const game = new TrucoGame('room1', 4);
    ['a', 'b', 'c', 'd'].forEach(id => game.addPlayer(id, id));
    assert.deepStrictEqual(game.players.map(p => p.team), [1, 2, 1, 2]);
  });

  it('deve rejeitar sala cheia, jogador repetido e entrada com a partida em andamento', () => {
    const game = new TrucoGame('room1', 2);
    game.addPlayer('a', 'A');
    assert.strictEqual(game.addPlayer('a', 'A').success, false);
    game.addPlayer('b', 'B');
    assert.strictEqual(game.addPlayer('c', 'C').message, 'Sala cheia');
  });

  it('só deve iniciar com a sala completa e todos prontos', () => {
    const game = new TrucoGame('room1', 4);
    game.addPlayer('a', 'A');
    game.addPlayer('b', 'B');
    game.setPlayerReady('a');
    game.setPlayerReady('b');
    assert.strictEqual(game.gameStatus, 'waiting', 'sala de 4 não pode começar com 2 jogadores');

    game.addPlayer('c', 'C');
    game.addPlayer('d', 'D');
    game.setPlayerReady('c');
    assert.strictEqual(game.gameStatus, 'waiting');
    game.setPlayerReady('d');
    assert.strictEqual(game.gameStatus, 'playing');
    game.players.forEach(p => assert.strictEqual(p.hand.length, 3));
  });

  it('não deve aceitar novos jogadores depois que a partida começou', () => {
    const game = createStartedGame(2);
    game.maxPlayers = 4;
    assert.strictEqual(game.addPlayer('novo', 'Novo').success, false);
  });

  it('deve manter os times equilibrados quando alguém sai da sala de espera', () => {
    const game = new TrucoGame('room1', 4);
    ['a', 'b', 'c'].forEach(id => game.addPlayer(id, id));
    game.removePlayer('b');
    game.addPlayer('d', 'd');

    assert.deepStrictEqual(game.players.map(p => p.team), [1, 2, 1]);
    assert.strictEqual(game.teams[0].players.length, 2);
    assert.strictEqual(game.teams[1].players.length, 1);
  });
});

describe('TrucoGame - jogar cartas', () => {
  it('deve permitir jogar apenas na vez e apenas cartas da própria mão', () => {
    const game = createStartedGame(2);
    const p2Card = game.players[1].hand[0];

    assert.strictEqual(play(game, 'p2', p2Card.value, p2Card.suit).message, 'Não é sua vez de jogar');

    const p1Card = game.players[0].hand[0];
    assert.strictEqual(play(game, 'p1', p1Card.value, p1Card.suit).success, true);
    assert.strictEqual(game.players[0].hand.length, 2);
    assert.strictEqual(game.playedCards.length, 1);

    assert.strictEqual(game.playCard('p2', { value: 'x', suit: 'y' }).message, 'Carta inválida');
    assert.strictEqual(game.playCard('p2', null).message, 'Carta inválida');
  });

  it('deve determinar o vencedor da rodada no 2x2', () => {
    const game = createStartedGame(4);
    game.players[0].hand = [C('3', 'ouros')];
    game.players[1].hand = [C('2', 'paus')];
    game.players[2].hand = [C('4', 'paus')];
    game.players[3].hand = [C('5', 'paus')];

    play(game, 'p1', '3', 'ouros');
    play(game, 'p2', '2', 'paus');
    play(game, 'p3', '4', 'paus');
    play(game, 'p4', '5', 'paus');

    assert.strictEqual(game.teams[0].roundsWon, 1);
    assert.strictEqual(game.teams[1].roundsWon, 0);
  });
});

describe('TrucoGame - removePlayer', () => {
  const build = (n, turn) => {
    const game = new TrucoGame('room1', n);
    for (let i = 1; i <= n; i++) game.addPlayer(`player${i}`, `Jogador ${i}`);
    game.gameStatus = 'playing';
    game.currentTurn = turn;
    return game;
  };

  it('deve ajustar o turno quando um jogador anterior ao atual é removido', () => {
    const game = build(4, 2);
    game.removePlayer('player1');
    assert.strictEqual(game.currentTurn, 1);
    assert.strictEqual(game.players[game.currentTurn].id, 'player3');
  });

  it('deve manter o turno quando um jogador posterior ao atual é removido', () => {
    const game = build(4, 0);
    game.removePlayer('player3');
    assert.strictEqual(game.currentTurn, 0);
    assert.strictEqual(game.players[game.currentTurn].id, 'player1');
  });

  it('deve voltar o turno para 0 se o último jogador da lista era o da vez', () => {
    const game = build(3, 2);
    game.removePlayer('player3');
    assert.strictEqual(game.currentTurn, 0);
  });

  it('quem sai de uma partida em andamento perde por W.O.', () => {
    const game = createStartedGame(2);
    game.removePlayer('p1');
    assert.strictEqual(game.gameStatus, 'finished');
    assert.strictEqual(game.gameWinner.id, 2);
  });

  it('deve sinalizar sala vazia e reiniciar o estado', () => {
    const game = createStartedGame(2);
    game.teams[0].score = 5;
    game.removePlayer('p1');
    const result = game.removePlayer('p2');
    assert.strictEqual(result.roomEmpty, true);
    assert.strictEqual(game.teams[0].score, 0);
    assert.strictEqual(game.gameStatus, 'waiting');
  });
});

describe('TrucoGame - fim de jogo e revanche', () => {
  it('deve terminar o jogo quando um time atingir a pontuação alvo', () => {
    const game = createStartedGame(2);
    game.targetScore = 5;
    game.teams[0].addPoints(5);
    game.endHand(game.teams[0]);

    assert.strictEqual(game.gameWinner, game.teams[0]);
    assert.strictEqual(game.gameStatus, 'finished');
  });

  it('deve reiniciar a partida quando todos votam por jogar novamente', () => {
    const game = createStartedGame(2);
    game.awardPoints(game.teams[0], 12);
    assert.strictEqual(game.gameStatus, 'finished');

    assert.strictEqual(game.voteRematch('p1').restarted, false);
    assert.strictEqual(game.voteRematch('p2').restarted, true);

    assert.strictEqual(game.gameStatus, 'waiting');
    assert.strictEqual(game.gameWinner, null);
    assert.deepStrictEqual(game.teams.map(t => t.score), [0, 0]);
    game.players.forEach(p => assert.strictEqual(p.isReady, false));

    game.setPlayerReady('p1');
    game.setPlayerReady('p2');
    assert.strictEqual(game.gameStatus, 'playing');
  });

  it('só permite votar por revanche quando a partida terminou', () => {
    const game = createStartedGame(2);
    assert.strictEqual(game.voteRematch('p1').success, false);
  });
});
