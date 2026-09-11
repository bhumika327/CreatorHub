/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // Enables class-based dark mode triggering
  theme: {
    extend: {
      colors: {
        chatBg: {
          light: '#ffffff',
          dark: '#343541', // ChatGPT style background
        },
        sidebarBg: {
          light: '#f9f9f9',
          dark: '#202123', // ChatGPT sidebar background
        },
        chatMessage: {
          user: '#2188ff',
          assistant: '#10a37f', // green ChatGPT primary color
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
