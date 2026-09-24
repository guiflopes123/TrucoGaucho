// URL do servidor (Express + Socket.IO).
//
// Produção: defina VITE_API_URL (num .env ou nas variáveis da hospedagem) com a URL pública
// do back-end antes de rodar `npm run build`.
// Desenvolvimento: sem VITE_API_URL o app usa o mesmo host da página na porta 5000. Assim
// funciona tanto em http://localhost:3000 quanto pela rede local (http://192.168.x.x:3000),
// onde "localhost" apontaria para o aparelho do próprio jogador.
const DEV_API_PORT = 5000;

const devUrl = () => {
  if (typeof window === 'undefined') return `http://localhost:${DEV_API_PORT}`;
  return `${window.location.protocol}//${window.location.hostname}:${DEV_API_PORT}`;
};

const API_URL = import.meta.env.VITE_API_URL || devUrl();

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn(
    '[config/api] VITE_API_URL não foi definida: o app vai falar com o mesmo host da página na ' +
    `porta ${DEV_API_PORT}. Configure VITE_API_URL com a URL pública do back-end antes de publicar.`
  );
}

export default API_URL;
