# Truco Gaúcho Online

Jogo de Truco Gaúcho multiplayer (1x1 ou 2x2) com Truco, Retruco, Vale 4, Envido, Flor e mão de onze.
Dá para jogar contra bots, com senha na sala, chat e reconexão automática.

- `client/`: interface React + Vite (styled-components, socket.io-client)
- `server/`: API Express + Socket.IO; todas as regras ficam em `server/models/TrucoGame.js`
- `e2e/`: teste de ponta a ponta no navegador (Chrome DevTools Protocol, sem dependências extras)

## Como rodar

Requer Node.js 22 ou superior (Vite 8 exige 20.19+; o teste e2e usa o WebSocket global do Node 22).

```bash
npm run install:all     # instala as dependências de client e server

# em dois terminais
npm run server          # http://localhost:5000
npm run client          # http://localhost:3000
```

Duas abas do mesmo navegador funcionam como dois jogadores (cada aba tem a sua sessão).
Para jogar pela rede local, abra `http://<ip-do-seu-pc>:3000` em outros aparelhos: em desenvolvimento
o cliente fala com o servidor no mesmo host, porta 5000.

## Configuração

Copie `server/.env.example` e `client/.env.example` para `.env` e ajuste.

| Onde | Variável | Para quê |
| --- | --- | --- |
| `server/.env` | `PORT` | porta do servidor (padrão 5000) |
| `server/.env` | `CLIENT_ORIGIN` | origens do cliente aceitas (CORS), separadas por vírgula. Em produção, defina a URL pública do cliente |
| `server/.env` | `TURN_TIMEOUT_SECONDS` | tempo por jogada/resposta antes da jogada automática (padrão 60; 0 desliga) |
| `server/.env` | `ROOM_IDLE_MINUTES` | minutos sem atividade até a sala ser encerrada (padrão 30; 0 desliga) |
| `server/.env` | `MAX_CONNECTIONS_PER_IP`, `MAX_ROOMS_PER_IP` | limites de abuso por endereço (padrão 20 e 5) |
| `server/.env` | `TRUST_PROXY` | `true` atrás de proxy reverso, para usar o IP de `X-Forwarded-For` |
| `server/.env` | `PERSIST_FILE` | arquivo onde salvar salas e partidas para sobreviverem a um restart (vazio desliga) |
| `server/.env` | `DEBUG_LOGS` | `true` liga os logs de depuração em produção |
| `client/.env` | `VITE_API_URL` | URL pública do servidor (definir antes do `npm run build`) |

## Testes e qualidade

```bash
npm test                # servidor (mocha) e cliente (node:test)
npm run lint            # ESLint em server, client e e2e
npm run test:e2e        # jogo completo no Chrome (precisa de Chrome/Chromium/Edge ou CHROME_PATH)
```

- Regras: empates, apostas, Envido, Flor, mão de onze, relógio de jogada e snapshot.
- Fuzz: centenas de partidas entre bots (1x1 e 2x2) verificam que nenhuma trava e que o placar é sempre válido.
- Integração: sessão, reconexão, privacidade das cartas, senha, chat, bots e limites por IP via Socket.IO.
- Restart: sobe o servidor de verdade, derruba o processo com `kill -9` e confere que a partida volta.
- E2E: dois jogadores no navegador (senha, chat, Envido, Truco, F5, bot, mão de onze, W.O.).

## Produção

- `server/ecosystem.config.js` roda o servidor com PM2 (uma instância: as salas ficam em memória;
  com `PERSIST_FILE` elas sobrevivem a um restart). Defina `CLIENT_ORIGIN` e `TRUST_PROXY`.
- `npm run build` gera `client/dist`, que qualquer servidor estático pode servir (defina `VITE_API_URL`).
- Atrás de nginx, o WebSocket precisa dos cabeçalhos de upgrade:

```nginx
location /socket.io/ {
  proxy_pass http://127.0.0.1:5000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
}
```

- `GET /health` responde `{"status":"ok"}` para monitoramento.

## Como o jogo funciona por dentro

- **Sessão estável:** o cliente guarda um token secreto por aba (`sessionStorage`) e o envia no
  handshake; o servidor o converte em um `playerId` público. F5 ou queda de rede não tira o
  jogador da sala: ele tem 60 s (15 s fora de partida) para voltar antes de ser removido, e quem
  abandona uma partida em andamento perde por W.O.
- **Cartas privadas:** cada jogador recebe o estado da partida só com a própria mão
  (`game_state_updated` vai para o canal privado do jogador, nunca para a sala inteira). Única
  exceção: na mão de onze, os parceiros do time com 11 pontos veem as cartas um do outro.
- **Servidor autoritativo:** o cliente só habilita botões; toda regra é validada no servidor.
- **Mão:** vence quem ganhar 2 rodadas. Empate na 1ª: vale a 2ª; empate na 2ª ou 3ª: vale a 1ª;
  três empates: vence o time do "mão". O "mão" gira um lugar a cada mão.
- **Apostas:** Truco (2), Retruco (3) e Vale 4 (4). Recusar encerra a mão e dá ao time que pediu o
  valor do nível anterior. Envido (2), Real Envido (5), Falta Envido e Flor (3) / Contra-Flor (6) /
  Contra-Flor e o Resto podem ser resolvidos uma vez por mão e usam a mão original. Empates no
  Envido e na Flor vão para o time do "mão". Sem Flor do outro lado, os 3 pontos saem na hora.
- **Mão de onze:** o time com 11 pontos escolhe jogar (a mão vale 3) ou correr (o adversário faz 1);
  não há apostas. Com os dois times em 11 é mão de ferro: vale 1 e decide a partida.
  Desligue com `game.maoDeOnze = false` em `TrucoGame`, se quiser a variante sem essa regra.
- **Relógio de jogada:** estourou o tempo, o servidor joga a carta mais fraca ou recusa a aposta
  pendente; dois estouros seguidos do mesmo jogador contam como abandono (W.O.).
- **Bots:** entram na sala de espera com "Adicionar bot", jogam e respondem sozinhos com uma
  estratégia simples (só usam a própria mão) e ficam prontos automaticamente.
- **Salas:** com senha opcional (guardada com scrypt), nomes repetidos ganham sufixo, limites por
  IP, encerramento por inatividade e histórico de chat das últimas 50 mensagens.

Não implementados: outras variantes regionais além das acima, ranking e contas de usuário.
