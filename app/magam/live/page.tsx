import type { Metadata } from "next";

import MagamLiveFeed from "@/components/magam/MagamLiveFeed";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { MAGAM_SHARE_FROM_LIVE } from "@/lib/magam/back-href";
import { isMagamLiveSiteEntry, magamLiveBackHref } from "@/lib/magam/live-entry";
import { getMagamOpenListings } from "@/lib/magam/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "실시간 모집",
  description: "현재 모집 중인 도급·구인 공고",
};

type SearchParams = Promise<{ from?: string }>;

export default async function MagamLivePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const fromSite = isMagamLiveSiteEntry(params.from);
  const listings = await getMagamOpenListings({ limit: 100 });

  return (
    <>
      <MagamPageHeader title="실시간 모집" backHref={magamLiveBackHref(params.from)} />
      <p className="mb-4 text-[13px] text-[#5B6472]">
        {fromSite
          ? "클린아이덱스에 등록된 현재 모집 중인 도급·구인 공고입니다."
          : "현재 모집 중인 도급·구인 공고입니다."}
      </p>
      <MagamLiveFeed
        initialListings={listings}
        shareFrom={fromSite ? "cleanidex" : MAGAM_SHARE_FROM_LIVE}
      />
    </>
  );
}
