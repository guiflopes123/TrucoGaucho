const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { io: connectClient } = require('socket.io-client');

// Sobe o servidor de verdade, derruba o processo à força e sobe de novo: a sala, a partida,
// a mão do jogador e o bot precisam estar lá.
describe('Persistência entre reinícios do servidor (processo real)', function () {
  this.timeout(30000);

  const port = 5200 + Math.floor(Math.random() * 500);
  const file = path.join(os.tmpdir(), `truco-restart-${Date.now()}.json`);
  const token = 'restart'.padEnd(32, 'x');
  const children = [];
  const sockets = [];

  const startServer = async () => {
    const child = spawn(process.execPath, [path.join(__dirname, '..', 'index.js')], {
      stdio: 'ignore',
      env: {
        ...process.env,
        PORT: String(port),
        NODE_ENV: 'test',
        DEBUG_LOGS: 'false',
        PERSIST_FILE: file,
        PERSIST_INTERVAL_MS: '200'
      }
    });
    children.push(child);

    const deadline = Date.now() + 15000;
    while (Date.now() < deadline) {
      try {
        if ((await fetch(`http://127.0.0.1:${port}/health`)).ok) return child;
      } catch {
        // ainda subindo
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error('o servidor não subiu a tempo');
  };

  const connect = () => {
    const socket = connectClient(`http://127.0.0.1:${port}`, { auth: { token }, transports: ['websocket'], forceNew: true, reconnection: false });
    sockets.push(socket);
    const seen = { session: null, rejoined: null };
    socket.on('session', (data) => { seen.session = data; });
    socket.on('room_rejoined', (data) => { seen.rejoined = data; });
    return { socket, seen };
  };

  const until = async (condition, message) => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (condition()) return;
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error(message);
  };

  const ask = (socket, event, data = {}) => new Promise(resolve => socket.emit(event, data, resolve));

  after(() => {
    sockets.forEach(socket => socket.close());
    children.forEach((child) => { try { child.kill('SIGKILL'); } catch { /* já encerrado */ } });
    try { fs.unlinkSync(file); } catch { /* arquivo nunca criado */ }
  });

  it('a partida em andamento volta depois de um kill -9', async () => {
    const first = await startServer();
    const before = connect();
    await until(() => before.seen.session, 'sem sessão');

    const created = await ask(before.socket, 'create_room', { roomName: 'Sobrevivente', maxPlayers: 2, playerName: 'Ana', password: 'abc' });
    assert.strictEqual(created.success, true);
    assert.strictEqual((await ask(before.socket, 'add_bot')).success, true);
    assert.strictEqual((await ask(before.socket, 'player_ready')).success, true);
    assert.strictEqual((await ask(before.socket, 'chat', { text: 'antes do restart' })).success, true);

    await until(() => fs.existsSync(file), 'o arquivo de persistência não foi criado');
    await new Promise(resolve => setTimeout(resolve, 600));
    const playerId = before.seen.session.playerId;
    before.socket.close();
    first.kill('SIGKILL');
    await new Promise(resolve => first.once('exit', resolve));

    await startServer();
    const after = connect();
    await until(() => after.seen.rejoined, 'a sala não foi restaurada');

    assert.strictEqual(after.seen.session.playerId, playerId, 'o mesmo jogador');
    assert.strictEqual(after.seen.session.roomId, created.room.id);
    assert.strictEqual(after.seen.rejoined.room.name, 'Sobrevivente');
    assert.strictEqual(after.seen.rejoined.room.hasPassword, true);
    assert.strictEqual(after.seen.rejoined.gameState.gameStatus, 'playing');
    const me = after.seen.rejoined.gameState.players.find(p => p.id === playerId);
    assert.strictEqual(me.hand.length, 3, 'a mão volta');
    assert.ok(after.seen.rejoined.gameState.players.some(p => p.isBot));
    assert.strictEqual(after.seen.rejoined.chat[0].text, 'antes do restart');
  });
});
