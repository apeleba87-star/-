import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // 최소 지원: Galaxy S25 등 360px 뷰포트 (xs 이상에서 레이아웃 검증)
      screens: { xs: "360px" },
    },
  },
  plugins: [],
};

export default config;
