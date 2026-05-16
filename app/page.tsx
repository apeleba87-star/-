import type { Metadata } from "next";
import HomeCleanidexNarrative from "@/components/home/HomeCleanidexNarrative";
import HomeBottomAd from "@/components/home/HomeBottomAd";
import { getBaseUrl, defaultTitle, defaultDescription, SITE_NAME } from "@/lib/seo";

/** 홈: 검색·SNS 공유 시 기본 메타를 명시( canonical, OG URL ) */
export const metadata: Metadata = {
  title: { absolute: defaultTitle },
  description: defaultDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: `${getBaseUrl()}/`,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
  },
};

/** 홈: 클린아이덱스 내러티브(검정 CTA 블록까지)만 노출 */
export default function HomePage() {
  return (
    <div className="min-h-screen bg-zinc-100 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(120,113,198,0.08),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(14,165,233,0.05),transparent_45%)]">
      <div className="page-shell py-6 sm:py-10 lg:py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col sm:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
          <HomeCleanidexNarrative />
          <HomeBottomAd />
        </div>
      </div>
    </div>
  );
}
