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
  /** Next 16: dev 기본 Turbopack인데 webpack 설정이 있으면 빈 객체로 의도 표시 필요 */
  turbopack: {},
  /**
   * pdfjs-dist 번들 안의 webpack 런타임이 Next 개발용 eval-source-map과 충돌하면
   * `Object.defineProperty called on non-object` 가 납니다. 소스맵을 끄면 회피됩니다.
   * (일반 개발은 Turbopack `npm run dev` 권장 — webpack 자체를 안 타면 이 설정도 필요 없음.)
   */
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      config.devtool = false;
    }
    return config;
  },
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
  async rewrites() {
    return [
      { source: "/magam/app", destination: "/magam/app/index.html" },
      { source: "/magam/app/:path*", destination: "/magam/app/index.html" },
    ];
  },
};

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  scope: "/",
});

export default withPWA(nextConfig);
