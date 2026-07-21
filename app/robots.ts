import { getBaseUrl } from "@/lib/seo";
import type { MetadataRoute } from "next";

/**
 * 관리·인증 경로는 크롤 제외.
 * AI 학습 봇 차단은 청소지식「인용」목표와 충돌할 수 있어 기본은 열어둠.
 * 학습만 막으려면 docs/abuse-hardening.md 참고.
 */
export default function robots(): MetadataRoute.Robots {
  const base = getBaseUrl();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/api/",
        "/login",
        "/signup",
        "/mypage/",
        "/jobs/manage",
        "/onboarding",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
