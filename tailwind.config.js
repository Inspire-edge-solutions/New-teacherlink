/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        'gradient-primary': 'linear-gradient(to right, #ec4899, #ef4444)',
        'gradient-primary-hover': 'linear-gradient(to right, #db2777, #dc2626)',
        'gradient-brand': 'linear-gradient(90deg, #F34B58 0%, #A1025D 100%)',
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
      },
      animation: {
        'slideIn': 'slideIn 0.3s ease-out',
        'gentlePulse': 'gentlePulse 3s infinite',
        'modalSlideIn': 'modalSlideIn 0.3s ease-out',
        'successBounce': 'successBounce 2s infinite',
      },
    },
  },
  plugins: [],
}

