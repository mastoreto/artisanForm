// ESLint only runs the React Hooks / React Compiler rules. Everything else
// (style, correctness, a11y) is Biome's job: `bun run lint`.
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
  {
    // Payment providers start the payment once, on mount: re-running the
    // effect would create a second PaymentIntent / checkout / order for the
    // same step, so their props are read once, when the payment starts.
    // This is configured here, not with `eslint-disable` comments, because
    // the React Compiler skips any component that carries such a comment.
    files: ['src/integrations/payments/providers/*.tsx'],
    rules: { 'react-hooks/exhaustive-deps': 'off' },
  },
];
