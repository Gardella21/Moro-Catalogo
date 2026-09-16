/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        desde600: '600px',
        desde720: '720px'
      },
      colors: {
        surface: 'var(--surface)',
        'surface-raised': 'var(--surface-raised)',
        'surface-sunken': 'var(--surface-sunken)',
        line: 'var(--line)',
        'line-strong': 'var(--line-strong)',
        ink: 'var(--ink)',
        'ink-muted': 'var(--ink-muted)',
        navy: 'var(--navy)',
        'navy-strong': 'var(--navy-strong)',
        'on-navy': 'var(--on-navy)',
        masthead: 'var(--masthead)',
        'on-masthead': 'var(--on-masthead)',
        'masthead-muted': 'var(--masthead-muted)',
        brass: 'var(--brass)',
        bordo: 'var(--bordo)',
        'bordo-soft': 'var(--bordo-soft)',
        ambar: '#C98A12'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif']
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        meta: ['13px', { lineHeight: '18px' }],
        pack: ['12px', { lineHeight: '16px' }]
      },
      fontWeight: {
        400: '400', 500: '500', 600: '600', 700: '700'
      }
    }
  },
  plugins: []
}
