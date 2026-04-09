import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

function supabaseStorageHostname(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) return "localhost";
  try {
    return new URL(raw).hostname;
  } catch {
    return "localhost";
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: supabaseStorageHostname(),
        pathname: "/storage/v1/object/public/partner-portfolio/**",
      },
      /** 대표 이미지 URL로 네이버/카페 등 외부 CDN을 쓴 경우 */
      {
        protocol: "https",
        hostname: "search.pstatic.net",
        pathname: "/**",
      },
    ],
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
});

export default withPWA(nextConfig);
