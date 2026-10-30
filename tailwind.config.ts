import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        slate: { 50: '#f6f9fc', 100: '#edf4fc', 200: '#d7e4f2', 300: '#b8c9dd', 400: '#92a5bd', 500: '#7389a2', 600: '#50657e', 700: '#30465d', 800: '#203247', 900: '#111d2a', 950: '#080e17' },
        emerald: { 50: '#f7ffe5', 100: '#edffc5', 200: '#e2ff98', 300: '#d8ff62', 400: '#c8f64c', 500: '#acd63d', 600: '#84aa24', 700: '#58771d', 800: '#344d19', 900: '#203514', 950: '#101e0c' },
        cyan: { 100: '#defaff', 200: '#a9f1ff', 300: '#65e6ff', 400: '#36d1ee', 500: '#16adc9', 600: '#0c87a1', 700: '#0b657b', 800: '#104754', 900: '#0c303e', 950: '#081b26' }
      }
    }
  },
  plugins: []
} satisfies Config;
