// Logger simples com níveis. Os logs "debug" só aparecem com DEBUG_LOGS=true ou fora
// de produção. O ambiente é lido a cada chamada, então funciona mesmo que o dotenv
// seja carregado depois deste módulo.
const isDebugEnabled = () =>
  process.env.DEBUG_LOGS === 'true' || process.env.NODE_ENV !== 'production';

const logger = {
  debug: (...args) => {
    if (isDebugEnabled()) console.log(...args);
  },
  info: (...args) => console.log(...args),
  warn: (...args) => console.warn(...args),
  error: (...args) => console.error(...args)
};

module.exports = logger;
