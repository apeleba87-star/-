import { getBaseUrl } from "@/lib/seo";

/**
 * 관리·인증 경로는 크롤 제외.
 * AI 학습 봇 차단은 청소지식「인용」목표와 충돌할 수 있어 기본은 열어둠.
 * 학습만 막으려면 docs/abuse-hardening.md 참고.
 *
 * 다음(Daum) 웹마스터 인증 PIN은 파일 하단 주석으로 유지합니다.
 */
const DAUM_WEBMASTER_PIN =
  "#DaumWebMasterTool:72a99f4f8e0b61b6e2f15e02f7b687627689fd9ee0efb91532bb5e7276df590e:bKQkbJu3gAwxD8v6N8HiFQ==";

export function GET() {
  const base = getBaseUrl();
  const body = [
    "User-Agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "Disallow: /api/",
    "Disallow: /login",
    "Disallow: /signup",
    "Disallow: /mypage/",
    "Disallow: /jobs/manage",
    "Disallow: /onboarding",
    "",
    `Sitemap: ${base}/sitemap.xml`,
    "",
    DAUM_WEBMASTER_PIN,
    "",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
