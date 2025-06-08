module.exports = {
  content: ['./src/**/*.{js,jsx}', './public/index.html'],
  darkMode: 'class',
  theme: {
    extend: {
      width: {
        'week-range': 'var(--week-range-width)',
      },
    },
  },
  plugins: [],
};
