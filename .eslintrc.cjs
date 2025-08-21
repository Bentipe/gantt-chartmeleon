/* ESLint configuration for Vue 3 project with 2-space indent */
module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  plugins: [
    'vue',
  ],
  rules: {
    // JavaScript/TypeScript indentation
    indent: ['error', 2, { SwitchCase: 1 }],
    // Enforce consistent indentation in <template>
    'vue/html-indent': ['error', 2, {
      attribute: 1,
      baseIndent: 1,
      closeBracket: 0,
      alignAttributesVertically: true,
      ignores: [],
    }],
    // Optional: keep semicolons consistent (typical default)
    semi: ['error', 'always'],
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
  },
  overrides: [
    {
      files: ['**/*.vue'],
      parser: 'vue-eslint-parser',
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      rules: {
        // Ensure script blocks also use 2-space indents
        'vue/script-indent': ['error', 2, { baseIndent: 0, switchCase: 1 }],
      },
    },
  ],
};