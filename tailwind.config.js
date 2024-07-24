/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-conic":
          "conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))",
      },
     
        colors: {
          'white': '#ffffff',        // Text color (white)
          'black': '#000000',        // Absolute black
          'dark-grey': '#1f2937',     // Dark background color (gray-900)
          'dark-blue': '#6366f1',   // Primary color (indigo-400)
          'grey': '#d1d5db',     // Secondary color (gray-300)
        },
    },
  },
  plugins: [],
};
