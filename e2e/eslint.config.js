// Configuração de lint do e2e; reaproveita as dependências instaladas em server/.
const js = require('../server/node_modules/@eslint/js');
const globals = require('../server/node_modules/globals');

module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, WebSocket: 'readonly', fetch: 'readonly', localStorage: 'readonly', document: 'readonly', location: 'readonly' }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      eqeqeq: ['error', 'always', { null: 'ignore' }]
    }
  }
];
