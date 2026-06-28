/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        hero: {
          navy: '#1e3a5f',
          primary: '#1e40af',
          primaryDark: '#1e3a8a',
          surface: '#FFFFFF',
          border: '#E2E8F0',
          accent: '#138808',
          accentDark: '#0f6b06',
          accentOrange: '#FF9933',
          text: '#1E293B',
          muted: '#64748B',
          soft: '#F8FAFC',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      }
    }
  },
  plugins: []
}
