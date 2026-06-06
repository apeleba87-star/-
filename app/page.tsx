import DemandHubPageView from "@/components/demand/DemandHubPageView";
import { buildPageMetadata, radarHomeDescription, radarHomeTitle } from "@/lib/seo";

export const revalidate = 3600;

export const metadata = buildPageMetadata({
  title: radarHomeTitle,
  description: radarHomeDescription,
  path: "/",
});

export default function HomePage() {
  return <DemandHubPageView />;
}
