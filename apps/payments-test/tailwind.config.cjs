/** @type {import('tailwindcss').Config} */
const token = (name) => `hsl(var(--${name}) / <alpha-value>)`;

module.exports = {
  content: [
    '../../packages/ui-tailwind/src/**/*.ts',
    '../../packages/ui-shadcn/kit.tsx',
    './src/shadcn/**/*.tsx',
  ],
  theme: {
    extend: {
      // shadcn/ui semantic colors, driven by the CSS variables in tailwind.css.
      colors: {
        border: token('border'),
        input: token('input'),
        ring: token('ring'),
        background: token('background'),
        foreground: token('foreground'),
        primary: {
          DEFAULT: token('primary'),
          foreground: token('primary-foreground'),
        },
        muted: {
          DEFAULT: token('muted'),
          foreground: token('muted-foreground'),
        },
        accent: {
          DEFAULT: token('accent'),
          foreground: token('accent-foreground'),
        },
        destructive: token('destructive'),
      },
    },
  },
};
