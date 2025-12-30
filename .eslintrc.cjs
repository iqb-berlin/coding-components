module.exports = {
  overrides: [
    {
      files: ['**/*.ts'],
      extends: '@iqb/eslint-config',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.eslint.json']
      },
      rules: {
        'import/no-extraneous-dependencies': 'off'
      }
    },
    {
      files: ['**/*.html'],
      parser: '@angular-eslint/template-parser',
      plugins: ['@angular-eslint/template']
    },
    {
      files: ['**/karma.conf.js'],
      extends: '@iqb/eslint-config/javascript',
      env: {
        node: true
      },
      rules: {
        'no-underscore-dangle': 'off',
        'func-names': 'off',
        'import/no-extraneous-dependencies': 'off'
      }
    },
    {
      files: ['**/*.js'],
      extends: '@iqb/eslint-config/javascript'
    }
  ]
};
