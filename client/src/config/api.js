// Configuração para produção
const PRODUCTION_URL = 'http://localhost:5000';

// Configuração para desenvolvimento
const DEVELOPMENT_URL = 'http://localhost:5000';

// Determinar qual URL usar com base no ambiente
const API_URL = process.env.NODE_ENV === 'production' 
  ? PRODUCTION_URL 
  : DEVELOPMENT_URL;

export default API_URL;
