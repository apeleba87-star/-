import type { Metadata } from "next";

import { MagamListingPeekItem } from "@/components/magam/MagamShareCard";
import MagamPosterCta from "@/components/magam/MagamPosterCta";
import { MagamRadarNationalBanner } from "@/components/magam/MagamRadarAdBanner";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { MAGAM_SHARE_FROM_PUBLIC_LIST } from "@/lib/magam/back-href";
import { MAGAM_SHARE_PAGE_TITLE } from "@/lib/magam/copy";
import { getMagamOpenListings } from "@/lib/magam/queries";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `모집 공고 | ${MAGAM_SHARE_PAGE_TITLE}`,
  description: "마감링크에 등록된 현재 모집 중인 도급·구인·매매 공고입니다.",
};

export default async function MagamPublicListingsPage() {
  const listings = await getMagamOpenListings({ limit: 100 });

  return (
    <div className="min-h-[100dvh] bg-[#F2F3F6] text-[#141824] antialiased">
      <div className="mx-auto w-full max-w-lg px-4 pt-3 pb-8">
        <MagamPageHeader title="모집 공고" />
        <p className="mb-4 text-[13px] leading-relaxed text-[#5B6472]">
          마감링크에 올라온 현재 모집 중인 공고입니다. 공고를 누르면 마감 여부와 연락처를
          확인할 수 있습니다.
        </p>

        {listings.length > 0 ? (
          <ul className="flex flex-col gap-2">
            {listings.map((listing) => (
              <li key={listing.id}>
                <MagamListingPeekItem
                  listing={listing}
                  shareFrom={MAGAM_SHARE_FROM_PUBLIC_LIST}
                />
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
            현재 모집 중인 공고가 없습니다.
          </p>
        )}

        <MagamPosterCta />

        <MagamRadarNationalBanner pagePath="magam:public-listings" className="mt-6" />
      </div>
    </div>
  );
}
