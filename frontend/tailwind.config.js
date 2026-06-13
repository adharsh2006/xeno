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
          50: '#ede9ff',
          100: '#d4ccff',
          200: '#b3a6ff',
          300: '#8a7bff',
          400: '#6b5cff',
          500: '#534AB7',
          600: '#4338a0',
          700: '#352d85',
          800: '#27226a',
          900: '#1a1750',
        },
        accent: {
          green: '#1D9E75',
          'green-light': '#e8f8f3',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'count-up': 'countUp 1s ease-out',
        'slide-in-top': 'slideInTop 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
        'pulse-scale': 'pulseScale 0.3s ease-in-out',
        'spin-slow': 'spin 1.5s linear infinite',
      },
      keyframes: {
        countUp: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInTop: {
          '0%': { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        pulseScale: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
}
