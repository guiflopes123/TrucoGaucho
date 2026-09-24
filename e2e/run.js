// Teste de ponta a ponta no navegador real: sobe o servidor e o cliente, abre duas abas do
// Chrome (via Chrome DevTools Protocol, sem dependências extras) e joga uma partida.
//
// Requisitos: Node 22+ (WebSocket global) e Chrome/Chromium/Edge instalado (ou CHROME_PATH).
// Uso: npm run test:e2e
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SERVER_PORT = Number(process.env.E2E_SERVER_PORT || 5055);
const CLIENT_PORT = Number(process.env.E2E_CLIENT_PORT || 3055);
const DEBUG_PORT = Number(process.env.E2E_DEBUG_PORT || 9333);
const APP = `http://127.0.0.1:${CLIENT_PORT}`;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const findBrowser = () => [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
].filter(Boolean).find(candidate => fs.existsSync(candidate));

const waitForHttp = async (url, timeoutMs = 60000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // ainda subindo
    }
    await sleep(300);
  }
  throw new Error(`Timeout aguardando ${url}`);
};

const results = [];
const check = (name, ok, info = '') => {
  results.push(Boolean(ok));
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${info ? `  -> ${info}` : ''}`);
};

class Tab {
  constructor(target) {
    this.target = target;
    this.frames = [];
    this.errors = [];
  }

  async open() {
    this.ws = new WebSocket(this.target.webSocketDebuggerUrl);
    await new Promise(resolve => this.ws.addEventListener('open', resolve));
    this.id = 0;
    this.pending = new Map();
    this.ws.addEventListener('message', (message) => {
      const data = JSON.parse(message.data);
      if (data.id && this.pending.has(data.id)) {
        this.pending.get(data.id)(data);
        this.pending.delete(data.id);
        return;
      }
      if (data.method === 'Network.webSocketFrameReceived') this.frames.push(data.params.response.payloadData);
      if (data.method === 'Runtime.exceptionThrown') {
        const details = data.params.exceptionDetails;
        this.errors.push((details.exception && details.exception.description) || details.text);
      }
      if (data.method === 'Runtime.consoleAPICalled' && data.params.type === 'error') {
        this.errors.push(data.params.args.map(arg => arg.value || arg.description).join(' ').slice(0, 300));
      }
    });
    await this.send('Page.enable');
    await this.send('Runtime.enable');
    await this.send('Network.enable');
  }

  send(method, params = {}) {
    return new Promise((resolve) => {
      this.id += 1;
      this.pending.set(this.id, resolve);
      this.ws.send(JSON.stringify({ id: this.id, method, params }));
    });
  }

  async ev(expression) {
    const response = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    return response.result && response.result.result ? response.result.result.value : undefined;
  }

  async nav(url, wait = 1500) {
    await this.send('Page.navigate', { url });
    await sleep(wait);
  }

  async waitFor(expression, timeout = 8000) {
    const deadline = Date.now() + timeout;
    while (Date.now() < deadline) {
      if (await this.ev(expression)) return true;
      await sleep(150);
    }
    return false;
  }

  setInput(selector, value) {
    return this.ev(`(() => { const el = document.querySelector(${JSON.stringify(selector)}); if (!el) return 'no-input';
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
      setter.call(el, ${JSON.stringify(value)}); el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; })()`);
  }

  click(text) {
    return this.ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim() === ${JSON.stringify(text)} && !x.disabled);
      if (!b) return false; b.click(); return true; })()`);
  }

  clickStartsWith(prefix) {
    return this.ev(`(() => { const b = [...document.querySelectorAll('button')].find(x => x.textContent.trim().startsWith(${JSON.stringify(prefix)}) && !x.disabled);
      if (!b) return false; b.click(); return true; })()`);
  }

  clickDialog(text) {
    return this.ev(`(() => { const b = [...document.querySelectorAll('[role=dialog] button')].find(x => x.textContent.trim() === ${JSON.stringify(text)} && !x.disabled);
      if (!b) return false; b.click(); return true; })()`);
  }

  async waitClick(text, timeout = 8000) {
    const found = await this.waitFor(
      `[...document.querySelectorAll('button')].some(x => x.textContent.trim() === ${JSON.stringify(text)} && !x.disabled)`,
      timeout
    );
    return found && this.click(text);
  }

  // Com E2E_SCREENSHOT_DIR definido, guarda capturas de tela dos momentos principais.
  async shot(name, width = 1280, height = 1000) {
    const dir = process.env.E2E_SCREENSHOT_DIR;
    if (!dir) return;
    await this.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: width < 700 });
    await sleep(500);
    const response = await this.send('Page.captureScreenshot', { format: 'png' });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, `${name}.png`), Buffer.from(response.result.data, 'base64'));
    await this.send('Emulation.clearDeviceMetricsOverride');
  }

  path() { return this.ev('location.pathname'); }
  text(selector = 'body') { return this.ev(`document.querySelector(${JSON.stringify(selector)}) ? document.querySelector(${JSON.stringify(selector)}).innerText : ''`); }
  handCards() { return this.ev('document.querySelectorAll(\'[aria-label="Suas cartas"] > *\').length'); }
  playable() { return this.ev('document.querySelectorAll(\'[aria-label="Suas cartas"] button\').length'); }
  tableCards() { return this.ev('document.querySelectorAll(\'[aria-label="Mesa de jogo"] [aria-label*=" de "]\').length'); }
  score() { return this.ev('(document.querySelector(\'[aria-label^="Placar"]\') || { getAttribute: () => \'\' }).getAttribute(\'aria-label\')'); }
}

const scoreSum = async (tab) => {
  const match = String(await tab.score()).match(/nós (\d+), eles (\d+)/);
  return match ? Number(match[1]) + Number(match[2]) : -1;
};

const startProcess = (command, args, options) => {
  const child = spawn(command, args, { stdio: 'ignore', ...options });
  child.on('error', (err) => console.error(`Falha ao iniciar ${command}:`, err.message));
  return child;
};

const main = async () => {
  if (typeof WebSocket === 'undefined') throw new Error('Este teste precisa do Node 22 ou superior (WebSocket global).');
  const browserPath = findBrowser();
  if (!browserPath) throw new Error('Chrome/Chromium/Edge não encontrado. Defina CHROME_PATH.');

  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'truco-e2e-'));
  const children = [];

  let backend = null;

  try {
    // O servidor roda no mesmo processo do teste para poder preparar situações raras
    // (como a mão de onze) pelo controlador, sem criar ganchos de teste no código real.
    process.env.NODE_ENV = 'test';
    process.env.DEBUG_LOGS = 'false';
    process.env.TURN_TIMEOUT_SECONDS = '60';
    const { createServer } = require('../server/index.js');
    backend = createServer();
    await new Promise(resolve => backend.server.listen(SERVER_PORT, '127.0.0.1', resolve));

    const viteBin = path.join(ROOT, 'client', 'node_modules', 'vite', 'bin', 'vite.js');
    if (!fs.existsSync(viteBin)) throw new Error('Vite não encontrado: rode "npm run install:all" antes.');
    children.push(startProcess(process.execPath, [viteBin, '--host', '127.0.0.1', '--port', String(CLIENT_PORT), '--strictPort'], {
      cwd: path.join(ROOT, 'client'),
      env: { ...process.env, VITE_API_URL: `http://127.0.0.1:${SERVER_PORT}` }
    }));
    await waitForHttp(`${APP}/`);

    const browserArgs = [
      '--headless=new', `--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${profileDir}`,
      '--no-first-run', '--disable-gpu', '--window-size=1280,1000', 'about:blank'
    ];
    if (process.env.CI) browserArgs.unshift('--no-sandbox');
    children.push(startProcess(browserPath, browserArgs));

    let targets;
    for (let i = 0; i < 40; i += 1) {
      try {
        targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json`)).json();
        if (targets.length) break;
      } catch {
        // navegador ainda subindo
      }
      await sleep(500);
    }
    const second = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/new?about:blank`, { method: 'PUT' })).json();
    const A = new Tab(targets.find(t => t.type === 'page'));
    const B = new Tab(second);
    await A.open();
    await B.open();

    await scenario(A, B);
    check('Sem erros de runtime no console no final', A.errors.length === 0 && B.errors.length === 0,
      [...A.errors, ...B.errors].join(' | ').slice(0, 400));
  } finally {
    children.forEach((child) => { try { child.kill(); } catch { /* já encerrado */ } });
    if (backend) {
      const controller = require('../server/controllers/gameController');
      controller.gameRooms.forEach(room => room.game.dispose());
      backend.io.close();
    }
    await sleep(500);
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* perfil ainda em uso */ }
  }
};

const scenario = async (A, B) => {
  // Login (o nome fica em localStorage, compartilhado entre as abas: cada aba usa o seu)
  await A.nav(`${APP}/`, 2000);
  await B.nav(`${APP}/`, 2000);
  await A.ev('localStorage.setItem(\'username\', \'Ana\')');
  await B.ev('localStorage.setItem(\'username\', \'Beto\')');

  // Lobby sem loop de requisições
  await A.nav(`${APP}/lobby`, 1500);
  await sleep(2500);
  check('Lobby carrega e lista salas', await A.waitFor('document.body.innerText.includes(\'Salas Disponíveis\')'));

  // Sala com senha
  await A.setInput('#roomName', 'Sala E2E');
  await A.setInput('#roomPassword', 'segredo');
  await A.waitClick('Criar Sala');
  check('A criou a sala com senha e entrou', await A.waitFor('location.pathname.startsWith(\'/room/\')'), await A.path());
  const roomPath = await A.path();

  await B.nav(`${APP}/lobby`, 1500);
  check('B vê a sala com cadeado no lobby', await B.waitFor('document.body.innerText.includes(\'🔒 Sala E2E\')'));
  await B.waitClick('Entrar');
  check('Entrar numa sala com senha abre o diálogo de senha', await B.waitFor('!!document.querySelector(\'[role=dialog] input[type=password]\')'));
  await B.ev('(() => { const i = document.querySelector(\'[role=dialog] input[type=password]\'); '
    + 'const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; s.call(i, \'errada\'); i.dispatchEvent(new Event(\'input\', { bubbles: true })); })()');
  await B.clickDialog('Entrar');
  check('Senha errada é recusada', await B.waitFor('document.querySelector(\'[role=dialog]\') && document.querySelector(\'[role=dialog]\').innerText.includes(\'Senha incorreta\')'));
  await B.ev('(() => { const i = document.querySelector(\'[role=dialog] input[type=password]\'); '
    + 'const s = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, \'value\').set; s.call(i, \'segredo\'); i.dispatchEvent(new Event(\'input\', { bubbles: true })); })()');
  await B.clickDialog('Entrar');
  check('Senha certa entra na sala', await B.waitFor(`location.pathname === ${JSON.stringify(roomPath)}`), await B.path());

  // Pronto e início, com relógio de jogada visível
  await A.waitClick('Pronto');
  await B.waitClick('Pronto');
  check('A partida começa e cada um vê 3 cartas',
    await A.waitFor('document.querySelectorAll(\'[aria-label="Suas cartas"] > *\').length === 3')
    && await B.waitFor('document.querySelectorAll(\'[aria-label="Suas cartas"] > *\').length === 3'));
  await sleep(500);
  check('Só o jogador da vez (A) pode jogar cartas', (await A.playable()) === 3 && (await B.playable()) === 0,
    `A=${await A.playable()} B=${await B.playable()}`);
  check('O relógio de jogada aparece', await A.waitFor('document.querySelector(\'[role=status]\') && document.querySelector(\'[role=status]\').innerText.includes(\'⏱\')'));

  const stateFrames = [...A.frames, ...B.frames].filter(f => f.includes('game_state_updated') && f.includes('"gameStatus":"playing"'));
  const handsPerFrame = stateFrames.map(f => (f.match(/"hand":\[\{/g) || []).length);
  check('Nenhum estado transmitido carrega a mão do adversário',
    stateFrames.length > 0 && handsPerFrame.every(n => n === 1), `mãos por frame=${[...new Set(handsPerFrame)]}`);

  // Chat
  await A.clickStartsWith('Chat');
  await A.setInput('input[aria-label="Mensagem"]', 'Boa sorte!');
  await A.click('Enviar');
  await B.waitFor('[...document.querySelectorAll(\'button\')].some(b => /^Chat\\d+$/.test(b.textContent.trim()))');
  await B.clickStartsWith('Chat');
  check('Chat: a mensagem de A chega a B', await B.waitFor('document.body.innerText.includes(\'Boa sorte!\')'));
  await A.click('Fechar chat');
  await B.click('Fechar chat');

  // Envido: Real Envido -> Aceitar
  await A.waitClick('Envido');
  check('Menu de Envido oferece as três opções',
    await A.waitFor('[\'Envido\', \'Real Envido\', \'Falta Envido\'].every(t => [...document.querySelectorAll(\'[role=dialog] button\')].some(b => b.textContent.trim() === t))'));
  await A.click('Real Envido');
  check('B recebe o diálogo de Real Envido com opção de subir',
    await B.waitFor('document.querySelector(\'[role=dialog]\') && document.querySelector(\'[role=dialog]\').innerText.includes(\'REAL ENVIDO\') '
      + '&& [...document.querySelectorAll(\'[role=dialog] button\')].some(b => b.textContent.trim() === \'Falta Envido\')'));
  await B.click('Aceitar');
  check('Envido resolvido: placar 5 e aviso na mesa',
    await A.waitFor('document.querySelector(\'[role=log]\') && document.querySelector(\'[role=log]\').innerText.includes(\'Real Envido aceito\')') && (await scoreSum(A)) === 5,
    String(await A.score()));

  // Truco recusado encerra a mão e gira o "mão"
  await A.waitClick('Truco');
  await A.waitClick('Confirmar');
  check('B recebe o diálogo de Truco', await B.waitFor('document.querySelector(\'[role=dialog]\') && document.querySelector(\'[role=dialog]\').innerText.includes(\'TRUCO\')'));
  const before = await scoreSum(A);
  await B.click('Recusar');
  check('Recusar o Truco pontua 1', await A.waitFor(`(() => { const m = (document.querySelector('[aria-label^="Placar"]')?.getAttribute('aria-label') || '').match(/nós (\\d+), eles (\\d+)/); return m && Number(m[1]) + Number(m[2]) === ${before + 1}; })()`));
  await sleep(3600);
  check('Nova mão: 3 cartas cada e agora B é o mão', (await A.handCards()) === 3 && (await B.playable()) === 3 && (await A.playable()) === 0,
    `A=${await A.playable()} B=${await B.playable()}`);

  // Carta na mesa, destaque da rodada e F5
  await B.ev('document.querySelector(\'[aria-label="Suas cartas"] button\').click()');
  check('Carta de B aparece na mesa de A', await A.waitFor('document.querySelectorAll(\'[aria-label="Mesa de jogo"] [aria-label*=" de "]\').length === 1'));
  await A.waitFor('document.querySelectorAll(\'[aria-label="Suas cartas"] button\').length === 3');
  await A.ev('document.querySelector(\'[aria-label="Suas cartas"] button\').click()');
  check('Rodada resolvida: a carta vencedora fica destacada (ou empate)',
    await A.waitFor('document.querySelectorAll(\'[aria-label*="venceu a rodada"]\').length === 1 || document.body.innerText.includes(\'Rodada empatada\')'));
  await sleep(3500);
  const handBefore = await B.handCards();
  await B.send('Page.reload');
  await sleep(3500);
  check('F5 na sala: B continua na sala com a mesma mão', (await B.path()) === roomPath && (await B.handCards()) === handBefore,
    `path=${await B.path()} mão=${await B.handCards()}`);

  // Sair, W.O. e segunda sala
  await A.click('Sair da Sala');
  check('A voltou ao lobby', await A.waitFor('location.pathname === \'/lobby\''));
  check('B vence por W.O. e vê "Vocês venceram"', await B.waitFor('document.querySelector(\'[role=dialog]\') && document.querySelector(\'[role=dialog]\').innerText.includes(\'Vocês venceram\')'));
  await B.click('Voltar ao Lobby');

  // Partida contra bot (a tela do lobby é carregada sob demanda: espera o formulário existir)
  await A.waitFor('!!document.querySelector(\'#roomName\')');
  await A.setInput('#roomName', 'Contra o bot');
  await A.waitClick('Criar Sala');
  check('A cria uma segunda sala (sem senha)', await A.waitFor(`location.pathname.startsWith('/room/') && location.pathname !== ${JSON.stringify(roomPath)}`));
  await A.shot('1-sala-de-espera');
  await A.waitClick('Adicionar bot');
  check('O bot entra na sala', await A.waitFor('document.body.innerText.includes(\'Bot Gaúcho 1\')'));
  await A.waitClick('Pronto');
  check('A partida contra o bot começa', await A.waitFor('document.querySelectorAll(\'[aria-label="Suas cartas"] > *\').length === 3'));
  await A.waitFor('document.querySelectorAll(\'[aria-label="Suas cartas"] button\').length === 3');
  await A.ev('document.querySelector(\'[aria-label="Suas cartas"] button\').click()');
  check('O bot joga sozinho depois da jogada de A',
    await A.waitFor('document.querySelectorAll(\'[aria-label="Mesa de jogo"] [aria-label*=" de "]\').length === 2 '
      + '|| /pediu (TRUCO|ENVIDO|REAL ENVIDO)/.test(document.body.innerText)', 9000));

  await A.clickStartsWith('Chat');
  await A.setInput('input[aria-label="Mensagem"]', 'Vamos lá!');
  await A.click('Enviar');
  await sleep(400);
  await A.shot('2-partida-contra-bot-com-chat');
  await A.shot('2b-partida-contra-bot-celular', 390, 844);
  await A.click('Fechar chat');

  // Mão de onze (situação preparada pelo controlador: o time de A chega a 11 pontos)
  const controller = require('../server/controllers/gameController');
  const botRoom = [...controller.gameRooms.values()].find(room => room.name === 'Contra o bot');
  botRoom.game.teams[0].score = 11;
  botRoom.game.handStarterIndex = 0;
  botRoom.game._startHand();
  controller.broadcastState(botRoom.id);
  check('Mão de onze: A recebe o diálogo para jogar ou correr',
    await A.waitFor('document.querySelector(\'[role=dialog]\') && document.querySelector(\'[role=dialog]\').innerText.includes(\'MÃO DE ONZE\')'));
  await A.shot('3-mao-de-onze');
  check('Durante a decisão A não pode jogar nem apostar', (await A.playable()) === 0);
  await A.clickDialog('Correr');
  check('Correr dá 1 ponto ao adversário', await A.waitFor('(document.querySelector(\'[aria-label^="Placar"]\') || {getAttribute: () => \'\'}).getAttribute(\'aria-label\').includes(\'nós 11, eles 1\')'),
    String(await A.score()));
  check('A mão seguinte também é de onze', await A.waitFor('document.querySelector(\'[role=dialog]\') && document.querySelector(\'[role=dialog]\').innerText.includes(\'MÃO DE ONZE\')', 9000));
  await A.clickDialog('Jogar');
  check('Jogar a mão de onze: a mão passa a valer 3', await A.waitFor('!document.querySelector(\'[role=dialog]\') && document.body.innerText.includes(\'Mão valendo 3\')'));

  // Entrada por link direto
  const linkPath = await A.path();
  await B.nav(`${APP}${linkPath}`, 2500);
  check('Abrir o link de uma sala cheia volta para o lobby', await B.waitFor('location.pathname === \'/lobby\''), await B.path());
};

// Rede de segurança: se algo travar, o teste falha em vez de ficar pendurado para sempre.
setTimeout(() => {
  console.error('ERRO no E2E: tempo total excedido');
  process.exit(1);
}, Number(process.env.E2E_TIMEOUT_MS || 300000));

main()
  .then(() => {
    const passed = results.filter(Boolean).length;
    console.log(`\n${passed}/${results.length} verificações OK`);
    process.exit(passed === results.length ? 0 : 1);
  })
  .catch((err) => {
    console.error('ERRO no E2E:', err.stack || err.message);
    process.exit(1);
  });
