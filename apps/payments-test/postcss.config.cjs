module.exports = {
  plugins: [
    require('tailwindcss')({ config: `${__dirname}/tailwind.config.cjs` }),
    require('autoprefixer'),
  ],
};
