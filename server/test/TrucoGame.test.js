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
  it('deve inicializar o jogo corretamente', () => {
    const game = new TrucoGame('room1', 2);
    
    assert.strictEqual(game.roomId, 'room1');
    assert.strictEqual(game.maxPlayers, 2);
    assert.strictEqual(game.players.length, 0);
    assert.strictEqual(game.teams.length, 2);
    assert.strictEqual(game.gameStatus, 'waiting');
  });

  it('deve adicionar jogadores corretamente', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    assert.strictEqual(game.players.length, 1);
    assert.strictEqual(game.players[0].id, 'player1');
    assert.strictEqual(game.players[0].team, 1);
    
    game.addPlayer('player2', 'Jogador 2');
    assert.strictEqual(game.players.length, 2);
    assert.strictEqual(game.players[1].id, 'player2');
    assert.strictEqual(game.players[1].team, 2);
  });

  it('deve iniciar o jogo quando atingir o número máximo de jogadores', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    assert.strictEqual(game.gameStatus, 'waiting');
    
    game.addPlayer('player2', 'Jogador 2');
    assert.strictEqual(game.gameStatus, 'playing');
  });

  it('deve distribuir cartas para os jogadores ao iniciar o jogo', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    assert.strictEqual(game.players[0].hand.length, 3);
    assert.strictEqual(game.players[1].hand.length, 3);
  });

  it('deve permitir jogar cartas', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    // Definir o jogador atual
    game.currentTurn = 0;
    game.players[0].isCurrentPlayer = true;
    
    // Jogar uma carta
    const result = game.playCard('player1', 0);
    assert.strictEqual(result.success, true);
    assert.strictEqual(game.playedCards.length, 1);
    assert.strictEqual(game.players[0].hand.length, 2);
  });

  it('deve determinar o vencedor da rodada corretamente', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    // Substituir as cartas dos jogadores para controlar o teste
    game.players[0].hand = [new Card('3', 'ouros')]; // Carta mais forte
    game.players[1].hand = [new Card('2', 'paus')];
    
    // Jogar as cartas
    game.currentTurn = 0;
    game.players[0].isCurrentPlayer = true;
    game.playCard('player1', 0);
    
    game.currentTurn = 1;
    game.players[1].isCurrentPlayer = true;
    game.playCard('player2', 0);
    
    // Verificar se o time 1 ganhou a rodada
    assert.strictEqual(game.teams[0].roundsWon, 1);
    assert.strictEqual(game.teams[1].roundsWon, 0);
  });

  it('deve permitir pedir Truco', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    const result = game.requestTruco('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(game.trucoState.level, 'truco');
    assert.strictEqual(game.trucoState.value, 2);
    assert.strictEqual(game.trucoState.team, 1);
  });

  it('deve permitir responder ao Truco', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    game.requestTruco('player1');
    
    // Aceitar o Truco
    const result = game.respondToTruco('player2', true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.accepted, true);
    assert.strictEqual(game.handValue, 2);
  });

  it('deve permitir pedir Envido', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    const result = game.requestEnvido('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(game.envidoState.level, 'envido');
    assert.strictEqual(game.envidoState.value, 2);
    assert.strictEqual(game.envidoState.team, 1);
  });

  it('deve permitir responder ao Envido', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    // Substituir as cartas dos jogadores para controlar o teste
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
    
    game.requestEnvido('player1');
    
    // Aceitar o Envido
    const result = game.respondToEnvido('player2', true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.accepted, true);
    assert.strictEqual(result.team1Envido, 33);
    assert.strictEqual(result.team2Envido, 25);
    assert.strictEqual(result.winningTeam, 1);
    assert.strictEqual(game.teams[0].score, 2); // Time 1 ganhou 2 pontos
  });

  it('deve permitir declarar Flor', () => {
    const game = new TrucoGame('room1', 2);
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    // Substituir as cartas do jogador 1 para ter Flor
    game.players[0].hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'ouros')
    ];
    
    const result = game.declareFlor('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(game.florState.level, 'flor');
    assert.strictEqual(game.florState.value, 34); // 7 + 6 + 1 + 20 (mesmo naipe)
    assert.strictEqual(game.florState.team, 1);
  });

  it('deve terminar o jogo quando um time atingir a pontuação alvo', () => {
    const game = new TrucoGame('room1', 2);
    game.targetScore = 5; // Reduzir para facilitar o teste
    
    game.addPlayer('player1', 'Jogador 1');
    game.addPlayer('player2', 'Jogador 2');
    
    // Adicionar pontos ao time 1
    game.teams[0].addPoints(5);
    
    // Forçar a verificação de fim de jogo
    game.endHand(game.teams[0]);
    
    // Verificar se o jogo terminou
    assert.strictEqual(game.gameWinner, game.teams[0]);
    assert.strictEqual(game.gameStatus, 'finished');
  });
});
