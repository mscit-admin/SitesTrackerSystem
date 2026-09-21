import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "Cairo",
          "Inter",
          "-apple-system",
          "Segoe UI",
          "Tahoma",
          "Arial",
          "sans-serif",
        ],
      },
      colors: {
        // Frappe / ERPNext grayscale
        gray: {
          50: "#f9fafa",
          100: "#f4f5f6",
          200: "#e2e6e9",
          300: "#d1d8dd",
          400: "#b9c0c7",
          500: "#8d99a6",
          600: "#6c7680",
          700: "#4c5a67",
          800: "#313b44",
          900: "#1f272e",
        },
        // Frappe blue = primary/brand (keeps existing `brand` class usages working)
        brand: {
          DEFAULT: "#2490ef",
          light: "#4aa3f2",
          dark: "#1b7fd4",
          soft: "#e8f3fd",
        },
        primary: {
          DEFAULT: "#2490ef",
          dark: "#1b7fd4",
          soft: "#e8f3fd",
        },
      },
      borderRadius: {
        DEFAULT: "8px",
        md: "8px",
        lg: "10px",
        xl: "12px",
      },
      boxShadow: {
        card: "0 1px 2px rgba(31,39,46,0.06)",
        pop: "0 4px 16px rgba(31,39,46,0.12)",
      },
    },
  },
  plugins: [],
};

export default config;
