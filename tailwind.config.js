/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: '#00d2ff',
        danger: '#ff4757',
        success: '#00f260',
        bgDeep: '#04161F',
        bgCard: 'rgba(255,255,255,0.02)',
      },
    },
  },
  plugins: [],
};
