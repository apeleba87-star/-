"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import MagamAppPitch from "@/components/magam/MagamAppPitch";
import MagamMyListingCard from "@/components/magam/MagamMyListingCard";
import { MagamRadarNationalBanner } from "@/components/magam/MagamRadarAdBanner";
import { magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import type { MagamListingRow } from "@/lib/magam/types";

type Props = { listings: MagamListingRow[] };

export default function MagamMyListings({ listings }: Props) {
  const router = useRouter();

  return (
    <div>
      <MagamAppPitch textAlign="center" dense taglineOnly className="mb-4" />
      <MagamRadarNationalBanner pagePath="magam:home" className="mb-4" />

      <h2 className="mb-3 text-[17px] font-bold tracking-[-0.3px] text-[#141824]">내 공고</h2>

      {listings.length === 0 ? (
        <div className="py-14 text-center">
          <p className="text-4xl text-[#8B93A1]" aria-hidden>
            📥
          </p>
          <p className="mt-4 text-[15px] font-semibold text-[#141824]">아직 등록한 공고가 없습니다</p>
          <p className="mt-2 text-[13px] text-[#5B6472]">아래 글쓰기 탭에서 첫 공고를 올려 보세요.</p>
          <Link href="/magam/write" className={`${magamPrimaryBtnClass} mt-6 max-w-xs mx-auto`}>
            글쓰기
          </Link>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {listings.map((listing) => (
            <li key={listing.id}>
              <MagamMyListingCard
                listing={listing}
                href={`/magam/listing/${listing.id}`}
              />
            </li>
          ))}
        </ul>
      )}
      <button
        type="button"
        className="sr-only"
        onClick={() => router.refresh()}
        aria-hidden
      />
    </div>
  );
}
