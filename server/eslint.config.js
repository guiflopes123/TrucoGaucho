const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    // gameControllerExtended.js e tests/ são restos obsoletos aguardando remoção.
    ignores: ['node_modules/', 'controllers/gameControllerExtended.js', 'tests/']
  },
  js.configs.recommended,
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: 'commonjs',
      globals: { ...globals.node, ...globals.mocha }
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'no-console': 'off',
      eqeqeq: ['error', 'always', { null: 'ignore' }]
    }
  }
];
