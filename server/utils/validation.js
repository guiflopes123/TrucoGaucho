const MAX_PLAYER_NAME = 20;
const MAX_ROOM_NAME = 30;
const MAX_CHAT_LENGTH = 140;
const MIN_PASSWORD = 3;
const MAX_PASSWORD = 30;
const VALID_MAX_PLAYERS = [2, 4];

// Remove caracteres de controle e espaços extras; devolve '' se não for texto.
const isPrintable = (char) => {
  const code = char.codePointAt(0);
  return code > 31 && code !== 127;
};

const cleanText = (value, maxLength) => {
  if (typeof value !== 'string') return '';
  return [...value].filter(isPrintable).join('').replace(/\s+/g, ' ').trim().slice(0, maxLength);
};

const validatePlayerName = (value) => {
  const name = cleanText(value, MAX_PLAYER_NAME);
  if (name.length < 3) return { ok: false, message: 'O nome deve ter pelo menos 3 caracteres' };
  return { ok: true, value: name };
};

// Senha opcional da sala: vazia significa sala pública.
const validatePassword = (value) => {
  if (value === undefined || value === null || value === '') return { ok: true, value: null };
  if (typeof value !== 'string') return { ok: false, message: 'Senha inválida' };
  const password = value.trim();
  if (password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return { ok: false, message: `A senha deve ter entre ${MIN_PASSWORD} e ${MAX_PASSWORD} caracteres` };
  }
  return { ok: true, value: password };
};

const validateRoomParams = (roomName, maxPlayers) => {
  const name = cleanText(roomName, MAX_ROOM_NAME);
  if (!name) return { ok: false, message: 'Nome da sala é obrigatório' };

  const players = Number(maxPlayers);
  if (!VALID_MAX_PLAYERS.includes(players)) {
    return { ok: false, message: 'Número de jogadores deve ser 2 ou 4' };
  }
  return { ok: true, name, maxPlayers: players };
};

const validateChatText = (value) => {
  const text = cleanText(value, MAX_CHAT_LENGTH);
  if (!text) return { ok: false, message: 'Mensagem vazia' };
  return { ok: true, value: text };
};

module.exports = {
  MAX_PLAYER_NAME,
  MAX_ROOM_NAME,
  MAX_CHAT_LENGTH,
  VALID_MAX_PLAYERS,
  cleanText,
  validatePlayerName,
  validatePassword,
  validateRoomParams,
  validateChatText
};
