import type { Metadata } from "next";

import MagamLiveFeed from "@/components/magam/MagamLiveFeed";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { getMagamOpenListings } from "@/lib/magam/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "실시간 모집",
  description: "현재 모집 중인 도급·구인 공고",
};

export default async function MagamLivePage() {
  const listings = await getMagamOpenListings({ limit: 100 });
  return (
    <>
      <MagamPageHeader title="실시간 모집" backHref="/magam/me" />
      <p className="mb-4 text-[13px] text-[#5B6472]">
        현재 모집 중인 도급·구인 공고입니다.
      </p>
      <MagamLiveFeed initialListings={listings} />
    </>
  );
}
