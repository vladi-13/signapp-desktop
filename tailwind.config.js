/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef9ff",
          100: "#d7f0ff",
          200: "#b6e2ff",
          300: "#86ceff",
          400: "#54b4ff",
          500: "#2c97ff",
          600: "#1778f5",
          700: "#135fca",
          800: "#124fa4",
          900: "#133f80",
          950: "#0b274d",
        },
      },
      boxShadow: { soft: "0 10px 25px rgba(0,0,0,.08)" },
      borderRadius: { "2xl": "1rem" },
    },
  },
  plugins: [],
}
