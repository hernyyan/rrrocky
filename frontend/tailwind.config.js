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
          DEFAULT: '#1a1f35',
          foreground: '#ffffff',
        },
        secondary: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        muted: {
          DEFAULT: '#f1f5f9',
          foreground: '#64748b',
        },
        border: '#e2e8f0',
        background: '#f8fafc',
        foreground: '#1a1f35',
        destructive: '#991b1b',
      },
      borderRadius: {
        sm:  '3px',
        DEFAULT: '4px',
        md:  '4px',
        lg:  '8px',
        xl:  '8px',
        '2xl': '8px',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', "'Segoe UI'", 'Roboto', 'sans-serif'],
        tabular: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
      },
      letterSpacing: {
        'sm-section': '1.5px',
        'sm-metric':  '0.5px',
        'sm-tag':     '0.5px',
        'sm-nav':     '1px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
