import Link from "next/link";
import { notFound } from "next/navigation";
import DemandShell from "@/components/demand/DemandShell";
import DemandIndexHero from "@/components/demand/DemandIndexHero";
import DemandDriverList from "@/components/demand/DemandDriverList";
import DemandExplorationLinks from "@/components/demand/DemandExplorationLinks";
import DemandRegionExtras from "@/components/demand/DemandRegionExtras";
import ChannelHints from "@/components/demand/ChannelHints";
import { getDemandDistrictBySlug, DEMAND_HITS } from "@/lib/demand/dummy-data";
import { guSlugToName, isValidGuSlug } from "@/lib/demand/slugs";

type Props = { params: Promise<{ guSlug: string }> };

export async function generateMetadata({ params }: Props) {
  const { guSlug } = await params;
  const gu = guSlugToName(guSlug);
  return {
    title: gu ? `${gu} 입주수요 | 클린아이덱스` : "지역 상세",
  };
}

export default async function DemandRegionDetailPage({ params }: Props) {
  const { guSlug } = await params;
  if (!isValidGuSlug(guSlug)) notFound();

  const district = getDemandDistrictBySlug(guSlug);
  if (!district) {
    return (
      <DemandShell title={guSlugToName(guSlug) ?? "지역"} subtitle="이 구의 상세 데이터는 아직 준비 중입니다.">
        <Link href="/demand/region" className="text-sm font-semibold text-teal-700">
          ← 지역 목록
        </Link>
      </DemandShell>
    );
  }

  const relatedHits = DEMAND_HITS.filter((h) => !h.gu || h.gu === district.gu).slice(0, 2);

  return (
    <DemandShell title={district.gu} subtitle={undefined}>
      <DemandIndexHero district={district} />

      <div className="mt-6 space-y-6">
        <DemandDriverList drivers={district.drivers} gu={district.gu} />
        <DemandExplorationLinks district={district} />

        <DemandRegionExtras
          gu={district.gu}
          tenderCount={district.drilldownExtra.tenderCount}
          hits={relatedHits}
        />

        <ChannelHints />
      </div>
    </DemandShell>
  );
}
