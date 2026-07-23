/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          950: '#050912',
          900: '#0A1120',
          800: '#0F1A2E',
          700: '#152340',
          600: '#1D2E50',
        },
        neon: {
          400: '#38BDF8',
          500: '#0EA5E9',
          600: '#0284C7',
        },
        cyan: {
          glow: '#22D3EE',
        },
        line: '#1E293B',
        muted: '#64748B',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        neon: '0 0 30px -6px rgba(56, 189, 248, 0.55)',
        card: '0 10px 30px -12px rgba(2, 132, 199, 0.20)',
      },
      backgroundImage: {
        'grid-fade':
          'linear-gradient(to bottom, rgba(56,189,248,0.05), transparent 60%), radial-gradient(circle at 30% 20%, rgba(56,189,248,0.10), transparent 40%)',
      },
    },
  },
  plugins: [],
};
