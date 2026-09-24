// Textos dos avisos da mesa, indexados pelo método do modelo. Usados tanto pelas ações dos
// jogadores (socket/handlers.js) quanto pelas dos bots (controllers/gameController.js).
const ENVIDO_LABELS = { envido: 'Envido', real_envido: 'Real Envido', falta_envido: 'Falta Envido' };
const FLOR_LABELS = { flor: 'Flor', contra_flor: 'Contra-Flor', contra_flor_resto: 'Contra-Flor e o Resto' };

const plural = (points) => `${points} ponto${points === 1 ? '' : 's'}`;
const teamName = (room, teamId) => room.game.teams[teamId - 1].name;

const NOTICES = {
  playCard: null,

  requestTruco: (n) => `${n} pediu TRUCO!`,
  requestRetruco: (n) => `${n} pediu RETRUCO!`,
  requestVale4: (n) => `${n} pediu VALE 4!`,

  respondToTruco: (n, r, room) => (r.accepted
    ? `${n} aceitou o Truco. A mão vale 2.`
    : `${n} recusou o Truco. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`),
  respondToRetruco: (n, r, room) => (r.accepted
    ? `${n} aceitou o Retruco. A mão vale 3.`
    : `${n} recusou o Retruco. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`),
  respondToVale4: (n, r, room) => (r.accepted
    ? `${n} aceitou o Vale 4. A mão vale 4.`
    : `${n} recusou o Vale 4. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`),

  requestEnvido: (n) => `${n} pediu ENVIDO!`,
  requestRealEnvido: (n) => `${n} pediu REAL ENVIDO!`,
  requestFaltaEnvido: (n) => `${n} pediu FALTA ENVIDO!`,
  respondToEnvido: (n, r, room) => (r.accepted
    ? `${ENVIDO_LABELS[r.level]} aceito! ${teamName(room, 1)}: ${r.team1Envido} x ${teamName(room, 2)}: ${r.team2Envido}. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`
    : `${n} recusou o ${ENVIDO_LABELS[r.level]}. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`),

  declareFlor: (n, r, room) => (r.resolved
    ? `${n} cantou FLOR! ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`
    : `${n} cantou FLOR!`),
  requestContraFlor: (n) => `${n} pediu CONTRA-FLOR!`,
  requestContraFlorResto: (n) => `${n} pediu CONTRA-FLOR E O RESTO!`,
  respondToFlor: (n, r, room) => (r.accepted
    ? `${FLOR_LABELS[r.level]} aceita! ${teamName(room, 1)}: ${r.team1Flor} x ${teamName(room, 2)}: ${r.team2Flor}. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`
    : `${n} recusou a ${FLOR_LABELS[r.level]}. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`),

  respondToMaoDeOnze: (n, r, room) => (r.played
    ? `${n} decidiu jogar a mão de onze. A mão vale 3.`
    : `${n} correu da mão de onze. ${teamName(room, r.winningTeam)} ganha ${plural(r.points)}.`)
};

module.exports = { NOTICES };
