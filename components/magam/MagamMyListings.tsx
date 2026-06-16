"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { getMyMagamClosedListingsPage } from "@/app/magam/actions";
import MagamAppPitch from "@/components/magam/MagamAppPitch";
import MagamMyListingCard from "@/components/magam/MagamMyListingCard";
import MagamPwaInstallBanner from "@/components/magam/MagamPwaInstallBanner";
import MagamOnboardingCarousel from "@/components/magam/onboarding/MagamOnboardingCarousel";
import { MagamRadarNationalBanner } from "@/components/magam/MagamRadarAdBanner";
import { magamOutlineBtnClass, magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import { MagamTapLink, magamTapClass } from "@/components/magam/ui/MagamTouchNav";
import {
  MAGAM_MY_CLOSED_LOADING,
  MAGAM_MY_CLOSED_PAGE_NEXT,
  MAGAM_MY_CLOSED_PAGE_PREV,
  MAGAM_MY_OPEN_EMPTY_WITH_CLOSED,
  MAGAM_MY_OPEN_HAS_MORE,
  magamMyClosedSectionToggleLabel,
} from "@/lib/magam/copy";
import { MAGAM_MY_CLOSED_PAGE_SIZE, MAGAM_MY_OPEN_LISTINGS_LIMIT } from "@/lib/magam/my-listings";
import type { MagamListingRow } from "@/lib/magam/types";
import { cn } from "@/lib/utils";

type Props = {
  openListings: MagamListingRow[];
  openHasMore?: boolean;
  closedTotal: number;
};

export default function MagamMyListings({
  openListings,
  openHasMore = false,
  closedTotal,
}: Props) {
  const router = useRouter();
  const [closedExpanded, setClosedExpanded] = useState(false);
  const [closedPage, setClosedPage] = useState(0);
  const [closedListings, setClosedListings] = useState<MagamListingRow[]>([]);
  const [closedLoading, setClosedLoading] = useState(false);
  const [closedError, setClosedError] = useState<string | null>(null);
  const [closedLoadedPage, setClosedLoadedPage] = useState<number | null>(null);

  const hasAny = openListings.length > 0 || closedTotal > 0;
  const closedPageCount =
    closedTotal > 0 ? Math.ceil(closedTotal / MAGAM_MY_CLOSED_PAGE_SIZE) : 0;
  const showClosedPager = closedExpanded && closedPageCount > 1;

  const loadClosedPage = useCallback(async (page: number) => {
    setClosedLoading(true);
    setClosedError(null);
    const result = await getMyMagamClosedListingsPage(page);
    setClosedLoading(false);
    if (!result.ok) {
      setClosedError(result.error);
      return;
    }
    setClosedListings(result.listings);
    setClosedPage(result.page);
    setClosedLoadedPage(result.page);
  }, []);

  const toggleClosed = async () => {
    if (closedExpanded) {
      setClosedExpanded(false);
      return;
    }
    setClosedExpanded(true);
    if (closedLoadedPage !== closedPage) {
      await loadClosedPage(closedPage);
    }
  };

  const goClosedPage = async (nextPage: number) => {
    if (nextPage < 0 || nextPage >= closedPageCount) return;
    setClosedPage(nextPage);
    await loadClosedPage(nextPage);
  };

  return (
    <div>
      <MagamOnboardingCarousel />
      <MagamPwaInstallBanner />
      <MagamAppPitch textAlign="center" dense taglineOnly className="mb-4" />
      <MagamRadarNationalBanner pagePath="magam:home" className="mb-4" />

      <h2 className="mb-3 text-[17px] font-bold tracking-[-0.3px] text-[#141824]">내 공고</h2>

      {!hasAny ? (
        <div className="py-14 text-center">
          <p className="text-4xl text-[#8B93A1]" aria-hidden>
            📥
          </p>
          <p className="mt-4 text-[15px] font-semibold text-[#141824]">아직 등록한 공고가 없습니다</p>
          <p className="mt-2 text-[13px] text-[#5B6472]">아래 글쓰기 탭에서 첫 공고를 올려 보세요.</p>
          <MagamTapLink href="/magam/write" className={`${magamPrimaryBtnClass} mx-auto mt-6 max-w-xs`}>
            글쓰기
          </MagamTapLink>
        </div>
      ) : (
        <>
          {openListings.length > 0 ? (
            <ul className="space-y-2.5">
              {openListings.map((listing) => (
                <li key={listing.id}>
                  <MagamMyListingCard listing={listing} href={`/magam/listing/${listing.id}`} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-[13px] text-[#5B6472]">{MAGAM_MY_OPEN_EMPTY_WITH_CLOSED}</p>
          )}

          {openHasMore ? (
            <p className="mt-3 text-center text-[12px] text-[#8B93A1]">
              {MAGAM_MY_OPEN_HAS_MORE(MAGAM_MY_OPEN_LISTINGS_LIMIT)}
            </p>
          ) : null}

          {closedTotal > 0 ? (
            <div className={cn(openListings.length > 0 || !openHasMore ? "mt-5" : "mt-3")}>
              <button
                type="button"
                onClick={() => void toggleClosed()}
                disabled={closedLoading}
                aria-expanded={closedExpanded}
                className={cn(
                  magamTapClass,
                  "flex w-full items-center gap-2 rounded-[14px] border border-[#E3E6EC] bg-[#F8F9FB] px-3.5 py-3 text-left text-[14px] font-semibold text-[#5B6472] hover:bg-[#F2F3F6] active:bg-[#E8EAED] disabled:pointer-events-none disabled:opacity-60"
                )}
              >
                <span className="text-[#8B93A1]" aria-hidden>
                  {closedExpanded ? "▼" : "▶"}
                </span>
                {magamMyClosedSectionToggleLabel(closedTotal, closedExpanded)}
              </button>

              {closedExpanded ? (
                <div className="mt-2.5">
                  {closedLoading ? (
                    <p className="py-6 text-center text-[13px] text-[#8B93A1]">{MAGAM_MY_CLOSED_LOADING}</p>
                  ) : closedError ? (
                    <p className="py-4 text-center text-[13px] text-[#DC2626]">{closedError}</p>
                  ) : (
                    <ul className="space-y-2.5">
                      {closedListings.map((listing) => (
                        <li key={listing.id}>
                          <MagamMyListingCard
                            listing={listing}
                            href={`/magam/listing/${listing.id}`}
                          />
                        </li>
                      ))}
                    </ul>
                  )}

                  {showClosedPager ? (
                    <div className="mt-3 flex items-center justify-center gap-3">
                      <button
                        type="button"
                        disabled={closedLoading || closedPage <= 0}
                        onClick={() => void goClosedPage(closedPage - 1)}
                        className={`${magamOutlineBtnClass} !min-h-0 !px-3 !py-2 text-[13px]`}
                      >
                        {MAGAM_MY_CLOSED_PAGE_PREV}
                      </button>
                      <span className="text-[13px] font-semibold text-[#5B6472]">
                        {closedPage + 1} / {closedPageCount}
                      </span>
                      <button
                        type="button"
                        disabled={closedLoading || closedPage >= closedPageCount - 1}
                        onClick={() => void goClosedPage(closedPage + 1)}
                        className={`${magamOutlineBtnClass} !min-h-0 !px-3 !py-2 text-[13px]`}
                      >
                        {MAGAM_MY_CLOSED_PAGE_NEXT}
                      </button>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </>
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
