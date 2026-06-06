import type { Metadata } from "next";
import HomeCleanidexNarrative from "@/components/home/HomeCleanidexNarrative";
import { defaultDescription, defaultTitle, getBaseUrl, SITE_NAME } from "@/lib/seo";

export const metadata: Metadata = {
  title: `클린아이덱스 소개 | ${SITE_NAME}`,
  description: defaultDescription,
  alternates: { canonical: "/cleanidex/about" },
  openGraph: {
    title: defaultTitle,
    description: defaultDescription,
    url: `${getBaseUrl()}/cleanidex/about`,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
};

export default function CleanidexAboutPage() {
  return (
    <div className="min-h-screen bg-zinc-100 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,rgba(120,113,198,0.08),transparent_50%),radial-gradient(ellipse_80%_50%_at_100%_50%,rgba(14,165,233,0.05),transparent_45%)]">
      <div className="page-shell py-6 sm:py-10 lg:py-12">
        <div className="mx-auto flex w-full max-w-3xl flex-col sm:max-w-4xl xl:max-w-5xl 2xl:max-w-6xl">
          <HomeCleanidexNarrative />
        </div>
      </div>
    </div>
  );
}
