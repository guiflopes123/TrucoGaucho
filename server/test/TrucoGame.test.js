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
    const newGame = new TrucoGame('room1', 2);
    newGame.addPlayer('player1', 'Jogador 1');
    newGame.addPlayer('player2', 'Jogador 2');
    newGame.setPlayerReady('player1');
    newGame.setPlayerReady('player2');

    const result = newGame.requestEnvido('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(newGame.envidoState.level, 'envido');
  });

  it('deve permitir responder ao Envido', () => {
    const newGame = new TrucoGame('room1', 2);
    newGame.addPlayer('player1', 'Jogador 1');
    newGame.addPlayer('player2', 'Jogador 2');
    newGame.setPlayerReady('player1');
    newGame.setPlayerReady('player2');

    newGame.players[0].hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'paus')
    ]; // Envido = 33

    newGame.players[1].hand = [
      new Card('3', 'paus'),
      new Card('2', 'paus'),
      new Card('1', 'ouros')
    ]; // Envido = 25

    newGame.requestEnvido('player1');

    const result = newGame.respondToEnvido('player2', true);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.winningTeam, 1);
    assert.strictEqual(newGame.teams[0].score, 2);
  });

  it('deve permitir declarar Flor quando ninguém mais tem Flor (resolve sozinho, 3 pontos)', () => {
    const newGame = new TrucoGame('room1', 2);
    newGame.addPlayer('player1', 'Jogador 1');
    newGame.addPlayer('player2', 'Jogador 2');
    newGame.setPlayerReady('player1');
    newGame.setPlayerReady('player2');

    newGame.players[0].hand = [
      new Card('7', 'ouros'),
      new Card('6', 'ouros'),
      new Card('1', 'ouros')
    ];
    newGame.players[1].hand = [
      new Card('5', 'copas'),
      new Card('4', 'espadas'),
      new Card('2', 'paus')
    ]; // sem Flor

    const result = newGame.declareFlor('player1');
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.autoResolved, true);
    assert.strictEqual(newGame.florState.level, 'flor');
    assert.strictEqual(newGame.florState.resolved, true);
    assert.strictEqual(newGame.teams[0].score, 3);
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

  describe('Betting Flow', () => {
    it('deve incluir as informações de time no estado do jogo', () => {
      const newGame = new TrucoGame('room1', 4);
      newGame.addPlayer('player1', 'Jogador 1');
      newGame.addPlayer('player2', 'Jogador 2');
      newGame.addPlayer('player3', 'Jogador 3');
      newGame.addPlayer('player4', 'Jogador 4');

      // Marcar todos como prontos para garantir que o estado do jogo esteja atualizado
      newGame.setPlayerReady('player1');
      newGame.setPlayerReady('player2');
      newGame.setPlayerReady('player3');
      newGame.setPlayerReady('player4');

      const gameState = newGame.getGameState();

      gameState.players.forEach((player, index) => {
        const expectedTeam = (index % 2) + 1;
        assert.strictEqual(player.team, expectedTeam, `Jogador ${player.id} deveria estar no time ${expectedTeam}`);
      });
    });

    it('deve lidar corretamente com a sequência de truco -> retruco -> vale 4', () => {
      const newGame = new TrucoGame('room1', 2);
      newGame.addPlayer('player1', 'Jogador 1');
      newGame.addPlayer('player2', 'Jogador 2');
      newGame.setPlayerReady('player1');
      newGame.setPlayerReady('player2');

      // Player 1 pede truco
      let trucoResult = newGame.requestTruco('player1');
      assert.strictEqual(trucoResult.success, true, 'Falha ao pedir truco');
      assert.strictEqual(newGame.trucoState.level, 'truco');
      assert.strictEqual(newGame.trucoState.respondingTeam, 2, 'O time respondente do truco está incorreto');

      // Player 2 pede retruco
      let retrucoResult = newGame.requestRetruco('player2');
      assert.strictEqual(retrucoResult.success, true, 'Falha ao pedir retruco');
      assert.strictEqual(newGame.retrucoState.level, 'retruco');
      assert.strictEqual(newGame.trucoState, null, 'O estado do truco não foi limpo');
      assert.strictEqual(newGame.retrucoState.respondingTeam, 1, 'O time respondente do retruco está incorreto');

      // Player 1 pede vale 4
      let vale4Result = newGame.requestVale4('player1');
      assert.strictEqual(vale4Result.success, true, 'Falha ao pedir vale 4');
      assert.strictEqual(newGame.vale4State.level, 'vale4');
      assert.strictEqual(newGame.retrucoState, null, 'O estado do retruco não foi limpo');
      assert.strictEqual(newGame.vale4State.respondingTeam, 2, 'O time respondente do vale 4 está incorreto');

      // Player 2 aceita vale 4
      let responseResult = newGame.respondToVale4('player2', true);
      assert.strictEqual(responseResult.success, true, 'Falha ao responder ao vale 4');
      assert.strictEqual(newGame.handValue, 4, 'O valor da mão deveria ser 4');
    });
  });

  describe('Regras de Envido', () => {
    const setupTwoPlayerGame = () => {
      const newGame = new TrucoGame('room1', 2);
      newGame.addPlayer('player1', 'Jogador 1');
      newGame.addPlayer('player2', 'Jogador 2');
      newGame.setPlayerReady('player1');
      newGame.setPlayerReady('player2');
      return newGame;
    };

    it('fugir do Envido dá 1 ponto para quem pediu', () => {
      const newGame = setupTwoPlayerGame();
      newGame.requestEnvido('player1');
      const result = newGame.respondToEnvido('player2', false);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.accepted, false);
      assert.strictEqual(result.pointsAwarded, 1);
      assert.strictEqual(newGame.teams[0].score, 1);
      assert.strictEqual(newGame.teams[1].score, 0);
    });

    it('Real Envido pedido direto (sem Envido antes): aceito vale 5, fugir custa 1', () => {
      const accepted = setupTwoPlayerGame();
      accepted.requestRealEnvido('player1');
      assert.strictEqual(accepted.envidoState.level, 'realEnvido');
      const acceptResult = accepted.respondToEnvido('player2', true);
      assert.strictEqual(acceptResult.pointsAwarded, 5);

      const fled = setupTwoPlayerGame();
      fled.requestRealEnvido('player1');
      const fleeResult = fled.respondToEnvido('player2', false);
      assert.strictEqual(fleeResult.pointsAwarded, 1);
      assert.strictEqual(fled.teams[0].score, 1);
    });

    it('Real Envido pedido em resposta ao Envido: aceito vale 5, fugir custa 2', () => {
      const newGame = setupTwoPlayerGame();
      newGame.requestEnvido('player1');
      const raise = newGame.requestRealEnvido('player2');
      assert.strictEqual(raise.success, true, 'Time respondente deveria poder subir para Real Envido');
      assert.strictEqual(newGame.envidoState.level, 'realEnvido');
      assert.strictEqual(newGame.envidoState.respondingTeam, 1, 'Agora quem responde é o time que pediu o Envido original');

      const result = newGame.respondToEnvido('player1', false);
      assert.strictEqual(result.pointsAwarded, 2, 'Fugir do Real Envido (que subiu do Envido) deveria custar 2 pontos');
      assert.strictEqual(newGame.teams[1].score, 2, 'Time 2 pediu o Real Envido, então fica com os pontos da fuga');
    });

    it('Falta Envido pedido em resposta ao Real Envido: fugir custa 5 (valor do Real Envido)', () => {
      const newGame = setupTwoPlayerGame();
      newGame.requestRealEnvido('player1');
      const raise = newGame.requestFaltaEnvido('player2');
      assert.strictEqual(raise.success, true);
      assert.strictEqual(newGame.envidoState.level, 'faltaEnvido');

      const result = newGame.respondToEnvido('player1', false);
      assert.strictEqual(result.pointsAwarded, 5);
    });

    it('Falta Envido aceito dá os pontos que faltam para o time líder bater a meta', () => {
      const newGame = setupTwoPlayerGame();
      newGame.targetScore = 12;
      newGame.teams[0].addPoints(9); // faltam 3 para o líder

      newGame.players[0].hand = [new Card('7', 'ouros'), new Card('6', 'ouros'), new Card('1', 'paus')]; // 33
      newGame.players[1].hand = [new Card('3', 'paus'), new Card('2', 'paus'), new Card('1', 'ouros')]; // 25

      newGame.requestFaltaEnvido('player1');
      const result = newGame.respondToEnvido('player2', true);

      assert.strictEqual(result.winningTeam, 1);
      assert.strictEqual(result.pointsAwarded, 3);
      assert.strictEqual(newGame.teams[0].score, 12);
    });

    it('em caso de empate no Envido, vence quem pediu primeiro', () => {
      const newGame = setupTwoPlayerGame();
      newGame.players[0].hand = [new Card('7', 'ouros'), new Card('6', 'ouros'), new Card('1', 'paus')]; // 33
      newGame.players[1].hand = [new Card('7', 'paus'), new Card('6', 'paus'), new Card('1', 'copas')]; // 33

      newGame.requestEnvido('player1');
      const result = newGame.respondToEnvido('player2', true);

      assert.strictEqual(result.team1Envido, result.team2Envido);
      assert.strictEqual(result.winningTeam, 1, 'Time 1 pediu primeiro, deveria vencer o empate');
    });

    it('não permite pedir Envido depois da primeira rodada', () => {
      const newGame = setupTwoPlayerGame();
      newGame.currentRound = 2;
      const result = newGame.requestEnvido('player1');
      assert.strictEqual(result.success, false);
    });

    it('em partidas de 4, só os dois últimos jogadores da rodada podem pedir Envido', () => {
      const newGame = new TrucoGame('room1', 4);
      ['player1', 'player2', 'player3', 'player4'].forEach((id, i) => newGame.addPlayer(id, `Jogador ${i + 1}`));
      newGame.players.forEach(p => newGame.setPlayerReady(p.id));

      // Ainda ninguém jogou: os dois primeiros não podem pedir Envido
      newGame.currentTurn = 0;
      newGame.players.forEach((p, i) => p.isCurrentPlayer = (i === 0));
      const blocked = newGame.requestEnvido('player1');
      assert.strictEqual(blocked.success, false);

      // Depois de 2 cartas jogadas, o 3º jogador já pode pedir
      newGame.playCard('player1', newGame.players[0].hand[0]);
      newGame.playCard('player2', newGame.players[1].hand[0]);
      const allowed = newGame.requestEnvido('player3');
      assert.strictEqual(allowed.success, true);
    });
  });

  describe('Regras de Flor', () => {
    const setupFlorDuel = () => {
      const newGame = new TrucoGame('room1', 2);
      newGame.addPlayer('player1', 'Jogador 1');
      newGame.addPlayer('player2', 'Jogador 2');
      newGame.setPlayerReady('player1');
      newGame.setPlayerReady('player2');

      newGame.players[0].hand = [new Card('7', 'ouros'), new Card('6', 'ouros'), new Card('1', 'ouros')]; // Flor = 34
      newGame.players[1].hand = [new Card('5', 'copas'), new Card('4', 'copas'), new Card('2', 'copas')]; // Flor = 31
      return newGame;
    };

    it('não permite "aceitar" a Flor diretamente quando ambos têm Flor', () => {
      const newGame = setupFlorDuel();
      newGame.declareFlor('player1');
      const result = newGame.respondToFlor('player2', true);
      assert.strictEqual(result.success, false);
    });

    it('fugir da Flor (quando o adversário também tem Flor) custa 4 pontos', () => {
      const newGame = setupFlorDuel();
      newGame.declareFlor('player1');
      const result = newGame.respondToFlor('player2', false);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.pointsAwarded, 4);
      assert.strictEqual(newGame.teams[0].score, 4);
    });

    it('Contra-Flor aceita vale 6 para quem tiver a maior Flor', () => {
      const newGame = setupFlorDuel();
      newGame.declareFlor('player1');
      newGame.requestContraFlor('player2');
      const result = newGame.respondToFlor('player1', true);

      assert.strictEqual(result.success, true);
      assert.strictEqual(result.pointsAwarded, 6);
      assert.strictEqual(result.winningTeam, 1, 'Jogador 1 tem a maior Flor (34 > 31)');
      assert.strictEqual(newGame.teams[0].score, 6);
    });

    it('Contra-Flor e o Resto aceita vale a "Falta" mais os 6 pontos da Contra-Flor', () => {
      const newGame = setupFlorDuel();
      newGame.targetScore = 12;
      newGame.teams[0].addPoints(8); // faltam 4

      newGame.declareFlor('player1');
      newGame.requestContraFlorResto('player2');
      const result = newGame.respondToFlor('player1', true);

      assert.strictEqual(result.pointsAwarded, 10); // 4 (falta) + 6 (Contra-Flor)
      assert.strictEqual(newGame.teams[0].score, 18);
    });

    it('resolve sozinho quando nenhum adversário tem Flor', () => {
      const newGame = new TrucoGame('room1', 2);
      newGame.addPlayer('player1', 'Jogador 1');
      newGame.addPlayer('player2', 'Jogador 2');
      newGame.setPlayerReady('player1');
      newGame.setPlayerReady('player2');

      newGame.players[0].hand = [new Card('7', 'ouros'), new Card('6', 'ouros'), new Card('1', 'ouros')];
      newGame.players[1].hand = [new Card('5', 'copas'), new Card('4', 'espadas'), new Card('2', 'paus')];

      const result = newGame.declareFlor('player1');
      assert.strictEqual(result.autoResolved, true);
      assert.strictEqual(newGame.teams[0].score, 3);
    });

    it('a Flor anula um Envido pendente', () => {
      const newGame = setupFlorDuel();
      newGame.requestEnvido('player1');
      assert.ok(newGame.envidoState);

      newGame.declareFlor('player1');
      assert.strictEqual(newGame.envidoState, null);
    });
  });
});
