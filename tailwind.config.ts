import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-cairo)", "Tahoma", "Arial", "sans-serif"],
      },
      colors: {
        brand: {
          DEFAULT: "#0b3d63",
          light: "#14588c",
          dark: "#07293f",
        },
        accent: "#c9a227",
      },
    },
  },
  plugins: [],
};

export default config;
