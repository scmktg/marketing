import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Beachie brand palette — placeholder values, replaced when brand_assets uploaded.
        // Hamptons-inspired lakeside: cream, soft blues, weathered timber.
        beachie: {
          cream: "#F7F1E5",
          sand: "#E8DCC4",
          lake: "#3F7A8C",
          deep: "#1E4D5E",
          coral: "#D9776B",
        },
      },
      fontFamily: {
        sans: ["system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
