// ESLint only runs the React Hooks / React Compiler rules. Everything else
// (style, correctness, a11y) is Biome's job: `pnpm lint`.
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';

export default [
  {
    ignores: ['dist', 'storybook-static', 'test-results', 'playwright-report'],
  },
  {
    files: ['src/**/*.{ts,tsx}', 'playground/src/**/*.{ts,tsx}'],
    languageOptions: { parser: tseslint.parser },
    plugins: { 'react-hooks': reactHooks },
    rules: { ...reactHooks.configs.flat['recommended-latest'].rules },
  },
];
