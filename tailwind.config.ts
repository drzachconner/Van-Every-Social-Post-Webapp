import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#e09f9f',
          'pink-dark': '#c77e7e',
          cream: '#fdfbf7',
          charcoal: '#2d2d2d',
        },
      },
      maxWidth: {
        app: '640px',
      },
    },
  },
  plugins: [],
};

export default config;
