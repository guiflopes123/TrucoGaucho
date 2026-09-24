const crypto = require('crypto');
const logger = require('../utils/logger');

const TARGET_SCORE = 12;
const ROUND_DELAY_MS = 3000;
const FLOR_POINTS = { flor: 3, contra_flor: 6 };
const MAX_CONSECUTIVE_TIMEOUTS = 2;

// Ações de jogador: quando bem sucedidas, zeram o contador de inatividade do autor e
// reiniciam o relógio de jogada.
const TIMED_ACTIONS = [
  'playCard',
  'requestTruco', 'requestRetruco', 'requestVale4',
  'respondToTruco', 'respondToRetruco', 'respondToVale4',
  'requestEnvido', 'requestRealEnvido', 'requestFaltaEnvido', 'respondToEnvido',
  'declareFlor', 'requestContraFlor', 'requestContraFlorResto', 'respondToFlor',
  'respondToMaoDeOnze'
];

const serializeCard = (card) => ({
  value: card.value,
  suit: card.suit,
  display: card.display,
  isManilha: Boolean(card.isManilha)
});

class Card {
  constructor(value, suit) {
    this.value = value;
    this.suit = suit;
    this.isRed = suit === 'copas' || suit === 'ouros';
    this.display = `${value}${suit === 'copas' ? '♥' : suit === 'ouros' ? '♦' : suit === 'paus' ? '♣' : '♠'}`;
    this.rank = this.getRank();
    this.isManilha = this.checkManilha();
    this.manilhaRank = this.isManilha ? this.getManilhaRank() : 0;
  }

  getRank() {
    const valueRanks = {
      '4': 1, '5': 2, '6': 3, '7': 4,
      '10': 5, '11': 6, '12': 7, '1': 8,
      '2': 9, '3': 10
    };
    return valueRanks[this.value] || 0;
  }

  // No Truco Gaúcho as manilhas são fixas.
  checkManilha() {
    return (
      (this.value === '7' && this.suit === 'ouros') ||
      (this.value === '7' && this.suit === 'espadas') ||
      (this.value === '1' && this.suit === 'paus') ||
      (this.value === '1' && this.suit === 'espadas')
    );
  }

  getManilhaRank() {
    const manilhaRanks = { '7ouros': 1, '7espadas': 2, '1paus': 3, '1espadas': 4 };
    return manilhaRanks[`${this.value}${this.suit}`] || 0;
  }

  compareWith(otherCard) {
    if (this.isManilha && otherCard.isManilha) return this.manilhaRank - otherCard.manilhaRank;
    if (this.isManilha) return 1;
    if (otherCard.isManilha) return -1;
    return this.rank - otherCard.rank;
  }

  // Força numérica da carta (1 a 14), útil para estratégias e desempates.
  get strength() {
    return this.isManilha ? 10 + this.manilhaRank : this.rank;
  }

  // Figuras (10, 11, 12) valem 0 no Envido.
  getEnvidoValue() {
    if (['10', '11', '12'].includes(this.value)) return 0;
    return parseInt(this.value, 10);
  }
}

class Deck {
  constructor() {
    this.cards = [];
    this.initializeDeck();
    this.shuffle();
  }

  initializeDeck() {
    this.cards = [];
    const values = ['1', '2', '3', '4', '5', '6', '7', '10', '11', '12'];
    const suits = ['copas', 'ouros', 'paus', 'espadas'];
    for (const suit of suits) {
      for (const value of values) this.cards.push(new Card(value, suit));
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = crypto.randomInt(0, i + 1);
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal(numPlayers, numCards) {
    const hands = [];
    for (let i = 0; i < numPlayers; i++) {
      const hand = [];
      for (let j = 0; j < numCards; j++) {
        if (this.cards.length > 0) hand.push(this.cards.pop());
      }
      hands.push(hand);
    }
    return hands;
  }
}

class Player {
  constructor(id, name, team, options = {}) {
    this.id = id;
    this.name = name;
    this.team = team;
    this._hand = [];
    // Mão original (as 3 cartas distribuídas). Envido e Flor usam sempre esta mão,
    // mesmo depois de o jogador já ter jogado cartas da mão atual.
    this.dealtHand = [];
    this.playedCard = null;
    this.isCurrentPlayer = false;
    this.isReady = false;
    this.isBot = Boolean(options.isBot);
    this.connected = true;
    this.timeouts = 0;
  }

  get hand() {
    return this._hand;
  }

  set hand(cards) {
    this._hand = cards;
    this.dealtHand = [...cards];
  }

  removeFromHand(card) {
    const index = this._hand.findIndex(c => c.suit === card.suit && c.value === card.value);
    if (index === -1) return null;
    return this._hand.splice(index, 1)[0];
  }

  hasPlayedCard() {
    return this._hand.length < this.dealtHand.length;
  }

  _cardsBySuit() {
    const bySuit = {};
    for (const card of this.dealtHand) {
      if (!bySuit[card.suit]) bySuit[card.suit] = [];
      bySuit[card.suit].push(card);
    }
    return bySuit;
  }

  calculateEnvido() {
    if (this.dealtHand.length === 0) return 0;
    const bySuit = this._cardsBySuit();
    let maxEnvido = 0;

    for (const suit in bySuit) {
      const cards = [...bySuit[suit]].sort((a, b) => b.getEnvidoValue() - a.getEnvidoValue());
      if (cards.length >= 2) {
        maxEnvido = Math.max(maxEnvido, cards[0].getEnvidoValue() + cards[1].getEnvidoValue() + 20);
      }
    }

    if (maxEnvido === 0) {
      maxEnvido = this.dealtHand.reduce((max, card) => Math.max(max, card.getEnvidoValue()), 0);
    }
    return maxEnvido;
  }

  hasFlor() {
    const bySuit = this._cardsBySuit();
    return Object.values(bySuit).some(cards => cards.length === 3);
  }

  calculateFlor() {
    const bySuit = this._cardsBySuit();
    for (const suit in bySuit) {
      if (bySuit[suit].length === 3) {
        return bySuit[suit].reduce((sum, card) => sum + card.getEnvidoValue(), 20);
      }
    }
    return 0;
  }
}

class Team {
  constructor(id, name) {
    this.id = id;
    this.name = name;
    this.players = [];
    this.score = 0;
    this.roundsWon = 0;
  }

  addPlayer(player) {
    this.players.push(player);
  }

  addPoints(points) {
    this.score += points;
  }

  addRoundWin() {
    this.roundsWon += 1;
  }

  resetRoundWins() {
    this.roundsWon = 0;
  }
}

class TrucoGame {
  constructor(roomId, maxPlayers) {
    this.roomId = roomId;
    this.maxPlayers = maxPlayers;
    this.players = [];
    this.teams = [new Team(1, 'Time 1'), new Team(2, 'Time 2')];
    this.gameStatus = 'waiting';
    this.targetScore = TARGET_SCORE;
    this.roundDelayMs = ROUND_DELAY_MS;
    // 0 desliga o relógio de jogada (o controlador define o valor real).
    this.turnTimeoutMs = 0;
    this.maoDeOnze = true;
    this.gameWinner = null;
    this.rematchVotes = new Set();
    this.deck = new Deck();
    this.handStarterIndex = 0;
    this.currentTurn = 0;
    this.turnDeadline = null;
    this._turnTimer = null;
    this._pendingAdvance = null;
    this._timers = new Set();

    // Chamado sempre que o estado muda fora de uma ação de jogador (timers internos),
    // para que o controlador retransmita o novo estado aos clientes.
    this.onStateChange = null;
    // Avisos para a mesa (quem venceu a rodada, jogada automática etc.).
    this.onNotice = null;

    this._resetHandState();

    TIMED_ACTIONS.forEach((name) => {
      const original = this[name].bind(this);
      this[name] = (playerId, ...args) => {
        const result = original(playerId, ...args);
        if (result && result.success) {
          const actor = this.players.find(p => p.id === playerId);
          if (actor) actor.timeouts = 0;
          this._rearmTurnTimer();
        }
        return result;
      };
    });
  }

  get status() {
    return this.gameStatus;
  }

  set status(value) {
    this.gameStatus = value;
  }

  get currentRound() {
    return Math.min(this.roundResults.length + 1, 3);
  }

  get roundStarter() {
    const starter = this.players[this.currentRoundStarter];
    return starter ? starter.id : null;
  }

  // ---------------------------------------------------------------- infra

  _schedule(fn, ms = this.roundDelayMs) {
    const timer = setTimeout(() => {
      this._timers.delete(timer);
      try {
        fn();
      } catch (err) {
        logger.error('[TrucoGame] Erro em timer interno:', err);
      }
    }, ms);
    if (typeof timer.unref === 'function') timer.unref();
    this._timers.add(timer);
  }

  _clearTimers() {
    this._timers.forEach(clearTimeout);
    this._timers.clear();
    if (this._turnTimer) clearTimeout(this._turnTimer);
    this._turnTimer = null;
    this.turnDeadline = null;
  }

  dispose() {
    this._clearTimers();
    this.onStateChange = null;
    this.onNotice = null;
  }

  _emitStateChange() {
    if (typeof this.onStateChange === 'function') {
      try {
        this.onStateChange(this.getGameState());
      } catch (err) {
        logger.error('[TrucoGame] Erro ao notificar mudança de estado:', err);
      }
    }
  }

  _notice(message) {
    if (typeof this.onNotice === 'function') {
      try {
        this.onNotice(message);
      } catch (err) {
        logger.error('[TrucoGame] Erro ao enviar aviso:', err);
      }
    }
  }

  _resetHandState() {
    this.playedCards = [];
    this.roundResults = [];
    this.handValue = 1;
    this.trucoState = null;
    this.retrucoState = null;
    this.vale4State = null;
    this.envidoState = null;
    this.envidoResolved = false;
    this.florState = null;
    this.florResolved = false;
    this.onzeState = null;
    this.handMode = 'normal';
    this.lastRound = null;
    this.roundWinner = null;
    this.roundLocked = false;
    this._pendingAdvance = null;
    this.currentRoundStarter = this.handStarterIndex;
    this.teams.forEach(team => team.resetRoundWins());
  }

  _setTurn(index) {
    this.currentTurn = index;
    this.players.forEach((p, i) => {
      p.isCurrentPlayer = i === index;
    });
  }

  _teamOf(player) {
    return this.teams[player.team - 1];
  }

  _otherTeamId(teamId) {
    return teamId === 1 ? 2 : 1;
  }

  _handStarterTeam() {
    const starter = this.players[this.handStarterIndex];
    return starter ? this._teamOf(starter) : this.teams[0];
  }

  // Reorganiza os assentos: times alternados na ordem de jogo (1, 2, 1, 2).
  _reseat() {
    this.teams.forEach((team) => { team.players = []; });
    this.players.forEach((player, index) => {
      player.team = (index % 2) + 1;
      this.teams[index % 2].addPlayer(player);
    });
  }

  // Adiciona pontos e encerra a partida imediatamente se a pontuação alvo for atingida.
  awardPoints(team, points) {
    if (!team || !points) return;
    team.addPoints(points);
    if (team.score >= this.targetScore && this.gameStatus !== 'finished') {
      this._finishGame(team);
    }
  }

  _finishGame(winnerTeam) {
    this.gameWinner = winnerTeam;
    this.gameStatus = 'finished';
    this.roundLocked = false;
    this._pendingAdvance = null;
    this.rematchVotes.clear();
    this._clearTimers();
  }

  // -------------------------------------------------------------- jogadores

  addPlayer(playerId, playerName, options = {}) {
    if (this.gameStatus !== 'waiting') {
      return { success: false, message: 'A partida já começou' };
    }
    if (this.players.length >= this.maxPlayers) {
      return { success: false, message: 'Sala cheia' };
    }
    if (this.players.some(p => p.id === playerId)) {
      return { success: false, message: 'Jogador já está na sala' };
    }

    const teamIndex = this.players.length % 2;
    const player = new Player(playerId, playerName, teamIndex + 1, options);
    if (player.isBot) {
      player.isReady = true;
    }
    this.players.push(player);
    this.teams[teamIndex].addPlayer(player);
    return { success: true, player };
  }

  setPlayerConnected(playerId, connected) {
    const player = this.players.find(p => p.id === playerId);
    if (player) player.connected = connected;
  }

  setPlayerReady(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Jogador não encontrado' };
    if (this.gameStatus !== 'waiting') return { success: false, message: 'A partida já começou' };

    player.isReady = true;
    this.tryStart();
    return { success: true, gameState: this.getGameState() };
  }

  // A partida só começa com a sala completa e todos prontos.
  tryStart() {
    if (this.gameStatus === 'waiting' && this.players.length === this.maxPlayers && this.players.every(p => p.isReady)) {
      this.startGame();
      return true;
    }
    return false;
  }

  startGame() {
    this.gameStatus = 'playing';
    this.gameWinner = null;
    this.handStarterIndex = 0;
    this._startHand();
    this._rearmTurnTimer();
    return { success: true, gameState: this.getGameState() };
  }

  _startHand() {
    this._resetHandState();
    this.dealCards();
    this._setTurn(this.handStarterIndex);
    this._configureHandMode();
  }

  // Mão de onze: o time com 11 pontos decide se joga (mão vale 3) ou corre (o adversário faz 1).
  // Mão de ferro: os dois times com 11 pontos; sem apostas e a mão decide a partida.
  _configureHandMode() {
    if (!this.maoDeOnze) return;

    const limit = this.targetScore - 1;
    const atLimit = this.teams.filter(team => team.score === limit);

    if (atLimit.length === 2) {
      this.handMode = 'ferro';
      this._notice('Mão de ferro! Os dois times estão com 11 pontos: sem apostas, quem vencer a mão vence a partida.');
    } else if (atLimit.length === 1) {
      this.handMode = 'onze';
      this.onzeState = { team: atLimit[0].id, waitingResponse: true, accepted: false };
      this._notice(`Mão de onze! ${atLimit[0].name} decide se joga ou corre.`);
    }
  }

  dealCards() {
    this.deck = new Deck();
    const hands = this.deck.deal(this.players.length, 3);
    this.players.forEach((player, index) => {
      player.hand = hands[index];
      player.playedCard = null;
    });
  }

  removePlayer(playerId) {
    const index = this.players.findIndex(p => p.id === playerId);
    if (index === -1) return { success: false, message: 'Jogador não encontrado' };

    const player = this.players[index];
    const wasCurrentTurn = index === this.currentTurn;

    this.players.splice(index, 1);
    const team = this.teams[player.team - 1];
    const teamIndex = team.players.findIndex(p => p.id === playerId);
    if (teamIndex !== -1) team.players.splice(teamIndex, 1);
    this.rematchVotes.delete(playerId);

    if (this.players.length === 0) {
      this.resetGame();
      return { success: true, roomEmpty: true };
    }

    if (this.gameStatus === 'playing') {
      if (index < this.currentTurn) {
        this.currentTurn--;
      } else if (wasCurrentTurn && this.currentTurn >= this.players.length) {
        this.currentTurn = 0;
      }

      // Quem abandona uma partida em andamento perde por W.O.
      const opposing = this.teams[this._otherTeamId(player.team) - 1];
      if (opposing.players.length > 0) {
        this._finishGame(opposing);
      } else {
        const remaining = this.teams.find(t => t.players.length > 0);
        if (remaining) this._finishGame(remaining);
      }
    } else if (this.gameStatus === 'waiting') {
      this._reseat();
    }

    return { success: true, roomEmpty: false };
  }

  resetGame() {
    this._clearTimers();
    this.deck = new Deck();
    this.gameStatus = 'waiting';
    this.currentTurn = 0;
    this.handStarterIndex = 0;
    this.gameWinner = null;
    this.rematchVotes.clear();
    this.teams.forEach((team) => {
      team.score = 0;
      team.resetRoundWins();
    });
    this._resetHandState();
    this._reseat();
  }

  voteRematch(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Jogador não encontrado' };
    if (this.gameStatus !== 'finished') return { success: false, message: 'A partida ainda não terminou' };

    this.rematchVotes.add(playerId);
    const everyoneAgreed = this.players
      .filter(p => p.connected && !p.isBot)
      .every(p => this.rematchVotes.has(p.id));

    if (everyoneAgreed) {
      this.resetGame();
      this.players.forEach((p) => {
        p.isReady = p.isBot;
        p.timeouts = 0;
        p.hand = [];
        p.isCurrentPlayer = false;
      });
      return { success: true, restarted: true };
    }
    return { success: true, restarted: false, votes: this.rematchVotes.size };
  }

  // ------------------------------------------------------------ relógio de jogada

  // Quem precisa agir agora: uma resposta pendente (de um time) ou a jogada do jogador da vez.
  _awaiting() {
    if (this.onzeState && this.onzeState.waitingResponse) return { kind: 'onze', team: this.onzeState.team };
    if (this.vale4State && !this.vale4State.accepted) return { kind: 'vale4', team: this.vale4State.respondingTeam };
    if (this.retrucoState && !this.retrucoState.accepted) return { kind: 'retruco', team: this.retrucoState.respondingTeam };
    if (this.trucoState && !this.trucoState.accepted) return { kind: 'truco', team: this.trucoState.respondingTeam };
    if (this.envidoState && this.envidoState.waitingResponse) return { kind: 'envido', team: this.envidoState.respondingTeam };
    if (this.florState && this.florState.waitingResponse) return { kind: 'flor', team: this.florState.respondingTeam };
    return { kind: 'play', playerId: this.players[this.currentTurn] ? this.players[this.currentTurn].id : null };
  }

  _rearmTurnTimer() {
    if (this._turnTimer) clearTimeout(this._turnTimer);
    this._turnTimer = null;
    this.turnDeadline = null;

    if (!this.turnTimeoutMs || this.gameStatus !== 'playing' || this.roundLocked) return;

    this.turnDeadline = Date.now() + this.turnTimeoutMs;
    this._turnTimer = setTimeout(() => {
      this._turnTimer = null;
      try {
        this._onTurnTimeout();
      } catch (err) {
        logger.error('[TrucoGame] Erro no relógio de jogada:', err);
      }
    }, this.turnTimeoutMs);
    if (typeof this._turnTimer.unref === 'function') this._turnTimer.unref();
  }

  weakestCard(player) {
    return [...player.hand].sort((a, b) => a.compareWith(b))[0] || null;
  }

  // Tempo esgotado: faz a jogada mais conservadora pelo jogador (carta mais fraca ou
  // recusar a aposta). Dois estouros seguidos do mesmo jogador contam como abandono.
  _onTurnTimeout() {
    if (this.gameStatus !== 'playing' || this.roundLocked) return;

    const awaiting = this._awaiting();
    let offender;

    if (awaiting.kind === 'play') {
      offender = this.players.find(p => p.id === awaiting.playerId);
    } else {
      const team = this.players.filter(p => p.team === awaiting.team);
      offender = team.find(p => p.connected && !p.isBot) || team[0];
    }
    if (!offender) return;

    offender.timeouts += 1;
    if (offender.timeouts >= MAX_CONSECUTIVE_TIMEOUTS && !offender.isBot) {
      this._notice(`${offender.name} ficou inativo e perdeu a partida por W.O.`);
      this._finishGame(this.teams[this._otherTeamId(offender.team) - 1]);
      this._emitStateChange();
      return;
    }

    // Chama o método original (sem o wrapper) para não zerar o contador de inatividade.
    const call = (method, ...args) => TrucoGame.prototype[method].call(this, offender.id, ...args);

    switch (awaiting.kind) {
      case 'play': {
        this._notice(`${offender.name} demorou demais: jogada automática.`);
        const card = this.weakestCard(offender);
        if (card) call('playCard', card);
        break;
      }
      case 'truco': this._notice(`${offender.name} demorou demais: Truco recusado.`); call('respondToTruco', false); break;
      case 'retruco': this._notice(`${offender.name} demorou demais: Retruco recusado.`); call('respondToRetruco', false); break;
      case 'vale4': this._notice(`${offender.name} demorou demais: Vale 4 recusado.`); call('respondToVale4', false); break;
      case 'envido': this._notice(`${offender.name} demorou demais: Envido recusado.`); call('respondToEnvido', false); break;
      case 'flor': this._notice(`${offender.name} demorou demais: Flor recusada.`); call('respondToFlor', false); break;
      case 'onze': this._notice(`${offender.name} demorou demais: o time correu da mão de onze.`); call('respondToMaoDeOnze', false); break;
      default: break;
    }

    this._rearmTurnTimer();
    this._emitStateChange();
  }

  // ------------------------------------------------------------------ cartas

  _pendingBetMessage() {
    if (this.onzeState && this.onzeState.waitingResponse) return 'Aguarde a decisão da mão de onze antes de jogar';
    if (this.trucoState && !this.trucoState.accepted) return 'Aguarde a resposta ao Truco antes de jogar';
    if (this.retrucoState && !this.retrucoState.accepted) return 'Aguarde a resposta ao Retruco antes de jogar';
    if (this.vale4State && !this.vale4State.accepted) return 'Aguarde a resposta ao Vale 4 antes de jogar';
    if (this.envidoState && this.envidoState.waitingResponse) return 'Aguarde a resposta ao Envido antes de jogar';
    if (this.florState && this.florState.waitingResponse) return 'Aguarde a resposta à Flor antes de jogar';
    return null;
  }

  playCard(playerId, card) {
    if (this.gameStatus !== 'playing') {
      return { success: false, message: 'O jogo não está em andamento' };
    }

    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Jogador não encontrado' };

    if (this.roundLocked) {
      return { success: false, message: 'Aguarde o fim da rodada' };
    }

    const pending = this._pendingBetMessage();
    if (pending) return { success: false, message: pending };

    const playerIndex = this.players.indexOf(player);
    if (this.currentTurn !== playerIndex) {
      return { success: false, message: 'Não é sua vez de jogar' };
    }

    if (!card || typeof card.suit !== 'string' || typeof card.value !== 'string') {
      return { success: false, message: 'Carta inválida' };
    }

    const playerCard = player.removeFromHand(card);
    if (!playerCard) return { success: false, message: 'Carta inválida' };

    player.playedCard = playerCard;
    this.playedCards.push({ playerId, card: playerCard, team: player.team });

    this._setTurn((playerIndex + 1) % this.players.length);
    if (this.playedCards.length === this.players.length) this.determineRoundWinner();

    return { success: true, gameState: this.getGameState() };
  }

  determineRoundWinner() {
    const plays = this.playedCards;
    let best = plays[0];
    for (let i = 1; i < plays.length; i++) {
      if (plays[i].card.compareWith(best.card) > 0) best = plays[i];
    }

    // Só há empate quando as cartas mais altas são de times diferentes: dois
    // companheiros com a mesma carta alta não empatam entre si.
    const topPlays = plays.filter(p => p.card.compareWith(best.card) === 0);
    const isTie = new Set(topPlays.map(p => p.team)).size > 1;
    const winnerPlay = topPlays[0];

    const result = isTie
      ? { winnerTeam: null, winnerPlayerId: null }
      : { winnerTeam: winnerPlay.team, winnerPlayerId: winnerPlay.playerId };

    this.roundResults.push(result);
    this.lastRound = { winnerPlayerId: result.winnerPlayerId, winnerTeam: result.winnerTeam, tie: isTie };
    if (result.winnerTeam) {
      this.roundWinner = result.winnerTeam;
      this.teams[result.winnerTeam - 1].addRoundWin();
    }

    const handWinnerId = this._evaluateHandWinner();
    if (handWinnerId) {
      const winningTeam = this.teams[handWinnerId - 1];
      this._notice(`${winningTeam.name} ganhou a mão e faz ${this.handValue} ponto${this.handValue === 1 ? '' : 's'}.`);
      this.endHand(winningTeam);
      return;
    }

    if (isTie) {
      this._notice('Rodada empatada.');
    } else {
      const winner = this.players.find(p => p.id === result.winnerPlayerId);
      this._notice(`${winner ? winner.name : 'Alguém'} venceu a rodada.`);
    }

    // Mão ainda em aberto: mantém as cartas na mesa por um instante e segue.
    this.roundLocked = true;
    this._scheduleAdvance({ type: 'round', winnerPlayerId: result.winnerPlayerId });
  }

  // Regras de decisão da mão (com empates):
  //  - 2 rodadas vencidas decidem;
  //  - empate na 1ª: quem vencer a 2ª leva a mão (se empatar de novo, quem vencer a 3ª);
  //  - empate na 2ª ou na 3ª: quem venceu a 1ª leva a mão;
  //  - três empates: vence o time de quem foi "mão" (abriu a mão).
  _evaluateHandWinner() {
    const results = this.roundResults;
    const wins = { 1: 0, 2: 0 };
    results.forEach((r) => { if (r.winnerTeam) wins[r.winnerTeam] += 1; });

    if (wins[1] >= 2) return 1;
    if (wins[2] >= 2) return 2;

    if (results.length === 2) {
      if (!results[0].winnerTeam && results[1].winnerTeam) return results[1].winnerTeam;
      if (results[0].winnerTeam && !results[1].winnerTeam) return results[0].winnerTeam;
      return null;
    }

    if (results.length >= 3) {
      if (results[0].winnerTeam) return results[0].winnerTeam;
      if (results[2].winnerTeam) return results[2].winnerTeam;
      return this._handStarterTeam().id;
    }

    return null;
  }

  // Encerra a mão: pontua o time vencedor e agenda a distribuição da próxima.
  endHand(winningTeam) {
    if (this.gameStatus === 'finished') return this.getGameState();

    if (winningTeam) this.awardPoints(winningTeam, this.handValue);
    if (this.gameStatus === 'finished') return this.getGameState();

    this.roundLocked = true;
    this._rearmTurnTimer();
    this._scheduleAdvance({ type: 'hand' });

    return this.getGameState();
  }

  // Transições com atraso (limpar a mesa / distribuir a próxima mão). O que está pendente
  // fica guardado em `_pendingAdvance` para poder ser retomado após um restart do servidor.
  _scheduleAdvance(pending) {
    this._pendingAdvance = pending;
    this._schedule(() => this._runAdvance());
  }

  _runAdvance() {
    const pending = this._pendingAdvance;
    this._pendingAdvance = null;
    if (!pending || this.gameStatus !== 'playing' || this.players.length === 0) return;

    if (pending.type === 'hand') {
      this.handStarterIndex = (this.handStarterIndex + 1) % this.players.length;
      this._startHand();
    } else {
      this.playedCards = [];
      this.lastRound = null;
      this.players.forEach((p) => { p.playedCard = null; });

      // Quem venceu a rodada abre a próxima; em caso de empate, abre quem abriu esta.
      let starter = this.currentRoundStarter;
      if (pending.winnerPlayerId) {
        const winnerIndex = this.players.findIndex(p => p.id === pending.winnerPlayerId);
        if (winnerIndex !== -1) starter = winnerIndex;
      }
      this.currentRoundStarter = Math.min(starter, this.players.length - 1);
      this._setTurn(this.currentRoundStarter);
      this.roundLocked = false;
    }

    this._rearmTurnTimer();
    this._emitStateChange();
  }

  // Após restaurar um snapshot: conclui a transição que estava pendente ou rearma o relógio.
  resumeAfterRestore() {
    if (this._pendingAdvance) {
      this._runAdvance();
    } else {
      this._rearmTurnTimer();
    }
  }

  // ------------------------------------------------------------------ apostas

  _betPrecheck(playerId) {
    if (this.gameStatus !== 'playing') return { error: 'Jogo não está em andamento' };
    if (this.roundLocked) return { error: 'Aguarde o fim da rodada' };
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { error: 'Jogador não encontrado' };
    if (this.handMode !== 'normal') return { error: 'Não há apostas na mão de onze ou de ferro' };
    return { player };
  }

  _pendingSideBet() {
    if (this.envidoState && this.envidoState.waitingResponse) return 'Responda ao Envido antes de continuar';
    if (this.florState && this.florState.waitingResponse) return 'Responda à Flor antes de continuar';
    return null;
  }

  requestTruco(playerId) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    if (this.trucoState) return { success: false, message: 'Já existe um pedido de Truco em andamento' };
    if (this.retrucoState || this.vale4State) {
      return { success: false, message: 'A mão já está em um nível de aposta mais alto que o Truco' };
    }
    const sideBet = this._pendingSideBet();
    if (sideBet) return { success: false, message: sideBet };
    if (this.currentTurn !== this.players.indexOf(player)) {
      return { success: false, message: 'Só é possível pedir Truco na sua vez' };
    }

    this.trucoState = {
      level: 'truco',
      value: 2,
      team: player.team,
      requestedBy: playerId,
      respondingTeam: this._otherTeamId(player.team),
      accepted: false
    };
    return { success: true, trucoState: this.trucoState };
  }

  respondToTruco(playerId, accept) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    if (!this.trucoState || this.trucoState.accepted || this.trucoState.requestedBy === playerId) {
      return { success: false, message: 'Não há pedido de Truco para responder' };
    }
    if (player.team !== this.trucoState.respondingTeam) {
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (accept) {
      this.trucoState.accepted = true;
      this.handValue = 2;
      return {
        success: true,
        accepted: true,
        handValue: this.handValue,
        trucoState: this.trucoState,
        currentPlayer: this.players[this.currentTurn].id
      };
    }

    // Recusar encerra a mão: o time que pediu leva o valor anterior à aposta.
    const requestingTeam = this.teams[this.trucoState.team - 1];
    this.trucoState = null;
    this.handValue = 1;
    this.endHand(requestingTeam);
    return { success: true, accepted: false, handEnded: true, winningTeam: requestingTeam.id, points: 1, gameStatus: this.gameStatus, gameWinner: this.gameWinner };
  }

  requestRetruco(playerId) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    if (this.vale4State) return { success: false, message: 'A mão já está em Vale 4' };
    // Subir a aposta implica aceitar o nível anterior (regra tradicional do truco).
    if (!this.trucoState || player.team !== this.trucoState.respondingTeam) {
      return { success: false, message: 'Você não pode pedir Retruco agora.' };
    }
    const sideBet = this._pendingSideBet();
    if (sideBet) return { success: false, message: sideBet };

    const respondingTeamId = this.trucoState.team;
    this.trucoState = null;
    this.retrucoState = {
      level: 'retruco',
      value: 3,
      team: player.team,
      requestedBy: playerId,
      respondingTeam: respondingTeamId,
      accepted: false
    };
    return { success: true, retrucoState: this.retrucoState };
  }

  respondToRetruco(playerId, accept) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    if (!this.retrucoState || this.retrucoState.accepted || this.retrucoState.requestedBy === playerId) {
      return { success: false, message: 'Não há pedido de Retruco para responder' };
    }
    if (player.team !== this.retrucoState.respondingTeam) {
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (accept) {
      this.retrucoState.accepted = true;
      this.handValue = 3;
      this.trucoState = null;
      return {
        success: true,
        accepted: true,
        handValue: this.handValue,
        retrucoState: this.retrucoState,
        trucoState: null,
        currentPlayer: this.players[this.currentTurn].id
      };
    }

    const requestingTeam = this.teams[this.retrucoState.team - 1];
    this.retrucoState = null;
    this.handValue = 2;
    this.endHand(requestingTeam);
    return { success: true, accepted: false, handEnded: true, winningTeam: requestingTeam.id, points: 2, gameStatus: this.gameStatus, gameWinner: this.gameWinner };
  }

  requestVale4(playerId) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    if (!this.retrucoState || player.team !== this.retrucoState.respondingTeam) {
      return { success: false, message: 'Você não pode pedir Vale 4 agora.' };
    }
    const sideBet = this._pendingSideBet();
    if (sideBet) return { success: false, message: sideBet };

    const respondingTeamId = this.retrucoState.team;
    this.retrucoState = null;
    this.vale4State = {
      level: 'vale4',
      value: 4,
      team: player.team,
      requestedBy: playerId,
      respondingTeam: respondingTeamId,
      accepted: false
    };
    return { success: true, vale4State: this.vale4State };
  }

  respondToVale4(playerId, accept) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    if (!this.vale4State || this.vale4State.accepted || this.vale4State.requestedBy === playerId) {
      return { success: false, message: 'Não há pedido de Vale 4 para responder' };
    }
    if (player.team !== this.vale4State.respondingTeam) {
      return { success: false, message: 'Não é a vez do seu time responder' };
    }

    if (accept) {
      this.vale4State.accepted = true;
      this.handValue = 4;
      return {
        success: true,
        accepted: true,
        handValue: this.handValue,
        vale4State: this.vale4State,
        currentPlayer: this.players[this.currentTurn].id
      };
    }

    const requestingTeam = this.teams[this.vale4State.team - 1];
    this.vale4State = null;
    this.handValue = 3;
    this.endHand(requestingTeam);
    return { success: true, accepted: false, handEnded: true, winningTeam: requestingTeam.id, points: 3, gameStatus: this.gameStatus, gameWinner: this.gameWinner };
  }

  // -------------------------------------------------------------- mão de onze

  respondToMaoDeOnze(playerId, play) {
    if (this.gameStatus !== 'playing') return { success: false, message: 'Jogo não está em andamento' };
    if (this.roundLocked) return { success: false, message: 'Aguarde o fim da rodada' };

    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, message: 'Jogador não encontrado' };
    if (!this.onzeState || !this.onzeState.waitingResponse) {
      return { success: false, message: 'Não há decisão de mão de onze pendente' };
    }
    if (player.team !== this.onzeState.team) {
      return { success: false, message: 'Apenas o time com 11 pontos decide' };
    }

    if (play) {
      this.onzeState = { ...this.onzeState, waitingResponse: false, accepted: true };
      this.handValue = 3;
      return { success: true, played: true, handValue: this.handValue };
    }

    const opposing = this.teams[this._otherTeamId(this.onzeState.team) - 1];
    this.onzeState = null;
    this.handValue = 1;
    this.endHand(opposing);
    return { success: true, played: false, handEnded: true, winningTeam: opposing.id, points: 1, gameStatus: this.gameStatus, gameWinner: this.gameWinner };
  }

  // ------------------------------------------------------------------- envido

  _envidoOpenError(player, label) {
    if (this.envidoState) return 'Já existe um pedido de Envido em andamento';
    if (this.envidoResolved) return 'O Envido já foi resolvido nesta mão';
    if (this.roundResults.length > 0) return `${label} só pode ser pedido na primeira rodada`;
    if (this._pendingBetMessage()) return 'Responda à aposta pendente antes de pedir Envido';
    if (player.hasPlayedCard()) return `${label} só pode ser pedido antes de jogar carta`;
    if (this.players.length === 4 && ![2, 3].includes(this.playedCards.length)) {
      return 'No 2x2, apenas os dois últimos podem pedir Envido';
    }
    if (this.currentTurn !== this.players.indexOf(player)) return 'Não é a vez do jogador';
    return null;
  }

  _openEnvido(playerId, level, value, label) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    const openError = this._envidoOpenError(player, label);
    if (openError) return { success: false, message: openError };

    return this._setEnvidoState(player, level, value, null);
  }

  _raiseEnvido(playerId, level, value, label, allowedFrom) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    const state = this.envidoState;
    if (!state || !state.waitingResponse) return { success: false, message: 'Não há pedido de Envido pendente' };
    if (player.team !== state.respondingTeam) {
      return { success: false, message: `Apenas o time respondente pode pedir ${label}` };
    }
    if (!allowedFrom.includes(state.level)) {
      return { success: false, message: `${label} não pode ser pedido agora` };
    }
    return this._setEnvidoState(player, level, value, state.level);
  }

  _setEnvidoState(player, level, value, previousLevel) {
    this.envidoState = {
      level,
      value,
      team: player.team,
      requestedBy: player.id,
      accepted: false,
      waitingResponse: true,
      respondingTeam: this._otherTeamId(player.team),
      previousLevel
    };
    return {
      success: true,
      envidoState: this.envidoState,
      waitingResponse: true,
      respondingTeam: this.envidoState.respondingTeam
    };
  }

  requestEnvido(playerId) {
    return this._openEnvido(playerId, 'envido', 2, 'Envido');
  }

  requestRealEnvido(playerId) {
    if (this.envidoState) return this._raiseEnvido(playerId, 'real_envido', 5, 'Real Envido', ['envido']);
    return this._openEnvido(playerId, 'real_envido', 5, 'Real Envido');
  }

  requestFaltaEnvido(playerId) {
    if (this.envidoState) return this._raiseEnvido(playerId, 'falta_envido', 'falta', 'Falta Envido', ['envido', 'real_envido']);
    return this._openEnvido(playerId, 'falta_envido', 'falta', 'Falta Envido');
  }

  _teamEnvido(teamId) {
    return this.players
      .filter(p => p.team === teamId)
      .reduce((max, p) => Math.max(max, p.calculateEnvido()), 0);
  }

  respondToEnvido(playerId, accept) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    const state = this.envidoState;
    if (!state || !state.waitingResponse) return { success: false, message: 'Não há pedido de Envido pendente' };
    if (player.team !== state.respondingTeam) return { success: false, message: 'Jogador não autorizado a responder' };

    const team1Envido = this._teamEnvido(1);
    const team2Envido = this._teamEnvido(2);
    let winningTeam = null;
    let pointsAwarded = 0;

    if (accept) {
      // Empate no Envido: vence o time do "mão".
      winningTeam = team1Envido > team2Envido ? 1 : team2Envido > team1Envido ? 2 : this._handStarterTeam().id;
      if (state.level === 'envido') pointsAwarded = 2;
      else if (state.level === 'real_envido') pointsAwarded = 5;
      else pointsAwarded = Math.max(0, this.targetScore - this.teams[winningTeam - 1].score);
      this.awardPoints(this.teams[winningTeam - 1], pointsAwarded);
    } else {
      // Recusar concede ao time que pediu o valor acumulado antes desta aposta.
      const previousValue = { envido: 2, real_envido: 5 }[state.previousLevel] || 1;
      pointsAwarded = previousValue;
      this.awardPoints(this.teams[state.team - 1], pointsAwarded);
    }

    this.envidoState = null;
    this.envidoResolved = true;

    return {
      success: true,
      accepted: accept,
      level: state.level,
      team1Envido,
      team2Envido,
      winningTeam: accept ? winningTeam : state.team,
      points: pointsAwarded,
      gameStatus: this.gameStatus,
      gameWinner: this.gameWinner
    };
  }

  // --------------------------------------------------------------------- flor

  declareFlor(playerId) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    if (this.florState || this.florResolved) {
      return { success: false, message: 'A Flor já foi resolvida nesta mão' };
    }
    if (this.roundResults.length > 0 || player.hasPlayedCard()) {
      return { success: false, message: 'A Flor só pode ser cantada antes de jogar a primeira carta' };
    }
    if (!player.hasFlor()) return { success: false, message: 'Jogador não tem Flor' };

    const respondingTeamId = this._otherTeamId(player.team);
    const opponentHasFlor = this.players.some(p => p.team === respondingTeamId && p.hasFlor());

    // Sem Flor do outro lado não há o que disputar: os 3 pontos vão direto.
    if (!opponentHasFlor) {
      this.awardPoints(this._teamOf(player), FLOR_POINTS.flor);
      this.florResolved = true;
      return {
        success: true,
        resolved: true,
        florState: null,
        winningTeam: player.team,
        points: FLOR_POINTS.flor,
        gameStatus: this.gameStatus,
        gameWinner: this.gameWinner
      };
    }

    this.florState = {
      level: 'flor',
      value: FLOR_POINTS.flor,
      team: player.team,
      declaredBy: playerId,
      requestedBy: playerId,
      respondingTeam: respondingTeamId,
      waitingResponse: true,
      accepted: false,
      previousLevel: null
    };
    return { success: true, florState: this.florState, waitingResponse: true, respondingTeam: respondingTeamId };
  }

  _raiseFlor(playerId, level, value, label) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    const state = this.florState;
    if (!state || !state.waitingResponse) return { success: false, message: 'Não há Flor pendente para contestar' };
    if (player.team !== state.respondingTeam) {
      return { success: false, message: `Apenas o time respondente pode pedir ${label}` };
    }
    if (!player.hasFlor()) return { success: false, message: `Você precisa ter Flor para pedir ${label}` };
    if (state.level === 'contra_flor_resto') return { success: false, message: 'Não é possível subir a Contra-Flor e o Resto' };

    this.florState = {
      level,
      value,
      team: player.team,
      requestedBy: player.id,
      respondingTeam: state.team,
      waitingResponse: true,
      accepted: false,
      previousLevel: state.level
    };
    return { success: true, florState: this.florState, waitingResponse: true, respondingTeam: this.florState.respondingTeam };
  }

  requestContraFlor(playerId) {
    return this._raiseFlor(playerId, 'contra_flor', FLOR_POINTS.contra_flor, 'Contra-Flor');
  }

  requestContraFlorResto(playerId) {
    return this._raiseFlor(playerId, 'contra_flor_resto', 'resto', 'Contra-Flor e o Resto');
  }

  respondToFlor(playerId, accept) {
    const { error, player } = this._betPrecheck(playerId);
    if (error) return { success: false, message: error };

    const state = this.florState;
    if (!state || !state.waitingResponse) return { success: false, message: 'Não há pedido de Flor pendente' };
    if (player.team !== state.respondingTeam) return { success: false, message: 'Jogador não autorizado a responder' };

    const teamFlor = (teamId) => this.players
      .filter(p => p.team === teamId && p.hasFlor())
      .reduce((max, p) => Math.max(max, p.calculateFlor()), 0);
    const team1Flor = teamFlor(1);
    const team2Flor = teamFlor(2);

    let winningTeam;
    let pointsAwarded;

    if (accept) {
      winningTeam = team1Flor > team2Flor ? 1 : team2Flor > team1Flor ? 2 : this._handStarterTeam().id;
      const winnerTeam = this.teams[winningTeam - 1];
      if (state.level === 'contra_flor_resto') pointsAwarded = Math.max(0, this.targetScore - winnerTeam.score);
      else pointsAwarded = FLOR_POINTS[state.level];
      this.awardPoints(winnerTeam, pointsAwarded);
    } else {
      // Recusar concede ao time que pediu o valor do nível anterior.
      winningTeam = state.team;
      pointsAwarded = state.level === 'flor' ? FLOR_POINTS.flor : (FLOR_POINTS[state.previousLevel] || FLOR_POINTS.flor);
      this.awardPoints(this.teams[state.team - 1], pointsAwarded);
    }

    this.florState = null;
    this.florResolved = true;

    return {
      success: true,
      accepted: accept,
      level: state.level,
      team1Flor,
      team2Flor,
      winningTeam,
      points: pointsAwarded,
      gameStatus: this.gameStatus,
      gameWinner: this.gameWinner
    };
  }

  // ------------------------------------------------------------------- estado

  // Estado enviado ao cliente. As cartas só vão para o dono da mão (`viewerId`) — e, na mão
  // de onze, para os parceiros do time que precisa decidir; os demais jogadores aparecem
  // apenas com a quantidade de cartas.
  getGameState(viewerId = null) {
    const viewer = viewerId ? this.players.find(p => p.id === viewerId) : null;
    const onzeReveal = Boolean(this.onzeState && this.onzeState.waitingResponse);

    const canSeeHand = (player) => Boolean(viewer && (
      viewer.id === player.id ||
      (onzeReveal && viewer.team === this.onzeState.team && player.team === viewer.team)
    ));

    return {
      roomId: this.roomId,
      status: this.gameStatus,
      gameStatus: this.gameStatus,
      hasStarted: this.gameStatus !== 'waiting',
      maxPlayers: this.maxPlayers,
      currentRound: this.currentRound,
      roundResults: this.roundResults.map(r => ({ winnerTeam: r.winnerTeam })),
      lastRound: this.lastRound,
      handValue: this.handValue,
      handMode: this.handMode,
      handStarter: this.players[this.handStarterIndex] ? this.players[this.handStarterIndex].id : null,
      locked: this.roundLocked,
      turnTimeoutMs: this.turnTimeoutMs || null,
      turnRemainingMs: this.turnDeadline ? Math.max(0, this.turnDeadline - Date.now()) : null,
      teams: this.teams.map(team => ({
        id: team.id,
        name: team.name,
        score: team.score,
        roundsWon: team.roundsWon
      })),
      currentPlayer: this.gameStatus === 'playing' && this.players[this.currentTurn]
        ? this.players[this.currentTurn].id
        : undefined,
      players: this.players.map(player => ({
        id: player.id,
        name: player.name,
        team: player.team,
        isReady: player.isReady,
        isBot: player.isBot,
        connected: player.connected,
        isCurrentPlayer: player.isCurrentPlayer,
        handCount: player.hand.length,
        hand: canSeeHand(player) ? player.hand.map(serializeCard) : []
      })),
      playedCards: this.playedCards.map(play => ({
        playerId: play.playerId,
        team: play.team,
        card: serializeCard(play.card)
      })),
      trucoState: this.trucoState,
      retrucoState: this.retrucoState,
      vale4State: this.vale4State,
      envidoState: this.envidoState,
      envidoResolved: this.envidoResolved,
      florState: this.florState,
      florResolved: this.florResolved,
      onzeState: this.onzeState,
      gameWinner: this.gameWinner ? this.gameWinner.id : null,
      rematchVotes: [...this.rematchVotes],
      me: viewer
        ? { hasFlor: viewer.hasFlor(), envido: viewer.calculateEnvido(), flor: viewer.calculateFlor() }
        : null
    };
  }

  getPlayerCards(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return { success: false, error: 'Jogador não encontrado' };
    if (this.gameStatus !== 'playing') return { success: false, error: 'Jogo ainda não começou' };
    if (!player.hand || player.hand.length === 0) return { success: false, error: 'Jogador não tem cartas' };
    return { success: true, cards: player.hand.map(serializeCard) };
  }

  // ----------------------------------------------------------------- snapshot

  toSnapshot() {
    const cardSnap = (card) => ({ value: card.value, suit: card.suit });
    return {
      roomId: this.roomId,
      maxPlayers: this.maxPlayers,
      gameStatus: this.gameStatus,
      targetScore: this.targetScore,
      maoDeOnze: this.maoDeOnze,
      currentTurn: this.currentTurn,
      handStarterIndex: this.handStarterIndex,
      currentRoundStarter: this.currentRoundStarter,
      handValue: this.handValue,
      handMode: this.handMode,
      roundLocked: this.roundLocked,
      roundWinner: this.roundWinner,
      pendingAdvance: this._pendingAdvance,
      lastRound: this.lastRound,
      players: this.players.map(p => ({
        id: p.id,
        name: p.name,
        team: p.team,
        isReady: p.isReady,
        isBot: p.isBot,
        timeouts: p.timeouts,
        hand: p.hand.map(cardSnap),
        dealtHand: p.dealtHand.map(cardSnap)
      })),
      teams: this.teams.map(t => ({ id: t.id, score: t.score, roundsWon: t.roundsWon })),
      playedCards: this.playedCards.map(pc => ({ playerId: pc.playerId, team: pc.team, card: cardSnap(pc.card) })),
      roundResults: this.roundResults,
      trucoState: this.trucoState,
      retrucoState: this.retrucoState,
      vale4State: this.vale4State,
      envidoState: this.envidoState,
      envidoResolved: this.envidoResolved,
      florState: this.florState,
      florResolved: this.florResolved,
      onzeState: this.onzeState,
      gameWinner: this.gameWinner ? this.gameWinner.id : null,
      rematchVotes: [...this.rematchVotes]
    };
  }

  static fromSnapshot(snap) {
    const game = new TrucoGame(snap.roomId, snap.maxPlayers);
    const toCard = (c) => new Card(c.value, c.suit);

    game.gameStatus = snap.gameStatus;
    game.targetScore = snap.targetScore;
    game.maoDeOnze = snap.maoDeOnze;
    game.currentTurn = snap.currentTurn;
    game.handStarterIndex = snap.handStarterIndex;
    game.currentRoundStarter = snap.currentRoundStarter;
    game.handValue = snap.handValue;
    game.handMode = snap.handMode;
    game.roundLocked = snap.roundLocked;
    game.roundWinner = snap.roundWinner;
    game._pendingAdvance = snap.pendingAdvance;
    game.lastRound = snap.lastRound;

    snap.players.forEach((ps) => {
      const player = new Player(ps.id, ps.name, ps.team, { isBot: ps.isBot });
      player._hand = ps.hand.map(toCard);
      player.dealtHand = ps.dealtHand.map(toCard);
      player.isReady = ps.isReady;
      player.timeouts = ps.timeouts;
      // Após um restart ninguém está conectado; os humanos precisam reconectar.
      player.connected = ps.isBot;
      game.players.push(player);
      game.teams[ps.team - 1].addPlayer(player);
    });
    game.players.forEach((p, i) => { p.isCurrentPlayer = game.gameStatus === 'playing' && i === game.currentTurn; });

    snap.teams.forEach((ts) => {
      game.teams[ts.id - 1].score = ts.score;
      game.teams[ts.id - 1].roundsWon = ts.roundsWon;
    });

    game.playedCards = snap.playedCards.map(pc => ({ playerId: pc.playerId, team: pc.team, card: toCard(pc.card) }));
    game.roundResults = snap.roundResults;
    game.trucoState = snap.trucoState;
    game.retrucoState = snap.retrucoState;
    game.vale4State = snap.vale4State;
    game.envidoState = snap.envidoState;
    game.envidoResolved = snap.envidoResolved;
    game.florState = snap.florState;
    game.florResolved = snap.florResolved;
    game.onzeState = snap.onzeState;
    game.gameWinner = snap.gameWinner ? game.teams[snap.gameWinner - 1] : null;
    game.rematchVotes = new Set(snap.rematchVotes);
    return game;
  }
}

module.exports = { Card, Deck, Player, Team, TrucoGame, serializeCard, TARGET_SCORE };
