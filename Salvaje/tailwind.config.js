/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        salvaje: {
          brown: '#2C1810',
          cream: '#F5ECD7',
          dark: '#1A0F0A',
          orange: '#D4521A',
          fire: '#E8732A',
          gold: '#C9A227',
          success: '#2D7A4F',
          danger: '#8B1A1A',
          gray: '#6B5C52',
          light: '#FAF6F0',
          'light-alt': '#F0E8D8',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        salvaje: '0 4px 16px rgba(44,24,16,0.08)',
        'salvaje-md': '0 8px 24px rgba(44,24,16,0.12)',
        'salvaje-lg': '0 16px 48px rgba(44,24,16,0.16)',
        'salvaje-glow': '0 0 24px rgba(212,82,26,0.3)',
      },
      borderRadius: {
        salvaje: '16px',
      },
      animation: {
        'pulse-ring': 'pulseRing 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'slide-up': 'slideUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        'fade-in': 'fadeIn 0.2s ease-out',
        'fire-flicker': 'fireFlicker 1.5s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
      },
      keyframes: {
        pulseRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: 1 },
          '50%': { transform: 'scale(1.05)', opacity: 0.8 },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        fireFlicker: {
          '0%, 100%': { transform: 'rotate(-2deg) scale(1)' },
          '50%': { transform: 'rotate(2deg) scale(1.05)' },
        },
      },
    },
  },
  plugins: [],
}
