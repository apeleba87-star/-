import type { Metadata } from "next";
import DemandHubPageView from "@/components/demand/DemandHubPageView";
import { DEMAND_HUB_HERO } from "@/lib/demand/copy";
import { getBaseUrl, SITE_NAME } from "@/lib/seo";

export const revalidate = 3600;

const title = "입주레이더 | 클린아이덱스";
const description = DEMAND_HUB_HERO.subtitle;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/" },
  openGraph: {
    title,
    description,
    url: `${getBaseUrl()}/`,
    siteName: SITE_NAME,
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
  },
};

export default function HomePage() {
  return <DemandHubPageView />;
}
