const STORAGE_KEY = 'truco.session';

const generateToken = () => {
  const bytes = new Uint8Array(24);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Token secreto da sessão, guardado por aba (sessionStorage): sobrevive ao F5 e a quedas de
// rede, mas duas abas abertas são dois jogadores diferentes.
export const getSessionToken = () => {
  try {
    let token = window.sessionStorage.getItem(STORAGE_KEY);
    if (!token) {
      token = generateToken();
      window.sessionStorage.setItem(STORAGE_KEY, token);
    }
    return token;
  } catch {
    return generateToken();
  }
};
