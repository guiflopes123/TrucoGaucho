// Estratégia simples dos bots. Não trapaceia: usa só a própria mão e o que está na mesa.
// `candidates` devolve as jogadas possíveis em ordem de preferência; quem executa tenta
// uma a uma até uma ser aceita pelas regras (assim a validação continua só no modelo).

const MAX_STRENGTH_PAIR = 27;

const sortedByStrength = (cards) => [...cards].sort((a, b) => a.compareWith(b));

// Qualidade da mão restante, de 0 a 1: as duas melhores cartas em relação ao máximo possível.
const handQuality = (cards) => {
  const best = sortedByStrength(cards).slice(-2).map(c => c.strength);
  const sum = best.reduce((total, value) => total + value, 0);
  return Math.min(1, sum / MAX_STRENGTH_PAIR);
};

const pendingResponse = (game, teamId) => {
  if (game.onzeState && game.onzeState.waitingResponse && game.onzeState.team === teamId) return 'onze';
  if (game.vale4State && !game.vale4State.accepted && game.vale4State.respondingTeam === teamId) return 'vale4';
  if (game.retrucoState && !game.retrucoState.accepted && game.retrucoState.respondingTeam === teamId) return 'retruco';
  if (game.trucoState && !game.trucoState.accepted && game.trucoState.respondingTeam === teamId) return 'truco';
  if (game.envidoState && game.envidoState.waitingResponse && game.envidoState.respondingTeam === teamId) return 'envido';
  if (game.florState && game.florState.waitingResponse && game.florState.respondingTeam === teamId) return 'flor';
  return null;
};

const chooseCardToPlay = (game, bot) => {
  const hand = sortedByStrength(bot.hand);
  const weakest = hand[0];
  const strongest = hand[hand.length - 1];
  if (hand.length === 1) return strongest;

  const table = game.playedCards;
  if (table.length === 0) {
    // Abrindo a 1ª rodada joga a carta do meio (guarda a melhor); nas demais, a mais forte.
    return game.roundResults.length === 0 ? hand[Math.floor(hand.length / 2)] : strongest;
  }

  let best = table[0];
  table.forEach((play) => { if (play.card.compareWith(best.card) > 0) best = play; });

  if (best.team === bot.team) return weakest;

  const winners = hand.filter(card => card.compareWith(best.card) > 0);
  return winners.length > 0 ? winners[0] : weakest;
};

const candidates = (game, botId, rng = Math.random) => {
  const bot = game.players.find(p => p.id === botId);
  if (!bot || game.gameStatus !== 'playing' || game.roundLocked) return [];

  const quality = handQuality(bot.hand);
  const envido = bot.calculateEnvido();
  const options = [];
  const pending = pendingResponse(game, bot.team);

  if (pending) {
    switch (pending) {
      case 'onze':
        options.push({ method: 'respondToMaoDeOnze', args: [quality >= 0.55 || rng() < 0.15] });
        options.push({ method: 'respondToMaoDeOnze', args: [false] });
        break;
      case 'truco':
        if (quality >= 0.78 && rng() < 0.5) options.push({ method: 'requestRetruco', args: [] });
        options.push({ method: 'respondToTruco', args: [quality >= 0.5 || rng() < 0.2] });
        options.push({ method: 'respondToTruco', args: [false] });
        break;
      case 'retruco':
        if (quality >= 0.88 && rng() < 0.5) options.push({ method: 'requestVale4', args: [] });
        options.push({ method: 'respondToRetruco', args: [quality >= 0.68 || rng() < 0.1] });
        options.push({ method: 'respondToRetruco', args: [false] });
        break;
      case 'vale4':
        options.push({ method: 'respondToVale4', args: [quality >= 0.82] });
        options.push({ method: 'respondToVale4', args: [false] });
        break;
      case 'envido':
        if (envido >= 33 && rng() < 0.3) options.push({ method: 'requestFaltaEnvido', args: [] });
        else if (envido >= 31 && game.envidoState.level === 'envido' && rng() < 0.5) options.push({ method: 'requestRealEnvido', args: [] });
        options.push({ method: 'respondToEnvido', args: [envido >= 26 || (envido >= 23 && rng() < 0.3)] });
        options.push({ method: 'respondToEnvido', args: [false] });
        break;
      case 'flor':
        if (bot.hasFlor() && bot.calculateFlor() >= 35 && game.florState.level === 'flor' && rng() < 0.4) {
          options.push({ method: 'requestContraFlor', args: [] });
        }
        options.push({ method: 'respondToFlor', args: [true] });
        options.push({ method: 'respondToFlor', args: [false] });
        break;
      default:
        break;
    }
    return options;
  }

  // Vez do bot: primeiro as cantorias (Flor, Envido, Truco), por fim jogar uma carta.
  if (game.players[game.currentTurn] && game.players[game.currentTurn].id === bot.id) {
    if (bot.hasFlor()) options.push({ method: 'declareFlor', args: [] });

    if (envido >= 31 && rng() < 0.4) options.push({ method: 'requestRealEnvido', args: [] });
    if (envido >= 28 && rng() < 0.6) options.push({ method: 'requestEnvido', args: [] });

    if (quality >= 0.72 && rng() < 0.3) options.push({ method: 'requestTruco', args: [] });

    const card = chooseCardToPlay(game, bot);
    if (card) options.push({ method: 'playCard', args: [{ value: card.value, suit: card.suit }] });
    // Último recurso, para nunca travar a partida.
    const fallback = game.weakestCard(bot);
    if (fallback) options.push({ method: 'playCard', args: [{ value: fallback.value, suit: fallback.suit }] });
    return options;
  }

  return [];
};

// Executa a primeira jogada aceita e devolve { method, result }, ou null se não houver o que fazer.
const act = (game, botId, rng = Math.random) => {
  for (const option of candidates(game, botId, rng)) {
    const result = game[option.method](botId, ...option.args);
    if (result && result.success) return { method: option.method, result };
  }
  return null;
};

// O bot precisa agir agora (jogada da vez ou resposta pendente do time)?
const needsAction = (game, botId) => {
  const bot = game.players.find(p => p.id === botId);
  if (!bot || game.gameStatus !== 'playing' || game.roundLocked) return false;
  if (pendingResponse(game, bot.team)) return true;
  if (game._pendingBetMessage()) return false;
  return game.players[game.currentTurn] && game.players[game.currentTurn].id === botId;
};

module.exports = { candidates, act, needsAction, handQuality, pendingResponse };
