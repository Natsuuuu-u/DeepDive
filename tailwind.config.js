/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'ui-monospace', 'monospace'],
        body: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        // Depth zones (surface -> hadal)
        sunlit: { 400: '#38bdf8', 600: '#0284c7', 900: '#0c4a6e' },
        twilight: { 400: '#6366f1', 600: '#4338ca', 900: '#1e1b4b' },
        midnight: { 400: '#7c3aed', 600: '#5b21b6', 900: '#170f3a' },
        abyss: { 400: '#0d9488', 600: '#115e59', 900: '#04121f' },
        hadal: { 400: '#f472b6', 600: '#9d174d', 900: '#050208' },
        // UI accents
        sonar: '#67e8f9',
        gold: '#facc15',
        coral: '#fb7185',
        kelp: '#4ade80',
        ink: '#04121f',
      },
      boxShadow: {
        pixel: '4px 4px 0 0 rgba(0,0,0,0.55)',
        'pixel-sm': '2px 2px 0 0 rgba(0,0,0,0.55)',
        glow: '0 0 24px rgba(103,232,249,0.35)',
      },
      keyframes: {
        bob: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: { bob: 'bob 3s steps(6) infinite' },
    },
  },
  plugins: [],
}
