const assert = require('assert');
const gameController = require('../controllers/gameController');
const ioModule = require('../socket/io');
const { C, wait } = require('./helpers');

describe('gameController', () => {
  let emitted;

  beforeEach(() => {
    gameController.gameRooms.forEach(room => room.game.dispose());
    gameController.gameRooms.clear();
    emitted = [];

    ioModule.init({
      to: (channel) => ({ emit: (event, data) => emitted.push({ channel, event, data }) }),
      emit: (event, data) => emitted.push({ channel: null, event, data })
    });
  });

  const startRoom = (playerIds) => {
    const room = gameController.createRoom('sala', playerIds.length);
    playerIds.forEach((id, i) => gameController.addPlayerToRoom(room.id, id, `Jogador ${i + 1}`));
    playerIds.forEach(id => gameController.setPlayerReady(room.id, id));
    room.game.roundDelayMs = 1;
    emitted = [];
    return room;
  };

  describe('salas', () => {
    it('gera ids de sala únicos mesmo quando criadas no mesmo instante', () => {
      const ids = new Set();
      for (let i = 0; i < 50; i++) ids.add(gameController.createRoom(`sala ${i}`, 2).id);
      assert.strictEqual(ids.size, 50);
    });

    it('recusa número de jogadores inválido', () => {
      assert.throws(() => gameController.createRoom('x', NaN));
      assert.throws(() => gameController.createRoom('x', 3));
    });

    it('limita a quantidade de salas', () => {
      for (let i = 0; i < 200; i++) gameController.createRoom(`sala ${i}`, 2);
      assert.throws(() => gameController.createRoom('extra', 2), /Limite de salas/);
    });

    it('a visão pública da sala não expõe o jogo, o baralho nem as cartas', () => {
      const room = startRoom(['a', 'b']);
      const json = JSON.stringify(gameController.toPublicRoom(room));

      assert.ok(!json.includes('deck'));
      assert.ok(!json.includes('hand'));
      assert.ok(!json.includes('"game"'));
      assert.strictEqual(gameController.toPublicRoom(room).players.length, 2);
    });

    it('lista salas com contagem de jogadores e status', () => {
      const room = gameController.createRoom('Minha sala', 4);
      gameController.addPlayerToRoom(room.id, 'a', 'A');
      assert.deepStrictEqual(gameController.getAllRooms(), [
        { id: room.id, name: 'Minha sala', players: 1, maxPlayers: 4, status: 'waiting', hasPassword: false, bots: 0 }
      ]);
    });

    it('entrar de novo com o mesmo id é idempotente e não duplica o jogador', () => {
      const room = gameController.createRoom('sala', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'A');
      const again = gameController.addPlayerToRoom(room.id, 'a', 'A');

      assert.strictEqual(again.success, true);
      assert.strictEqual(room.players.length, 1);
    });

    it('não aceita jogador novo com a partida em andamento nem sala cheia', () => {
      const room = startRoom(['a', 'b']);
      assert.strictEqual(gameController.addPlayerToRoom(room.id, 'c', 'C').success, false);
    });

    it('remove a sala e libera os timers quando o último jogador sai', () => {
      const room = gameController.createRoom('sala', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'A');
      const result = gameController.removePlayerFromRoom(room.id, 'a');

      assert.strictEqual(result.roomDeleted, true);
      assert.strictEqual(gameController.getRoom(room.id), undefined);
    });

    it('remove salas vazias esquecidas depois do prazo', () => {
      const room = gameController.createRoom('sala', 2);
      room.createdAt = Date.now() - 10 * 60 * 1000;
      gameController.checkEmptyRooms();
      assert.strictEqual(gameController.getRoom(room.id), undefined);
    });
  });

  describe('estado enviado a cada jogador', () => {
    it('cada jogador recebe o estado no seu canal privado, só com a própria mão', () => {
      const room = startRoom(['a', 'b']);
      gameController.broadcastState(room.id);

      const updates = emitted.filter(e => e.event === 'game_state_updated');
      assert.strictEqual(updates.length, 2);

      updates.forEach(update => {
        const viewerId = update.channel.replace('player:', '');
        update.data.gameState.players.forEach(p => {
          assert.strictEqual(p.hand.length, p.id === viewerId ? 3 : 0);
        });
      });
    });

    it('nunca emite o estado para o canal da sala inteira', () => {
      const room = startRoom(['a', 'b']);
      const card = room.game.players[0].hand[0];
      gameController.playCard(room.id, 'a', { value: card.value, suit: card.suit });

      const roomWide = emitted.filter(e => e.event === 'game_state_updated' && e.channel === room.id);
      assert.strictEqual(roomWide.length, 0);
    });

    it('as ações bem sucedidas retransmitem o estado; as recusadas não', () => {
      const room = startRoom(['a', 'b']);

      assert.strictEqual(gameController.requestTruco(room.id, 'b').success, false);
      assert.strictEqual(emitted.length, 0);

      assert.strictEqual(gameController.requestTruco(room.id, 'a').success, true);
      assert.strictEqual(emitted.filter(e => e.event === 'game_state_updated').length, 2);
    });

    it('retransmite o estado quando a mesa é limpa depois da rodada (timer interno)', async () => {
      const room = startRoom(['a', 'b']);
      room.game.players[0].hand = [C('3', 'copas'), C('2', 'copas'), C('4', 'paus')];
      room.game.players[1].hand = [C('4', 'copas'), C('5', 'copas'), C('6', 'copas')];

      gameController.playCard(room.id, 'a', { value: '3', suit: 'copas' });
      gameController.playCard(room.id, 'b', { value: '4', suit: 'copas' });
      emitted = [];

      await wait();
      const updates = emitted.filter(e => e.event === 'game_state_updated');
      assert.strictEqual(updates.length, 2);
      assert.strictEqual(updates[0].data.gameState.playedCards.length, 0);
    });

    it('ações em sala inexistente ou fora de partida falham sem lançar exceção', () => {
      assert.strictEqual(gameController.requestTruco('nao-existe', 'a').success, false);

      const room = gameController.createRoom('sala', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'A');
      assert.strictEqual(gameController.requestTruco(room.id, 'a').message, 'O jogo não está em andamento');
      assert.doesNotThrow(() => gameController.requestContraFlor(room.id, 'a'));
      assert.doesNotThrow(() => gameController.respondToFlor(room.id, 'a', true));
    });
  });

  describe('desconexão e reconexão', () => {
    const originalGrace = { ...gameController.RECONNECT_GRACE_MS };
    afterEach(() => Object.assign(gameController.RECONNECT_GRACE_MS, originalGrace));

    it('marca o jogador como desconectado e avisa a sala', () => {
      const room = startRoom(['a', 'b']);
      gameController.handlePlayerDisconnected('a');

      assert.strictEqual(room.game.players[0].connected, false);
      const state = emitted.find(e => e.event === 'game_state_updated');
      assert.strictEqual(state.data.gameState.players.find(p => p.id === 'a').connected, false);
      assert.ok(emitted.some(e => e.event === 'game_notice' && /conexão/.test(e.data.message)));
    });

    it('reconectar dentro do prazo cancela a remoção', async () => {
      gameController.RECONNECT_GRACE_MS.playing = 20;
      const room = startRoom(['a', 'b']);

      gameController.handlePlayerDisconnected('a');
      gameController.handlePlayerReconnected('a');
      await wait(60);

      assert.strictEqual(room.game.players.length, 2);
      assert.strictEqual(room.game.players[0].connected, true);
      assert.strictEqual(room.game.gameStatus, 'playing');
    });

    it('sem reconexão o jogador é removido, o adversário vence por W.O. e todos são avisados', async () => {
      gameController.RECONNECT_GRACE_MS.playing = 20;
      const room = startRoom(['a', 'b']);
      let removedNotified = null;

      gameController.handlePlayerDisconnected('a', (playerId) => { removedNotified = playerId; });
      await wait(60);

      assert.strictEqual(removedNotified, 'a');
      assert.strictEqual(room.game.players.length, 1);
      assert.strictEqual(room.game.gameStatus, 'finished');
      assert.strictEqual(room.game.gameWinner.id, 2);
      assert.ok(emitted.some(e => e.event === 'game_notice' && /removido/.test(e.data.message)));
    });

    it('encontra a sala de um jogador para restaurar a sessão', () => {
      const room = startRoom(['a', 'b']);
      assert.strictEqual(gameController.findRoomByPlayer('a').id, room.id);
      assert.strictEqual(gameController.findRoomByPlayer('desconhecido'), null);
    });
  });
});
