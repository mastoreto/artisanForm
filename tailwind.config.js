/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{html,js,jsx,ts,tsx,mdx}',
    './.storybook/**/*.{js,ts,jsx,tsx,mdx}',
    './playground/**/*.{html,ts,tsx}',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
