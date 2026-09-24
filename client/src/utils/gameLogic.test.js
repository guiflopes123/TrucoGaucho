import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getAvailableActions,
  getMatchResult,
  getPartnerHands,
  getPendingResponse,
  getSeats,
  getWaitingOnOthers
} from './gameLogic.js';

const player = (id, team, extra = {}) => ({
  id, name: id, team, handCount: 3, hand: [], isCurrentPlayer: false, connected: true, ...extra
});

const baseState = (overrides = {}) => ({
  gameStatus: 'playing',
  locked: false,
  currentPlayer: 'a',
  players: [player('a', 1, { isCurrentPlayer: true }), player('b', 2)],
  playedCards: [],
  roundResults: [],
  trucoState: null,
  retrucoState: null,
  vale4State: null,
  envidoState: null,
  envidoResolved: false,
  florState: null,
  florResolved: false,
  handMode: 'normal',
  onzeState: null,
  gameWinner: null,
  me: { hasFlor: false, envido: 20, flor: 0 },
  ...overrides
});

describe('getSeats', () => {
  it('deixa o jogador local embaixo e o adversário em cima no 1x1', () => {
    const players = [player('a', 1), player('b', 2)];
    assert.deepEqual(getSeats(players, 'b').map(s => [s.player.id, s.seat]), [['a', 'top'], ['b', 'bottom']]);
    assert.deepEqual(getSeats(players, 'a').map(s => [s.player.id, s.seat]), [['a', 'bottom'], ['b', 'top']]);
  });

  it('gira os assentos no 2x2 mantendo a ordem de jogo', () => {
    const players = [player('a', 1), player('b', 2), player('c', 1), player('d', 2)];
    const seats = Object.fromEntries(getSeats(players, 'c').map(s => [s.player.id, s.seat]));
    assert.deepEqual(seats, { c: 'bottom', d: 'left', a: 'top', b: 'right' });
  });
});

describe('getAvailableActions', () => {
  it('libera jogar e pedir Truco/Envido apenas na própria vez', () => {
    const mine = getAvailableActions(baseState(), 'a');
    assert.equal(mine.canPlay, true);
    assert.equal(mine.canTruco, true);
    assert.equal(mine.canEnvido, true);

    const theirs = getAvailableActions(baseState(), 'b');
    assert.equal(theirs.canPlay, false);
    assert.equal(theirs.canTruco, false);
    assert.equal(theirs.canEnvido, false);
  });

  it('bloqueia tudo enquanto a rodada é resolvida ou fora de partida', () => {
    assert.equal(getAvailableActions(baseState({ locked: true }), 'a').canPlay, false);
    assert.equal(getAvailableActions(baseState({ gameStatus: 'waiting' }), 'a').canTruco, false);
    assert.equal(getAvailableActions(null, 'a').canPlay, false);
  });

  it('só o time que respondeu ao Truco pode pedir Retruco, e só o outro pede Vale 4', () => {
    const truco = { level: 'truco', team: 1, respondingTeam: 2, requestedBy: 'a', accepted: true };
    const state = baseState({ trucoState: truco });
    assert.equal(getAvailableActions(state, 'b').canRetruco, true);
    assert.equal(getAvailableActions(state, 'a').canRetruco, false);
    assert.equal(getAvailableActions(state, 'a').canTruco, false);

    const retruco = { level: 'retruco', team: 2, respondingTeam: 1, requestedBy: 'b', accepted: true };
    const raised = baseState({ retrucoState: retruco });
    assert.equal(getAvailableActions(raised, 'a').canVale4, true);
    assert.equal(getAvailableActions(raised, 'b').canVale4, false);
  });

  it('não oferece Envido depois da 1ª rodada, de jogar carta ou de resolvido', () => {
    assert.equal(getAvailableActions(baseState({ roundResults: [{ winnerTeam: 1 }] }), 'a').canEnvido, false);
    const played = baseState({ players: [player('a', 1, { handCount: 2, isCurrentPlayer: true }), player('b', 2)] });
    assert.equal(getAvailableActions(played, 'a').canEnvido, false);
    assert.equal(getAvailableActions(baseState({ envidoResolved: true }), 'a').canEnvido, false);
  });

  it('no 2x2 só os dois últimos da rodada podem pedir Envido', () => {
    const four = [player('a', 1), player('b', 2), player('c', 1, { isCurrentPlayer: true }), player('d', 2)];
    const early = baseState({ players: four, currentPlayer: 'a' });
    assert.equal(getAvailableActions(early, 'a').canEnvido, false);

    const late = baseState({ players: four, currentPlayer: 'c', playedCards: [{}, {}] });
    assert.equal(getAvailableActions(late, 'c').canEnvido, true);
  });

  it('libera Flor apenas para quem tem Flor, antes de jogar e uma vez por mão', () => {
    const withFlor = baseState({ me: { hasFlor: true, envido: 30, flor: 35 } });
    assert.equal(getAvailableActions(withFlor, 'a').canFlor, true);
    assert.equal(getAvailableActions(baseState(), 'a').canFlor, false);
    assert.equal(getAvailableActions({ ...withFlor, florResolved: true }, 'a').canFlor, false);
  });

  it('bloqueia jogar e apostar enquanto há resposta pendente', () => {
    const state = baseState({
      trucoState: { level: 'truco', team: 2, respondingTeam: 1, requestedBy: 'b', accepted: false }
    });
    const actions = getAvailableActions(state, 'a');
    assert.equal(actions.canPlay, false);
    assert.equal(actions.canTruco, false);
    assert.equal(actions.canRetruco, true, 'subir a aposta é uma forma de responder');
  });
});

describe('respostas pendentes', () => {
  it('indica a resposta que o time do jogador deve dar', () => {
    const state = baseState({
      envidoState: { level: 'real_envido', waitingResponse: true, respondingTeam: 1, requestedBy: 'b' }
    });
    assert.deepEqual(getPendingResponse(state, 1), { type: 'envido', level: 'real_envido', requestedBy: 'b' });
    assert.equal(getPendingResponse(state, 2), null);
    assert.equal(getWaitingOnOthers(state, 2), 'Envido');
    assert.equal(getWaitingOnOthers(state, 1), null);
  });

  it('prioriza a aposta mais alta e ignora apostas já aceitas', () => {
    const state = baseState({
      trucoState: { level: 'truco', team: 1, respondingTeam: 2, requestedBy: 'a', accepted: true },
      retrucoState: { level: 'retruco', team: 2, respondingTeam: 1, requestedBy: 'b', accepted: false }
    });
    assert.equal(getPendingResponse(state, 1).type, 'retruco');
    assert.equal(getPendingResponse(state, 2), null);
  });

  it('responde Flor pendente ao time adversário', () => {
    const state = baseState({
      florState: { level: 'flor', waitingResponse: true, respondingTeam: 2, requestedBy: 'a' }
    });
    assert.equal(getPendingResponse(state, 2).type, 'flor');
    assert.equal(getWaitingOnOthers(state, 1), 'Flor');
  });
});

describe('mão de onze e mão de ferro', () => {
  const onze = { team: 1, waitingResponse: true, accepted: false };

  it('o time com 11 decide; ninguém joga nem aposta até a decisão', () => {
    const state = baseState({ handMode: 'onze', onzeState: onze });
    assert.deepEqual(getPendingResponse(state, 1), { type: 'onze' });
    assert.equal(getPendingResponse(state, 2), null);
    assert.equal(getWaitingOnOthers(state, 2), 'Mão de onze');

    const actions = getAvailableActions(state, 'a');
    assert.equal(actions.canPlay, false);
    assert.equal(actions.canTruco, false);
    assert.equal(actions.canEnvido, false);
  });

  it('depois de decidir jogar, dá para jogar cartas mas continua sem apostas', () => {
    const state = baseState({ handMode: 'onze', onzeState: { ...onze, waitingResponse: false, accepted: true } });
    const actions = getAvailableActions(state, 'a');
    assert.equal(actions.canPlay, true);
    assert.equal(actions.canTruco, false);
    assert.equal(actions.canEnvido, false);
    assert.equal(getPendingResponse(state, 1), null);
  });

  it('mão de ferro: joga normalmente, sem apostas', () => {
    const actions = getAvailableActions(baseState({ handMode: 'ferro' }), 'a');
    assert.equal(actions.canPlay, true);
    assert.equal(actions.canTruco, false);
    assert.equal(actions.canFlor, false);
  });

  it('lista as cartas visíveis dos parceiros', () => {
    const card = { value: '3', suit: 'copas' };
    const state = baseState({
      players: [player('a', 1), player('b', 2), player('c', 1, { hand: [card] }), player('d', 2)]
    });
    assert.deepEqual(getPartnerHands(state, 'a').map(p => p.id), ['c']);
    assert.deepEqual(getPartnerHands(baseState(), 'a'), []);
  });
});

describe('getMatchResult', () => {
  it('compara o time vencedor com o time do jogador (o bug do "Eles" sempre)', () => {
    assert.deepEqual(getMatchResult(baseState({ gameWinner: 2 }), 2), { won: true, winnerTeam: 2 });
    assert.deepEqual(getMatchResult(baseState({ gameWinner: 2 }), 1), { won: false, winnerTeam: 2 });
    assert.equal(getMatchResult(baseState(), 1), null);
  });
});
