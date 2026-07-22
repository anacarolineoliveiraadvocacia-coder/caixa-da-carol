/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        pessoal: {
          DEFAULT: '#0ea5e9',
          soft: '#e0f2fe'
        },
        escritorio: {
          DEFAULT: '#7c3aed',
          soft: '#ede9fe'
        },
        marca: {
          DEFAULT: '#0f766e',
          dark: '#115e59',
          soft: '#ccfbf1'
        }
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif']
      }
    }
  },
  plugins: []
}
