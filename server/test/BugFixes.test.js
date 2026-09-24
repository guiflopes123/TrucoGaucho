const assert = require('assert');
const { createServer } = require('../index');
const gameController = require('../controllers/gameController');
const { validatePlayerName, validateRoomParams, cleanText } = require('../utils/validation');

describe('Validação de entradas', () => {
  it('limpa e limita nomes', () => {
    assert.strictEqual(cleanText('  Ana   Maria\u0000  ', 20), 'Ana Maria');
    assert.strictEqual(cleanText('x'.repeat(100), 20).length, 20);
    assert.strictEqual(cleanText({ toString: () => 'x' }, 20), '');
  });

  it('exige nome de jogador com pelo menos 3 caracteres', () => {
    assert.strictEqual(validatePlayerName('ab').ok, false);
    assert.strictEqual(validatePlayerName(undefined).ok, false);
    assert.strictEqual(validatePlayerName('  Guilherme  ').value, 'Guilherme');
  });

  it('só aceita salas de 2 ou 4 jogadores e exige nome', () => {
    assert.strictEqual(validateRoomParams('Sala', 3).ok, false);
    assert.strictEqual(validateRoomParams('Sala', undefined).ok, false);
    assert.strictEqual(validateRoomParams('', 2).ok, false);
    assert.deepStrictEqual(validateRoomParams('Sala', '4'), { ok: true, name: 'Sala', maxPlayers: 4 });
  });
});

describe('API REST', () => {
  let server;
  let base;

  before(async () => {
    ({ server } = createServer());
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
  });

  after(async () => {
    gameController.gameRooms.forEach(room => room.game.dispose());
    gameController.gameRooms.clear();
    await new Promise(resolve => server.close(resolve));
  });

  const post = (path, body) => fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  it('cria e lista salas validando os parâmetros', async () => {
    assert.strictEqual((await post('/api/game/rooms', { roomName: 'x', maxPlayers: 5 })).status, 400);
    assert.strictEqual((await post('/api/game/rooms', {})).status, 400);

    const created = await post('/api/game/rooms', { roomName: 'Sala REST', maxPlayers: 2 });
    assert.strictEqual(created.status, 200);
    const { room } = await created.json();
    assert.strictEqual(room.name, 'Sala REST');

    const list = await (await fetch(`${base}/api/game/rooms`)).json();
    assert.ok(list.rooms.some(r => r.id === room.id));
  });

  it('não expõe as cartas dos jogadores por nenhuma rota', async () => {
    const room = gameController.createRoom('Sala secreta', 2);
    gameController.addPlayerToRoom(room.id, 'a', 'A');
    gameController.addPlayerToRoom(room.id, 'b', 'B');
    gameController.setPlayerReady(room.id, 'a');
    gameController.setPlayerReady(room.id, 'b');

    const cardsRoute = await fetch(`${base}/api/game/rooms/${room.id}/cards/a`);
    assert.strictEqual(cardsRoute.status, 404);

    const roomBody = JSON.stringify(await (await fetch(`${base}/api/game/rooms/${room.id}`)).json());
    const stateBody = await (await fetch(`${base}/api/game/rooms/${room.id}/state`)).json();

    assert.ok(!roomBody.includes('"hand"') && !roomBody.includes('"deck"'));
    stateBody.gameState.players.forEach(p => assert.strictEqual(p.hand.length, 0));
  });

  it('responde 404 para sala inexistente e expõe o health check', async () => {
    assert.strictEqual((await fetch(`${base}/api/game/rooms/nao-existe`)).status, 404);
    assert.deepStrictEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' });
  });
});
