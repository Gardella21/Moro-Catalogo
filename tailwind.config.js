/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        tinta: '#16211C',
        papel: '#F7F8F6',
        verde: '#1F6F4A',
        verdeOsc: '#143D2B',
        ambar: '#C98A12',
        gris: '#6B7069',
        linea: '#E3E5E0'
      },
      fontFamily: {
        sans: ['Archivo', 'system-ui', 'sans-serif'],
        cond: ['"Archivo Narrow"', 'Archivo', 'system-ui', 'sans-serif']
      },
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }]
      },
      fontWeight: {
        400: '400', 500: '500', 600: '600', 700: '700'
      }
    }
  },
  plugins: []
}
