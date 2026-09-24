const assert = require('assert');
const crypto = require('crypto');
const { io: connectClient } = require('socket.io-client');
const { createServer } = require('../index');
const gameController = require('../controllers/gameController');

describe('Socket.IO (integração)', function () {
  this.timeout(8000);

  let server;
  let url;
  const clients = [];

  before(async () => {
    ({ server } = createServer());
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    url = `http://127.0.0.1:${server.address().port}`;
  });

  afterEach(() => {
    clients.splice(0).forEach(client => client.socket.close());
    gameController.gameRooms.forEach(room => room.game.dispose());
    gameController.gameRooms.clear();
  });

  after(async () => {
    await new Promise(resolve => server.close(resolve));
  });

  const waitFor = async (condition, message = 'condição não atendida a tempo') => {
    const deadline = Date.now() + 3000;
    while (Date.now() < deadline) {
      if (condition()) return;
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    throw new Error(message);
  };

  // Cliente de teste: guarda o último estado, os avisos e os eventos recebidos.
  const connect = async (token = crypto.randomBytes(16).toString('hex')) => {
    const socket = connectClient(url, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    const client = { socket, token, state: null, session: null, notices: [], errors: [], events: [] };
    socket.onAny((event) => client.events.push(event));
    socket.on('session', (data) => { client.session = data; });
    socket.on('game_state_updated', ({ gameState }) => { client.state = gameState; });
    socket.on('room_created', ({ gameState, chat }) => { client.state = gameState; client.chat = chat; });
    socket.on('room_joined', ({ gameState, chat }) => { client.state = gameState; client.chat = chat; });
    socket.on('room_rejoined', ({ gameState, chat }) => { client.state = gameState; client.chat = chat; });
    socket.on('game_notice', ({ message }) => client.notices.push(message));
    socket.on('error', ({ message }) => client.errors.push(message));
    clients.push(client);
    await waitFor(() => client.session, 'sessão não recebida');
    return client;
  };

  const ask = (client, event, data = {}) => new Promise(resolve => client.socket.emit(event, data, resolve));

  const startMatch = async () => {
    const a = await connect();
    const b = await connect();
    const created = await ask(a, 'create_room', { roomName: 'Sala Int', maxPlayers: 2, playerName: 'Ana' });
    await ask(b, 'join_room', { roomId: created.room.id, playerName: 'Beto' });
    await ask(a, 'player_ready');
    await ask(b, 'player_ready');
    await waitFor(() => a.state && a.state.gameStatus === 'playing' && b.state && b.state.gameStatus === 'playing');
    return { a, b, roomId: created.room.id };
  };

  it('entrega um playerId estável e a visão pública da sala (sem o jogo)', async () => {
    const a = await connect();
    assert.ok(a.session.playerId);
    assert.strictEqual(a.session.roomId, null);

    const created = await ask(a, 'create_room', { roomName: '  Sala   Teste ', maxPlayers: 2, playerName: 'Ana' });
    assert.strictEqual(created.success, true);
    assert.strictEqual(created.room.name, 'Sala Teste');
    assert.ok(!('game' in created.room));
    assert.ok(!JSON.stringify(created).includes('deck'));
  });

  it('valida parâmetros e recusa ações fora de uma sala', async () => {
    const a = await connect();

    assert.strictEqual((await ask(a, 'create_room', { roomName: 'x', maxPlayers: 3, playerName: 'Ana' })).success, false);
    assert.strictEqual((await ask(a, 'create_room', { roomName: 'x', maxPlayers: 2, playerName: 'A' })).success, false);
    assert.strictEqual((await ask(a, 'create_room', 'lixo')).success, false);
    assert.strictEqual((await ask(a, 'truco')).message, 'Você não está em uma sala');
    assert.strictEqual((await ask(a, 'play_card', { card: 42 })).success, false);
    assert.ok(a.errors.length >= 4);
  });

  it('não deixa o mesmo jogador entrar em duas salas', async () => {
    const a = await connect();
    const first = await ask(a, 'create_room', { roomName: 'Sala 1', maxPlayers: 2, playerName: 'Ana' });
    assert.strictEqual(first.success, true);

    const second = await ask(a, 'create_room', { roomName: 'Sala 2', maxPlayers: 2, playerName: 'Ana' });
    assert.strictEqual(second.success, false);
    assert.strictEqual(gameController.getAllRooms().length, 1);
  });

  it('cada jogador só recebe as próprias cartas', async () => {
    const { a, b } = await startMatch();

    const ownA = a.state.players.find(p => p.id === a.session.playerId);
    const opponentSeenByA = a.state.players.find(p => p.id === b.session.playerId);
    assert.strictEqual(ownA.hand.length, 3);
    assert.strictEqual(opponentSeenByA.hand.length, 0);
    assert.strictEqual(opponentSeenByA.handCount, 3);

    const ownB = b.state.players.find(p => p.id === b.session.playerId);
    assert.strictEqual(ownB.hand.length, 3);
    assert.strictEqual(b.state.players.find(p => p.id === a.session.playerId).hand.length, 0);
  });

  it('joga uma carta na vez, transmite aos dois e barra quem joga fora de hora', async () => {
    const { a, b } = await startMatch();
    const me = a.state.players.find(p => p.id === a.session.playerId);
    const card = me.hand[0];

    const notYet = b.state.players.find(p => p.id === b.session.playerId).hand[0];
    assert.strictEqual((await ask(b, 'play_card', { card: notYet })).success, false);

    assert.strictEqual((await ask(a, 'play_card', { card })).success, true);
    await waitFor(() => b.state.playedCards.length === 1);
    assert.strictEqual(b.state.playedCards[0].card.value, card.value);
    assert.strictEqual(a.state.players.find(p => p.id === a.session.playerId).hand.length, 2);
    assert.strictEqual(b.state.currentPlayer, b.session.playerId);
  });

  it('avisa a mesa sobre as apostas e mostra a resposta ao Truco', async () => {
    const { a, b } = await startMatch();

    assert.strictEqual((await ask(a, 'truco')).success, true);
    await waitFor(() => b.state.trucoState && b.state.trucoState.respondingTeam === 2);
    assert.ok(b.notices.some(n => /pediu TRUCO/.test(n)));

    assert.strictEqual((await ask(b, 'truco_response', { accept: false })).success, true);
    await waitFor(() => b.state.teams[0].score === 1);
    assert.ok(a.notices.some(n => /recusou o Truco/.test(n)));
  });

  it('reconecta com o mesmo token e volta para a partida com a mesma mão', async () => {
    const { a, b } = await startMatch();
    const playerId = a.session.playerId;
    const handBefore = a.state.players.find(p => p.id === playerId).hand.map(c => c.display);

    a.socket.close();
    await waitFor(() => b.state.players.find(p => p.id === playerId).connected === false, 'oponente não viu a queda');
    assert.ok(b.notices.some(n => /perdeu a conexão/.test(n)));

    const again = await connect(a.token);
    assert.strictEqual(again.session.playerId, playerId);
    assert.ok(again.session.roomId);
    await waitFor(() => again.events.includes('room_rejoined'), 'room_rejoined não recebido');

    assert.deepStrictEqual(again.state.players.find(p => p.id === playerId).hand.map(c => c.display), handBefore);
    await waitFor(() => b.state.players.find(p => p.id === playerId).connected === true, 'oponente não viu a volta');
    assert.ok(b.notices.some(n => /voltou para a partida/.test(n)));
  });

  it('uma nova conexão com o mesmo token substitui a anterior', async () => {
    const a = await connect();
    const replacement = await connect(a.token);

    await waitFor(() => a.events.includes('session_replaced'), 'sessão anterior não foi encerrada');
    assert.strictEqual(replacement.session.playerId, a.session.playerId);
    await waitFor(() => !a.socket.connected);
    assert.strictEqual(replacement.socket.connected, true);
  });

  it('sair da sala remove o jogador e o adversário ganha por W.O.', async () => {
    const { a, b } = await startMatch();
    await ask(a, 'leave_room');

    await waitFor(() => b.state.gameStatus === 'finished');
    assert.strictEqual(b.state.gameWinner, 2);
    assert.strictEqual(b.state.players.length, 1);
    assert.ok(b.notices.some(n => /saiu da sala/.test(n)));
  });

  it('revanche: os dois votam e a partida volta para a fase de "pronto"', async () => {
    const { a, b } = await startMatch();
    await ask(a, 'leave_room').then(() => null);
    await waitFor(() => b.state.gameStatus === 'finished');

    assert.strictEqual((await ask(b, 'play_again')).success, true);
    // Sozinho na sala, o único jogador conectado já basta para reiniciar.
    await waitFor(() => b.state.gameStatus === 'waiting');
    assert.strictEqual(b.state.teams[0].score, 0);
  });

  it('sala com senha: a lista mostra o cadeado e só entra quem sabe a senha', async () => {
    const a = await connect();
    const b = await connect();
    const created = await ask(a, 'create_room', { roomName: 'Secreta', maxPlayers: 2, playerName: 'Ana', password: 'segredo' });
    assert.strictEqual(created.success, true);
    assert.strictEqual(created.room.hasPassword, true);
    assert.ok(!JSON.stringify(created).includes('segredo'));

    const list = await ask(b, 'get_rooms');
    assert.strictEqual(list.rooms.find(r => r.id === created.room.id).hasPassword, true);

    const missing = await ask(b, 'join_room', { roomId: created.room.id, playerName: 'Beto' });
    assert.deepStrictEqual([missing.success, missing.needsPassword], [false, true]);
    const wrong = await ask(b, 'join_room', { roomId: created.room.id, playerName: 'Beto', password: 'errada' });
    assert.strictEqual(wrong.message, 'Senha incorreta');
    assert.strictEqual((await ask(b, 'join_room', { roomId: created.room.id, playerName: 'Beto', password: 'segredo' })).success, true);

    assert.strictEqual((await ask(a, 'leave_room')).success, true);
    assert.strictEqual((await ask(b, 'create_room', { roomName: 'x', maxPlayers: 2, playerName: 'Beto', password: 'ab' })).success, false);
  });

  it('chat: a mensagem chega a todos da sala e quem entra depois recebe o histórico', async () => {
    const a = await connect();
    const created = await ask(a, 'create_room', { roomName: 'Chat', maxPlayers: 2, playerName: 'Ana' });
    const b = await connect();
    const chatsOfB = [];
    b.socket.on('chat_message', (m) => chatsOfB.push(m));
    await ask(b, 'join_room', { roomId: created.room.id, playerName: 'Beto' });

    assert.strictEqual((await ask(a, 'chat', { text: '  Vamos   lá!  ' })).success, true);
    await waitFor(() => chatsOfB.length === 1, 'mensagem não chegou');
    assert.strictEqual(chatsOfB[0].text, 'Vamos lá!');
    assert.strictEqual(chatsOfB[0].name, 'Ana');

    assert.strictEqual((await ask(a, 'chat', { text: '   ' })).success, false);

    b.socket.close();
    const back = await connect(b.token);
    await waitFor(() => back.events.includes('room_rejoined'), 'room_rejoined não recebido');
    assert.strictEqual(back.chat[0].text, 'Vamos lá!', 'o histórico volta junto com a sala');
  });

  it('bots: entram na sala, começam a partida e jogam sozinhos', async () => {
    gameController.config.botDelayMs = [1, 2];
    const realRandom = Math.random;
    Math.random = () => 0.99;
    try {
      const a = await connect();
      await ask(a, 'create_room', { roomName: 'Vs bot', maxPlayers: 2, playerName: 'Ana' });
      assert.strictEqual((await ask(a, 'add_bot')).success, true);
      await waitFor(() => a.state.players.some(p => p.isBot));
      assert.strictEqual((await ask(a, 'add_bot')).success, false, 'sala cheia');

      await ask(a, 'player_ready');
      await waitFor(() => a.state.gameStatus === 'playing');
      const bot = a.state.players.find(p => p.isBot);
      assert.strictEqual(bot.hand.length, 0, 'a mão do bot é privada');
      assert.strictEqual(bot.handCount, 3);

      const mine = a.state.players.find(p => p.id === a.session.playerId).hand[0];
      assert.strictEqual((await ask(a, 'play_card', { card: mine })).success, true);
      await waitFor(() => a.state.playedCards.length === 2 || a.state.roundResults.length > 0, 'o bot não jogou');
      assert.ok(a.notices.some(n => /venceu a rodada|empatada/.test(n)));
    } finally {
      Math.random = realRandom;
      gameController.config.botDelayMs = [900, 1800];
    }
  });

  it('bots só podem ser mexidos dentro da sala e antes da partida', async () => {
    const a = await connect();
    assert.strictEqual((await ask(a, 'add_bot')).success, false);
    await ask(a, 'create_room', { roomName: 'x', maxPlayers: 4, playerName: 'Ana' });
    assert.strictEqual((await ask(a, 'remove_bot')).message, 'Não há bots na sala');
    assert.strictEqual((await ask(a, 'add_bot')).success, true);
    assert.strictEqual((await ask(a, 'remove_bot')).success, true);
  });

  it('limita conexões simultâneas por endereço', async () => {
    const previous = process.env.MAX_CONNECTIONS_PER_IP;
    process.env.MAX_CONNECTIONS_PER_IP = '2';
    try {
      const first = await connect();
      const second = await connect();
      const errors = [];
      const third = connectClient(url, { transports: ['websocket'], forceNew: true, reconnection: false });
      clients.push({ socket: third });
      third.on('error', ({ message }) => errors.push(message));

      await waitFor(() => errors.length === 1, 'a terceira conexão não foi recusada');
      assert.match(errors[0], /Muitas conexões/);
      await waitFor(() => !third.connected);
      assert.ok(first.socket.connected && second.socket.connected);
    } finally {
      if (previous === undefined) delete process.env.MAX_CONNECTIONS_PER_IP;
      else process.env.MAX_CONNECTIONS_PER_IP = previous;
    }
  });

  it('mão de onze: o time com 11 pontos decide pelo socket', async () => {
    const { a, b, roomId } = await startMatch();
    const room = gameController.getRoom(roomId);
    room.game.teams[0].score = 11;
    room.game.handStarterIndex = 0;
    room.game._startHand();
    gameController.broadcastState(roomId);
    await waitFor(() => a.state.handMode === 'onze');

    assert.strictEqual((await ask(b, 'onze_response', { play: true })).success, false, 'quem não tem 11 não decide');
    assert.strictEqual((await ask(a, 'onze_response', { play: false })).success, true);
    await waitFor(() => b.state.teams[1].score === 1);
    assert.ok(b.notices.some(n => /correu da mão de onze/.test(n)));
  });

  it('limita a frequência de eventos por conexão', async () => {
    const a = await connect();
    const answers = await Promise.all(Array.from({ length: 120 }, () => ask(a, 'get_rooms')));
    assert.ok(answers.length === 120);
    await waitFor(() => a.errors.some(m => /Muitas requisições/.test(m)));
  });
});
