/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
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
      },
      animation: {
        'slideIn': 'slideIn 0.3s ease-out',
        'gentlePulse': 'gentlePulse 3s infinite',
      },
    },
  },
  plugins: [],
}

