/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1C2230",
        paper: "#FAFAF8",
        tint: "#EEF0FA",
        primary: { DEFAULT: "#1E3A5F", light: "#2E5585", dark: "#132840" },
        teal: { DEFAULT: "#0F9B8E", light: "#45BDB1" },
        marigold: { DEFAULT: "#F5A623", light: "#FBC56B" },
      },
      fontFamily: {
        display: ["Baloo 2", "sans-serif"],
        body: ["Inter", "sans-serif"],
      },
      borderRadius: { card: "18px" },
    },
  },
  plugins: [],
};
