const assert = require('assert');
const { Card, Deck, Player, Team, TrucoGame } = require('../models/TrucoGame');

// Testes para a classe Card
describe('Card', () => {
  it('deve criar uma carta com os valores corretos', () => {
    const card = new Card('7', 'ouros');
    assert.strictEqual(card.value, '7');
    assert.strictEqual(card.suit, 'ouros');
    assert.strictEqual(card.isRed, true);
  });

  it('deve identificar manilhas corretamente', () => {
    const manilhas = [
      new Card('7', 'ouros'),
      new Card('7', 'espadas'),
      new Card('1', 'paus'),
      new Card('1', 'espadas')
    ];
    
    const notManilhas = [
      new Card('7', 'paus'),
      new Card('7', 'copas'),
      new Card('1', 'ouros'),
      new Card('1', 'copas')
    ];
    
    manilhas.forEach(card => {
      assert.strictEqual(card.isManilha, true);
    });
    
    notManilhas.forEach(card => {
      assert.strictEqual(card.isManilha, false);
    });
  });

  it('deve comparar cartas corretamente', () => {
    const card1 = new Card('3', 'ouros');
    const card2 = new Card('2', 'paus');
    const card3 = new Card('7', 'ouros'); // Manilha mais baixa
    const card4 = new Card('1', 'espadas'); // Manilha mais alta
    
    // Carta normal vs carta normal
    assert.strictEqual(card1.compareWith(card2) > 0, true); // 3 > 2
    
    // Manilha vs carta normal
    assert.strictEqual(card3.compareWith(card1) > 0, true); // Manilha > carta normal
    
    // Carta normal vs manilha
    assert.strictEqual(card1.compareWith(card3) < 0, true); // Carta normal < manilha
    
    // Manilha vs manilha
    assert.strictEqual(card4.compareWith(card3) > 0, true); // 1 de espadas > 7 de ouros
  });

  it('deve calcular o valor de Envido corretamente', () => {
    const card1 = new Card('7', 'ouros');
    const card2 = new Card('1', 'paus');
    const card3 = new Card('10', 'copas');
    
    assert.strictEqual(card1.getEnvidoValue(), 7);
    assert.strictEqual(card2.getEnvidoValue(), 1);
    assert.strictEqual(card3.getEnvidoValue(), 0); // Figuras valem 0
  });
});

// Testes para a classe Deck
describe('Deck', () => {
  it('deve criar um baralho com 40 cartas', () => {
    const deck = new Deck();
    assert.strictEqual(deck.cards.length, 40);
  });

  it('deve distribuir o número correto de cartas', () => {
    const deck = new Deck();
    const hands = deck.deal(4, 3); // 4 jogadores, 3 cartas cada
    
    assert.strictEqual(hands.length, 4);
    hands.forEach(hand => {
      assert.strictEqual(hand.length, 3);
    });
    
    // Verificar se o baralho tem menos 12 cartas (4 jogadores * 3 cartas)
    assert.strictEqual(deck.cards.length, 28);
  });
});

// Testes para a classe Player
describe('Player', () => {
  it('deve calcular o Envido corretamente com cartas do mesmo naipe', () => {
    const player = new Player('player1', 'Jogador 1', 1);
    player.hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'paus')
    ];
    
    // 7 + 6 + 20 (mesmo naipe) = 33
    assert.strictEqual(player.calculateEnvido(), 33);
  });

  it('deve calcular o Envido corretamente com cartas de naipes diferentes', () => {
    const player = new Player('player1', 'Jogador 1', 1);
    player.hand = [
      new Card('7', 'ouros'),
      new Card('6', 'paus'),
      new Card('1', 'copas')
    ];
    
    // Maior carta = 7
    assert.strictEqual(player.calculateEnvido(), 7);
  });

  it('deve identificar Flor corretamente', () => {
    const playerWithFlor = new Player('player1', 'Jogador 1', 1);
    playerWithFlor.hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'ouros')
    ];
    
    const playerWithoutFlor = new Player('player2', 'Jogador 2', 1);
    playerWithoutFlor.hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'paus')
    ];
    
    assert.strictEqual(playerWithFlor.hasFlor(), true);
    assert.strictEqual(playerWithoutFlor.hasFlor(), false);
  });

  it('deve calcular o valor da Flor corretamente', () => {
    const player = new Player('player1', 'Jogador 1', 1);
    player.hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'ouros')
    ];
    
    // 7 + 6 + 1 + 20 (mesmo naipe) = 34
    assert.strictEqual(player.calculateFlor(), 34);
  });
});

// Testes para a classe Team
describe('Team', () => {
  it('deve adicionar jogadores corretamente', () => {
    const team = new Team(1, 'Time 1');
    const player1 = new Player('player1', 'Jogador 1', 1);
    const player2 = new Player('player2', 'Jogador 2', 1);
    
    team.addPlayer(player1);
    team.addPlayer(player2);
    
    assert.strictEqual(team.players.length, 2);
    assert.strictEqual(team.players[0], player1);
    assert.strictEqual(team.players[1], player2);
  });

  it('deve gerenciar pontuação corretamente', () => {
    const team = new Team(1, 'Time 1');
    
    team.addPoints(3);
    assert.strictEqual(team.score, 3);
    
    team.addPoints(2);
    assert.strictEqual(team.score, 5);
  });

  it('deve gerenciar vitórias de rodada corretamente', () => {
    const team = new Team(1, 'Time 1');
    
    team.addRoundWin();
    assert.strictEqual(team.roundsWon, 1);
    
    team.addRoundWin();
    assert.strictEqual(team.roundsWon, 2);
    
    team.resetRoundWins();
    assert.strictEqual(team.roundsWon, 0);
  });
});

// Testes para a classe TrucoGame
describe('TrucoGame', () => {
  let game;

  beforeEach(() => {
    game = new TrucoGame('room1', 4);
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    game.addPlayer('player3', 'Jogador 3');
    game.addPlayer('player4', 'Jogador 4');
  });

  const readyAllPlayers = (gameInstance) => {
    gameInstance.players.forEach(p => gameInstance.setPlayerReady(p.id));
  };

  it('deve inicializar o jogo corretamente', () => {
    const newGame = new TrucoGame('room1', 2);
    assert.strictEqual(newGame.roomId, 'room1');
    assert.strictEqual(newGame.maxPlayers, 2);
    assert.strictEqual(newGame.players.length, 0);
    assert.strictEqual(newGame.teams.length, 2);
    assert.strictEqual(newGame.gameStatus, 'waiting');
  });

  it('deve adicionar jogadores corretamente', () => {
    const newGame = new TrucoGame('room1', 2);
    newGame.addPlayer('player1', 'Jogador 1');
    assert.strictEqual(newGame.players.length, 1);
    assert.strictEqual(newGame.players[0].id, 'player1');
    assert.strictEqual(newGame.players[0].team, 1);
    
    newGame.addPlayer('player2', 'Jogador 2');
    assert.strictEqual(newGame.players.length, 2);
    assert.strictEqual(newGame.players[1].id, 'player2');
    assert.strictEqual(newGame.players[1].team, 2);
  });

  it('deve iniciar o jogo quando todos os jogadores estiverem prontos', () => {
    const newGame = new TrucoGame('room1', 2);
    newGame.addPlayer('player1', 'Jogador 1');
    newGame.addPlayer('player2', 'Jogador 2');
    
    assert.strictEqual(newGame.gameStatus, 'waiting');
    
    newGame.setPlayerReady('player1');
    assert.strictEqual(newGame.gameStatus, 'waiting');

    newGame.setPlayerReady('player2');
    assert.strictEqual(newGame.gameStatus, 'playing');
  });

  it('deve distribuir cartas para os jogadores ao iniciar o jogo', () => {
    readyAllPlayers(game);
    game.players.forEach(player => {
      assert.strictEqual(player.hand.length, 3);
    });
  });

  it('deve permitir jogar cartas', () => {
    readyAllPlayers(game);
    game.currentTurn = 0;
    game.players[0].isCurrentPlayer = true;
    
    const cardToPlay = game.players[0].hand[0];
    const result = game.playCard('player1', cardToPlay);

    assert.strictEqual(result.success, true);
    assert.strictEqual(game.playedCards.length, 1);
    assert.strictEqual(game.players[0].hand.length, 2);
  });

  it('deve determinar o vencedor da rodada corretamente', function(done) {
    this.timeout(3500); // Aumentar timeout para testes com setTimeout
    readyAllPlayers(game);

    const card1 = new Card('3', 'ouros');
    const card2 = new Card('2', 'paus');
    const card3 = new Card('4', 'paus');
    const card4 = new Card('5', 'paus');

    game.players[0].hand = [card1];
    game.players[1].hand = [card2];
    game.players[2].hand = [card3];
    game.players[3].hand = [card4];

    game.currentTurn = 0;
    game.playCard('player1', card1);
    game.playCard('player2', card2);
    game.playCard('player3', card3);
    game.playCard('player4', card4);

    assert.strictEqual(game.teams[0].roundsWon, 1);
    assert.strictEqual(game.teams[1].roundsWon, 0);
    done();
  });

  it('deve permitir pedir Truco', () => {
    readyAllPlayers(game);
    game.players[0].isCurrentPlayer = true;
    const result = game.requestTruco('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(game.trucoState.level, 'truco');
  });

  it('deve permitir responder ao Truco', () => {
    readyAllPlayers(game);
    game.requestTruco('player1');
    const result = game.respondToTruco('player2', true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.accepted, true);
    assert.strictEqual(game.handValue, 2);
  });

  it('deve permitir pedir Envido', () => {
    readyAllPlayers(game);
    game.players[0].isCurrentPlayer = true;
    const result = game.requestEnvido('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(game.envidoState.level, 'envido');
  });

  it('deve permitir responder ao Envido', () => {
    readyAllPlayers(game);
    game.players[0].hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'paus')
    ]; // Envido = 33
    
    game.players[1].hand = [
      new Card('3', 'paus'),
      new Card('2', 'paus'),
      new Card('1', 'ouros')
    ]; // Envido = 25
    
    game.players[0].isCurrentPlayer = true;
    game.requestEnvido('player1');
    
    const result = game.respondToEnvido('player2', true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.winningTeam, 1);
    assert.strictEqual(game.teams[0].score, 2);
  });

  it('deve permitir declarar Flor', () => {
    readyAllPlayers(game);
    game.players[0].hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'ouros')
    ];
    
    const result = game.declareFlor('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(game.florState.level, 'flor');
  });

  it('deve terminar o jogo quando um time atingir a pontuação alvo', function(done) {
    this.timeout(4000);
    readyAllPlayers(game);
    game.targetScore = 5;
    
    game.teams[0].addPoints(5);
    
    game.endHand(game.teams[0]);
    
    setTimeout(() => {
      assert.strictEqual(game.gameWinner, game.teams[0]);
      assert.strictEqual(game.gameStatus, 'finished');
      done();
    }, 3500);
  });

  describe('removePlayer', () => {
    it('deve ajustar o turno corretamente quando um jogador anterior ao atual é removido', () => {
      const game = new TrucoGame('room1', 4);
      game.addPlayer('player1', 'Jogador 1');
      game.addPlayer('player2', 'Jogador 2');
      game.addPlayer('player3', 'Jogador 3');
      game.addPlayer('player4', 'Jogador 4');

      game.gameStatus = 'playing';
      game.currentTurn = 2; // Vez do Jogador 3

      game.removePlayer('player1'); // Remove o Jogador 1

      assert.strictEqual(game.players.length, 3);
      assert.strictEqual(game.currentTurn, 1, 'O turno deveria ter sido ajustado para 1');
      assert.strictEqual(game.players[game.currentTurn].id, 'player3');
    });

    it('deve passar o turno para o próximo jogador quando o jogador atual é removido', () => {
      const game = new TrucoGame('room1', 4);
      game.addPlayer('player1', 'Jogador 1');
      game.addPlayer('player2', 'Jogador 2');
      game.addPlayer('player3', 'Jogador 3');
      game.addPlayer('player4', 'Jogador 4');

      game.gameStatus = 'playing';
      game.currentTurn = 1; // Vez do Jogador 2

      game.removePlayer('player2'); // Remove o Jogador 2

      assert.strictEqual(game.players.length, 3);
      assert.strictEqual(game.currentTurn, 1, 'O turno deveria ter sido passado para o próximo jogador');
      assert.strictEqual(game.players[game.currentTurn].id, 'player3');
    });

    it('deve manter o turno quando um jogador posterior ao atual é removido', () => {
      const game = new TrucoGame('room1', 4);
      game.addPlayer('player1', 'Jogador 1');
      game.addPlayer('player2', 'Jogador 2');
      game.addPlayer('player3', 'Jogador 3');
      game.addPlayer('player4', 'Jogador 4');

      game.gameStatus = 'playing';
      game.currentTurn = 0; // Vez do Jogador 1

      game.removePlayer('player3'); // Remove o Jogador 3

      assert.strictEqual(game.players.length, 3);
      assert.strictEqual(game.currentTurn, 0, 'O turno não deveria ter mudado');
      assert.strictEqual(game.players[game.currentTurn].id, 'player1');
    });

    it('deve ajustar o turno para 0 se o último jogador da lista é removido e era a sua vez', () => {
      const game = new TrucoGame('room1', 3);
      game.addPlayer('player1', 'Jogador 1');
      game.addPlayer('player2', 'Jogador 2');
      game.addPlayer('player3', 'Jogador 3');

      game.gameStatus = 'playing';
      game.currentTurn = 2; // Vez do Jogador 3

      game.removePlayer('player3'); // Remove o Jogador 3

      assert.strictEqual(game.players.length, 2);
      assert.strictEqual(game.currentTurn, 0, 'O turno deveria voltar para o primeiro jogador');
      assert.strictEqual(game.players[game.currentTurn].id, 'player1');
    });
  });
});
