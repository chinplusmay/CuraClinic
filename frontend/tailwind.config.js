/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#12282E',
        muted: '#5E7176',
        navy: {
          950: '#081E26',
          900: '#0B2630',
          800: '#103440',
          700: '#174654',
          600: '#215B69',
        },
        teal: {
          50: '#EDF5F2',
          100: '#D8EAE5',
          200: '#B2D5CD',
          300: '#85BCB0',
          400: '#54A094',
          500: '#34867A',
          600: '#236E64',
          700: '#1C5A52',
          800: '#164842',
          900: '#0F3833',
        },
        sand: {
          50: '#FBFAF6',
          100: '#F5F2EB',
          200: '#EBE6DA',
          300: '#DBD3C2',
          400: '#BEB3A0',
        },
        amber: {
          100: '#FCEFD8',
          300: '#F3C581',
          400: '#F0B35C',
          500: '#E29A3A',
          600: '#C17F26',
        },
        clay: {
          50: '#FBEFEC',
          100: '#F6DFD9',
          400: '#C8796B',
          500: '#B4564A',
          600: '#964238',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['"Plus Jakarta Sans"', 'Inter', 'ui-sans-serif', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(11, 38, 48, 0.04), 0 10px 30px -18px rgba(11, 38, 48, 0.25)',
        lift: '0 18px 50px -24px rgba(11, 38, 48, 0.45)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.45s ease-out both',
        'scale-in': 'scale-in 0.16s ease-out both',
      },
    },
  },
  plugins: [],
}
