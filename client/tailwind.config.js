export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: { extend: {
    colors: { bg: 'var(--bg)', card: 'var(--card)', line: 'var(--line)', ink: 'var(--ink)', mute: 'var(--mute)',
      acc: 'var(--acc)', accfg: 'var(--accfg)', ok: 'var(--ok)', bad: 'var(--bad)', badbg: 'var(--badbg)', hov: 'var(--hov)',
      c1: 'var(--c1)', c2: 'var(--c2)', c3: 'var(--c3)', c4: 'var(--c4)', c5: 'var(--c5)' },
    fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'] },
    borderRadius: { card: '16px' },
    keyframes: {
      fadeUp: { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'none' } },
      pop: { from: { opacity: 0, transform: 'scale(.94)' }, to: { opacity: 1, transform: 'none' } },
      toast: { from: { opacity: 0, transform: 'translateY(16px) scale(.95)' }, to: { opacity: 1, transform: 'none' } },
      wave: { '0%,100%': { transform: 'rotate(0)' }, '25%': { transform: 'rotate(18deg)' }, '75%': { transform: 'rotate(-12deg)' } },
      drive: { '0%': { transform: 'translateX(-6px)' }, '100%': { transform: 'translateX(0)' } },
    },
    animation: { 'fade-up': 'fadeUp .45s cubic-bezier(.2,.8,.2,1) both', pop: 'pop .22s ease both', toast: 'toast .3s ease both',
      wave: 'wave 1.6s ease-in-out 1', drive: 'drive .6s ease-out both' },
  } },
};
