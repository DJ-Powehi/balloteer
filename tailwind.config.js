/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./pages/**/*.{js,jsx,ts,tsx}",
      "./components/**/*.{js,jsx,ts,tsx}",
    ],
    theme: {
      extend: {
        colors: {
          "balloteer-blue": "#0f172a",
        },
        backgroundImage: {
          "balloteer-radial":
            "radial-gradient(circle at 10% 20%, rgba(0,168,255,0.25) 0%, rgba(0,0,0,0) 50%)",
        },
        keyframes: {
          "spin-slow": {
            to: { transform: "rotate(360deg)" },
          },
        },
        animation: {
          "spin-slow": "spin-slow 18s linear infinite",
        },
      },
    },
    plugins: [],
  };
  