// Funções puras que derivam da tela o que o jogador pode fazer a partir do estado enviado
// pelo servidor. O servidor continua sendo a fonte da verdade: aqui só evitamos oferecer
// botões que ele recusaria.

export const getMe = (state, playerId) =>
  (state && state.players ? state.players.find(p => p.id === playerId) : null) || null;

// Reordena os assentos para que o jogador local fique sempre embaixo.
export const getSeats = (players, playerId) => {
  const total = players.length;
  const layout = total <= 2 ? ['bottom', 'top'] : ['bottom', 'left', 'top', 'right'];
  const myIndex = Math.max(0, players.findIndex(p => p.id === playerId));

  return players.map((player, index) => {
    const relativeIndex = (index - myIndex + total) % total;
    return { player, seat: layout[relativeIndex] || 'top', relativeIndex };
  });
};

const isPendingBet = (bet) => Boolean(bet && !bet.accepted);

const isOnzePending = (state) => Boolean(state.onzeState && state.onzeState.waitingResponse);

const hasSideBetPending = (state) =>
  Boolean((state.envidoState && state.envidoState.waitingResponse) ||
    (state.florState && state.florState.waitingResponse));

// Resposta que o time do jogador precisa dar agora, ou null.
export const getPendingResponse = (state, myTeam) => {
  if (!state || !myTeam) return null;

  const { trucoState, retrucoState, vale4State, envidoState, florState, onzeState } = state;

  if (isOnzePending(state) && onzeState.team === myTeam) {
    return { type: 'onze' };
  }
  if (isPendingBet(vale4State) && vale4State.respondingTeam === myTeam) {
    return { type: 'vale4', requestedBy: vale4State.requestedBy };
  }
  if (isPendingBet(retrucoState) && retrucoState.respondingTeam === myTeam) {
    return { type: 'retruco', requestedBy: retrucoState.requestedBy };
  }
  if (isPendingBet(trucoState) && trucoState.respondingTeam === myTeam) {
    return { type: 'truco', requestedBy: trucoState.requestedBy };
  }
  if (envidoState && envidoState.waitingResponse && envidoState.respondingTeam === myTeam) {
    return { type: 'envido', level: envidoState.level, requestedBy: envidoState.requestedBy };
  }
  if (florState && florState.waitingResponse && florState.respondingTeam === myTeam) {
    return { type: 'flor', level: florState.level, requestedBy: florState.requestedBy };
  }
  return null;
};

// Aposta pendente que o adversário ainda precisa responder (para mostrar "aguardando").
export const getWaitingOnOthers = (state, myTeam) => {
  if (!state || !myTeam) return null;

  const { trucoState, retrucoState, vale4State, envidoState, florState, onzeState } = state;
  const candidates = [
    isOnzePending(state) && { label: 'Mão de onze', team: onzeState.team },
    isPendingBet(vale4State) && { label: 'Vale 4', team: vale4State.respondingTeam },
    isPendingBet(retrucoState) && { label: 'Retruco', team: retrucoState.respondingTeam },
    isPendingBet(trucoState) && { label: 'Truco', team: trucoState.respondingTeam },
    envidoState && envidoState.waitingResponse && { label: 'Envido', team: envidoState.respondingTeam },
    florState && florState.waitingResponse && { label: 'Flor', team: florState.respondingTeam }
  ].filter(Boolean);

  const pending = candidates.find(c => c.team !== myTeam);
  return pending ? pending.label : null;
};

const NO_ACTIONS = {
  canPlay: false,
  canTruco: false,
  canRetruco: false,
  canVale4: false,
  canEnvido: false,
  canFlor: false
};

export const getAvailableActions = (state, playerId) => {
  const me = getMe(state, playerId);
  if (!state || !me || state.gameStatus !== 'playing' || state.locked) return NO_ACTIONS;

  const myTurn = state.currentPlayer === playerId;
  const { trucoState, retrucoState, vale4State } = state;
  const betPending = isPendingBet(trucoState) || isPendingBet(retrucoState) || isPendingBet(vale4State);
  const anythingPending = betPending || hasSideBetPending(state) || isOnzePending(state);
  const betsAllowed = state.handMode === 'normal';
  const firstRound = state.roundResults.length === 0;
  const hasNotPlayed = me.handCount === 3;

  const twoVsTwoOk = state.players.length !== 4 || [2, 3].includes(state.playedCards.length);

  return {
    canPlay: myTurn && !anythingPending,
    canTruco: betsAllowed && myTurn && !anythingPending && !trucoState && !retrucoState && !vale4State,
    canRetruco: betsAllowed && Boolean(trucoState) && !retrucoState && !vale4State && !hasSideBetPending(state) &&
      trucoState.respondingTeam === me.team,
    canVale4: betsAllowed && Boolean(retrucoState) && !vale4State && !hasSideBetPending(state) &&
      retrucoState.respondingTeam === me.team,
    canEnvido: betsAllowed && myTurn && !anythingPending && firstRound && hasNotPlayed && twoVsTwoOk &&
      !state.envidoState && !state.envidoResolved,
    canFlor: betsAllowed && !anythingPending && firstRound && hasNotPlayed && Boolean(state.me && state.me.hasFlor) &&
      !state.florState && !state.florResolved
  };
};

export const getMatchResult = (state, myTeam) => {
  if (!state || state.gameWinner == null) return null;
  return { won: state.gameWinner === myTeam, winnerTeam: state.gameWinner };
};

// Cartas dos parceiros visíveis para o jogador (na mão de onze, enquanto o time decide).
export const getPartnerHands = (state, playerId) => {
  const me = getMe(state, playerId);
  if (!state || !me) return [];
  return state.players.filter(p => p.id !== playerId && p.team === me.team && p.hand.length > 0);
};

export const ENVIDO_LABELS = { envido: 'Envido', real_envido: 'Real Envido', falta_envido: 'Falta Envido' };
export const FLOR_LABELS = { flor: 'Flor', contra_flor: 'Contra-Flor', contra_flor_resto: 'Contra-Flor e o Resto' };
