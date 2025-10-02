const { TrucoGame } = require('../models/TrucoGame');

describe('TrucoGame', () => {
  let game;
  let player1;
  let player2;

  beforeEach(() => {
    game = new TrucoGame('room1', 2);
    player1 = { id: '1', name: 'Player 1' };
    player2 = { id: '2', name: 'Player 2' };
    game.addPlayer(player1.id, player1.name);
    game.addPlayer(player2.id, player2.name);
    game.setPlayerReady(player1.id);
    game.setPlayerReady(player2.id);
  });

  describe('playCard', () => {
    it('deve jogar uma carta corretamente', () => {
      const result = game.playCard(player1.id, 0);
      expect(result.success).toBe(true);
      expect(game.playedCards.length).toBe(1);
      expect(game.players[0].hand.length).toBe(2);
      expect(game.players[0].isCurrentPlayer).toBe(false);
      expect(game.players[1].isCurrentPlayer).toBe(true);
    });

    it('não deve jogar carta se não for a vez do jogador', () => {
      const result = game.playCard(player2.id, 0);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Não é a vez do jogador');
    });

    it('não deve jogar carta se o índice for inválido', () => {
      const result = game.playCard(player1.id, 3);
      expect(result.success).toBe(false);
      expect(result.message).toBe('Carta inválida');
    });
  });

  describe('determineRoundWinner', () => {
    it('deve determinar o vencedor da rodada corretamente', () => {
      game.playCard(player1.id, 0);
      game.playCard(player2.id, 0);
      expect(game.roundWinner).toBeDefined();
      expect(game.playedCards.length).toBe(0);
      expect(game.players[0].playedCard).toBeNull();
      expect(game.players[1].playedCard).toBeNull();
    });
  });
}); 