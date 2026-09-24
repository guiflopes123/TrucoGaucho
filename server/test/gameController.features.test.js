const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const gameController = require('../controllers/gameController');
const persistence = require('../persistence');
const sessions = require('../socket/sessions');
const ioModule = require('../socket/io');
const { wait } = require('./helpers');

describe('gameController - recursos', () => {
  let emitted;
  const originalConfig = { ...gameController.config };

  beforeEach(() => {
    gameController.gameRooms.forEach(room => room.game.dispose());
    gameController.gameRooms.clear();
    emitted = [];
    ioModule.init({
      to: (channel) => ({ emit: (event, data) => emitted.push({ channel, event, data }) }),
      in: () => ({ socketsLeave: () => {} }),
      emit: (event, data) => emitted.push({ channel: null, event, data })
    });
  });

  afterEach(() => {
    Object.assign(gameController.config, originalConfig);
    gameController.gameRooms.forEach(room => room.game.dispose());
    gameController.gameRooms.clear();
  });

  describe('salas com senha e nomes', () => {
    it('exige a senha para entrar e nunca a guarda em texto puro', () => {
      const room = gameController.createRoom('Privada', 2, { password: 'segredo' });
      assert.strictEqual(gameController.toPublicRoom(room).hasPassword, true);
      assert.ok(!JSON.stringify(room.passwordHash).includes('segredo'));

      assert.strictEqual(gameController.addPlayerToRoom(room.id, 'a', 'Ana').needsPassword, true);
      assert.strictEqual(gameController.addPlayerToRoom(room.id, 'a', 'Ana', { password: 'errada' }).message, 'Senha incorreta');
      assert.strictEqual(gameController.addPlayerToRoom(room.id, 'a', 'Ana', { password: 'segredo' }).success, true);
      assert.strictEqual(room.game.players.length, 1);
    });

    it('quem já está na sala reentra sem senha (reconexão)', () => {
      const room = gameController.createRoom('Privada', 2, { password: 'segredo' });
      gameController.addPlayerToRoom(room.id, 'a', 'Ana', { skipPassword: true });
      assert.strictEqual(gameController.addPlayerToRoom(room.id, 'a', 'Ana').success, true);
    });

    it('salas públicas não pedem senha', () => {
      const room = gameController.createRoom('Pública', 2);
      assert.strictEqual(gameController.addPlayerToRoom(room.id, 'a', 'Ana').success, true);
    });

    it('nomes repetidos na mesma sala ganham um sufixo', () => {
      const room = gameController.createRoom('Sala', 4);
      ['a', 'b', 'c'].forEach(id => gameController.addPlayerToRoom(room.id, id, 'Ana'));
      assert.deepStrictEqual(room.game.players.map(p => p.name), ['Ana', 'Ana (2)', 'Ana (3)']);
    });
  });

  describe('limites', () => {
    it('limita quantas salas um mesmo endereço mantém abertas', () => {
      gameController.config.maxRoomsPerIp = 2;
      gameController.createRoom('1', 2, { creatorIp: '10.0.0.1' });
      gameController.createRoom('2', 2, { creatorIp: '10.0.0.1' });
      assert.throws(() => gameController.createRoom('3', 2, { creatorIp: '10.0.0.1' }), /salas demais/);
      assert.doesNotThrow(() => gameController.createRoom('4', 2, { creatorIp: '10.0.0.2' }));
    });

    it('encerra salas ociosas avisando quem está nelas', () => {
      const room = gameController.createRoom('Ociosa', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'Ana');
      room.lastActivity = Date.now() - 31 * 60 * 1000;

      gameController.checkEmptyRooms();
      assert.strictEqual(gameController.getRoom(room.id), undefined);
      assert.ok(emitted.some(e => e.event === 'room_closed' && e.channel === room.id));
    });

    it('não encerra salas com atividade recente', () => {
      const room = gameController.createRoom('Ativa', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'Ana');
      gameController.checkEmptyRooms();
      assert.ok(gameController.getRoom(room.id));
    });
  });

  describe('chat', () => {
    const setup = () => {
      const room = gameController.createRoom('Chat', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'Ana');
      gameController.addPlayerToRoom(room.id, 'b', 'Beto');
      emitted = [];
      return room;
    };

    it('valida, limpa e transmite a mensagem para a sala', () => {
      const room = setup();
      const result = gameController.postChat(room.id, 'a', '  Boa   sorte!\u0000 ');

      assert.strictEqual(result.message.text, 'Boa sorte!');
      assert.strictEqual(result.message.name, 'Ana');
      assert.ok(emitted.some(e => e.event === 'chat_message' && e.channel === room.id));
      assert.strictEqual(room.chat.length, 1);
    });

    it('recusa mensagem vazia, de quem não está na sala e em excesso', () => {
      const room = setup();
      assert.strictEqual(gameController.postChat(room.id, 'a', '   ').success, false);
      assert.strictEqual(gameController.postChat(room.id, 'intruso', 'oi').success, false);
      assert.strictEqual(gameController.postChat(room.id, 'a', 'primeira').success, true);
      assert.match(gameController.postChat(room.id, 'a', 'segunda').message, /rápido demais/);
    });

    it('guarda só as últimas mensagens e limita o tamanho de cada uma', () => {
      const room = setup();
      gameController.config.chatMinIntervalMs = 0;
      gameController.config.chatHistory = 3;
      for (let i = 0; i < 5; i++) gameController.postChat(room.id, 'a', `m${i}`);
      assert.deepStrictEqual(room.chat.map(m => m.text), ['m2', 'm3', 'm4']);
      assert.strictEqual(gameController.postChat(room.id, 'a', 'x'.repeat(500)).message.text.length, 140);
    });
  });

  describe('bots', () => {
    it('adiciona bots até lotar a sala e começa a partida sozinho quando todos estão prontos', () => {
      const room = gameController.createRoom('Vs bot', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'Ana');
      gameController.setPlayerReady(room.id, 'a');
      assert.strictEqual(room.status, 'waiting');

      const result = gameController.addBot(room.id);
      assert.strictEqual(result.success, true);
      assert.ok(result.bot.isBot);
      assert.strictEqual(room.status, 'playing', 'o bot já entra pronto e a partida começa');
      assert.strictEqual(gameController.addBot(room.id).success, false);
    });

    it('remove bots só antes da partida e apaga a sala se sobrarem apenas bots', () => {
      const room = gameController.createRoom('Bots', 4);
      gameController.addPlayerToRoom(room.id, 'a', 'Ana');
      gameController.addBot(room.id);
      assert.strictEqual(gameController.removeBot(room.id).success, true);
      assert.strictEqual(gameController.removeBot(room.id).message, 'Não há bots na sala');

      gameController.addBot(room.id);
      gameController.removePlayerFromRoom(room.id, 'a');
      assert.strictEqual(gameController.getRoom(room.id), undefined);
    });

    it('o bot joga sozinho na sua vez e responde às apostas', async () => {
      // Sem sorteios: o bot nunca abre apostas por conta própria, só joga e responde.
      const realRandom = Math.random;
      Math.random = () => 0.99;
      try {
        gameController.config.botDelayMs = [1, 2];
        const room = gameController.createRoom('Vs bot', 2);
        gameController.addPlayerToRoom(room.id, 'a', 'Ana');
        gameController.setPlayerReady(room.id, 'a');
        gameController.addBot(room.id);
        room.game.roundDelayMs = 1;
        const bot = room.game.players.find(p => p.isBot);

        // Ana (mão) joga; o bot responde sozinho.
        const card = room.game.players[0].hand[0];
        gameController.playCard(room.id, 'a', { value: card.value, suit: card.suit });
        await wait(150);
        assert.ok(room.game.playedCards.some(p => p.playerId === bot.id) || room.game.roundResults.length > 0,
          'o bot devia ter jogado');

        // Na próxima vez de Ana ela pede Truco; o bot responde sem intervenção.
        for (let i = 0; i < 50 && room.game.players[room.game.currentTurn].id !== 'a'; i++) await wait(20);
        assert.strictEqual(room.game.players[room.game.currentTurn].id, 'a');
        assert.strictEqual(gameController.requestTruco(room.id, 'a').success, true);
        await wait(150);
        assert.ok(!room.game.trucoState || room.game.trucoState.accepted, 'o bot devia ter respondido ao Truco');
        assert.ok(room.game.trucoState || room.game.teams[0].score === 1, 'aceitou ou recusou (Ana ganha 1)');
      } finally {
        Math.random = realRandom;
      }
    });

    it('rematch: os bots ficam prontos automaticamente', () => {
      const room = gameController.createRoom('Vs bot', 2);
      gameController.addPlayerToRoom(room.id, 'a', 'Ana');
      gameController.addBot(room.id);
      gameController.setPlayerReady(room.id, 'a');
      room.game.awardPoints(room.game.teams[0], 12);

      gameController.voteRematch(room.id, 'a');
      assert.strictEqual(room.status, 'waiting');
      assert.strictEqual(room.game.players.find(p => p.isBot).isReady, true);
      assert.strictEqual(room.game.players.find(p => p.id === 'a').isReady, false);
    });
  });

  describe('persistência', () => {
    it('grava e restaura salas, partidas e sessões; humanos voltam desconectados', () => {
      const file = path.join(os.tmpdir(), `truco-test-${Date.now()}.json`);
      const room = gameController.createRoom('Salva', 2, { password: 'abc' });
      gameController.addPlayerToRoom(room.id, 'a', 'Ana', { skipPassword: true });
      gameController.addBot(room.id);
      gameController.setPlayerReady(room.id, 'a');
      gameController.postChat(room.id, 'a', 'oi');
      const handBefore = room.game.players[0].hand.map(c => c.display);
      const stateBefore = room.game.getGameState('a');

      const fakeSocket = { id: 's1', data: {}, join: () => {}, handshake: { auth: { token: 'a'.repeat(32) } } };
      const { session } = sessions.register(fakeSocket);
      room.game.players[0].id = session.playerId;

      persistence.save(file, gameController, sessions);
      const mode = fs.statSync(file).mode & 0o777;
      assert.ok(process.platform === 'win32' || mode === 0o600, 'arquivo restrito ao dono');

      gameController.gameRooms.forEach(r => r.game.dispose());
      gameController.gameRooms.clear();
      const loaded = persistence.load(file, gameController, sessions);
      assert.strictEqual(loaded.rooms, 1);

      const restored = gameController.getRoom(room.id);
      assert.strictEqual(restored.name, 'Salva');
      assert.strictEqual(restored.game.gameStatus, 'playing');
      assert.deepStrictEqual(restored.game.players[0].hand.map(c => c.display), handBefore);
      assert.strictEqual(restored.game.players[0].connected, false);
      assert.strictEqual(restored.game.players[1].connected, true, 'o bot continua ativo');
      assert.strictEqual(restored.chat.length, 1);
      assert.strictEqual(gameController.addPlayerToRoom(restored.id, 'x', 'Xis').needsPassword, true, 'a senha continua exigida');
      assert.strictEqual(stateBefore.players.length, 2);

      sessions.forget(session.playerId);
      fs.unlinkSync(file);
    });

    it('ignora arquivo inexistente e versão desconhecida', () => {
      assert.deepStrictEqual(persistence.load(path.join(os.tmpdir(), 'nao-existe-truco.json'), gameController, sessions), { rooms: 0 });

      const file = path.join(os.tmpdir(), `truco-test-v-${Date.now()}.json`);
      fs.writeFileSync(file, JSON.stringify({ version: 99, rooms: [] }));
      assert.deepStrictEqual(persistence.load(file, gameController, sessions), { rooms: 0 });
      fs.unlinkSync(file);
    });
  });
});
