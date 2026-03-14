/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Mouse brain color palette — deep lab/science aesthetic
        lab: {
          bg: '#0d0f14',
          surface: '#141720',
          border: '#1e2330',
          muted: '#2a3040',
        },
        synapse: '#4af0c4',    // teal-green accent
        neuron: '#f06060',     // warm red for target region
        myelin: '#c8d8f0',     // cool blue-white for ghost brain
        correct: '#4af0c4',
        warm: '#f0a050',
        cold: '#5080f0',
      },
      fontFamily: {
        mono: ['IBM Plex Mono', 'monospace'],
        display: ['Space Mono', 'monospace'],
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'slide-up': 'slideUp 0.3s ease forwards',
        'pulse-glow': 'pulseGlow 2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 8px rgba(74, 240, 196, 0.3)' },
          '50%': { boxShadow: '0 0 20px rgba(74, 240, 196, 0.7)' },
        },
      },
    },
  },
  plugins: [],
};
