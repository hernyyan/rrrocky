/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#1a3728',
          foreground: '#f5f2ea',
        },
        secondary: {
          DEFAULT: '#cfe0ca',
          foreground: '#1a3728',
        },
        muted: {
          DEFAULT: '#dce7d7',
          foreground: '#5c6e58',
        },
        border: 'rgba(26, 55, 40, 0.12)',
        background: '#f5f2ea',
        foreground: '#172a1f',
        destructive: '#b54040',
        gray: {
          50:  '#eff4ec',
          100: '#e2ebdc',
          200: '#c6d8bd',
          300: '#a8c09d',
          400: '#8aa880',
          500: '#6c8f63',
          600: '#527448',
          700: '#3c5834',
          800: '#283c22',
          900: '#162114',
          950: '#0b100a',
        },
      },
      borderRadius: {
        lg: '0.625rem',
      },
      fontFamily: {
        tabular: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
    },
  },
  plugins: [],
}
