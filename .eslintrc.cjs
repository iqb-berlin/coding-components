module.exports = {
  overrides: [
    {
      files: ['**/*.ts'],
      extends: '@iqb/eslint-config',
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: ['./tsconfig.eslint.json']
      }
    },
    {
      files: ['**/*.js'],
      extends: '@iqb/eslint-config/javascript'
    }
  ]
};
