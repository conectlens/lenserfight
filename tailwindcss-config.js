/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  colors: {
    primary: '#ffde59',
    deep: '#01040aff',
    gray: {
      50: '#F9FAFB',
      100: '#EDEDED' /* Text Color */,
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#262626' /* Border Color */,
      800: '#1A1A1A' /* Sidebar/Surface Background */,
      900: '#121212' /* Main Background */,
    },
  },
  fontFamily: {
    sans: ['Inter', 'sans-serif'],
  },
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  plugins: [],
}
