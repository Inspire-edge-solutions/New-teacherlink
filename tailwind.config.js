/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Montserrat', 'ui-sans-serif', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', '"Helvetica Neue"', 'Arial', '"Noto Sans"', 'sans-serif'],
      },
      fontSize: {
        'montserrat-base': ['16px', {
          lineHeight: '150%',
          letterSpacing: '0%',
          fontWeight: '400',
        }],
        'montserrat-h1': ['28px', {
          lineHeight: '120%',
          letterSpacing: '0%',
          fontWeight: '400',
        }],
        'montserrat-h2': ['24px', {
          lineHeight: '130%',
          letterSpacing: '0%',
          fontWeight: '400',
        }],
        'montserrat-h3': ['20px', {
          lineHeight: '140%',
          letterSpacing: '0%',
          fontWeight: '400',
        }],
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #ec4899, #ef4444)',
        'gradient-primary-hover': 'linear-gradient(to right, #db2777, #dc2626)',
        'gradient-brand': 'linear-gradient(90deg, #F34B58 0%, #A1025D 100%)',
        'gradient-brand-light': 'linear-gradient(90deg, #FF7A8A 0%, #E04A8A 100%)',
        'gradient-brand-light-hover': 'linear-gradient(90deg, #FF6A7A 0%, #D03A7A 100%)',
        'gradient-brand-text': 'linear-gradient(to right, #F34B58, #A1025D)',
      },
      keyframes: {
        slideIn: {
          'from': {
            opacity: '0',
            transform: 'translateY(-15px) scale(0.98)',
          },
          'to': {
            opacity: '1',
            transform: 'translateY(0) scale(1)',
          },
        },
        gentlePulse: {
          '0%, 100%': {
            transform: 'scale(1)',
          },
          '50%': {
            transform: 'scale(1.03)',
          },
        },
        modalSlideIn: {
          '0%': {
            opacity: '0',
            transform: 'translateY(-20px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        successBounce: {
          '0%, 20%, 50%, 80%, 100%': {
            transform: 'translateY(0)',
          },
          '40%': {
            transform: 'translateY(-8px)',
          },
          '60%': {
            transform: 'translateY(-4px)',
          },
        },
        fadeIn: {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        slideUp: {
          'from': { transform: 'translateY(30px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        coinDrop: {
          '0%': { transform: 'translateY(-50px)', opacity: '0' },
          '60%': { transform: 'translateY(10px)' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animation: {
        'slideIn': 'slideIn 0.3s ease-out',
        'gentlePulse': 'gentlePulse 3s infinite',
        'modalSlideIn': 'modalSlideIn 0.3s ease-out',
        'successBounce': 'successBounce 2s infinite',
        'fadeIn': 'fadeIn 0.2s ease',
        'slideUp': 'slideUp 0.3s ease',
        'coinDrop': 'coinDrop 0.5s ease',
      },
    },
  },
  plugins: [],
}

