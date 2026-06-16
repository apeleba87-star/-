"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { getMyMagamClosedListingsPage } from "@/app/magam/actions";
import MagamAppPitch from "@/components/magam/MagamAppPitch";
import MagamMyListingCard from "@/components/magam/MagamMyListingCard";
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
import { readMagamLocallyClosedIds } from "@/lib/magam/listing-close-sync";
import type { MagamListingRow } from "@/lib/magam/types";
import { cn } from "@/lib/utils";

const MagamOnboardingCarousel = dynamic(
  () => import("@/components/magam/onboarding/MagamOnboardingCarousel"),
  { loading: () => null }
);
const MagamPwaInstallBanner = dynamic(() => import("@/components/magam/MagamPwaInstallBanner"), {
  loading: () => null,
});
const MagamRadarNationalBanner = dynamic(
  () =>
    import("@/components/magam/MagamRadarAdBanner").then((m) => ({
      default: m.MagamRadarNationalBanner,
    })),
  { loading: () => null }
);

type Props = {
  openListings: MagamListingRow[];
  openHasMore?: boolean;
  closedTotal: number;
  closedListingsFirstPage?: MagamListingRow[];
};

function buildClosedCache(firstPage: MagamListingRow[]): Map<number, MagamListingRow[]> {
  const cache = new Map<number, MagamListingRow[]>();
  if (firstPage.length > 0) cache.set(0, firstPage);
  return cache;
}

export default function MagamMyListings({
  openListings: openListingsProp,
  openHasMore = false,
  closedTotal: closedTotalProp,
  closedListingsFirstPage = [],
}: Props) {
  const router = useRouter();
  const [openListings, setOpenListings] = useState(openListingsProp);
  const [closedTotal, setClosedTotal] = useState(closedTotalProp);
  const [closedExpanded, setClosedExpanded] = useState(false);
  const [closedPage, setClosedPage] = useState(0);
  const [closedListings, setClosedListings] = useState(closedListingsFirstPage);
  const [closedLoading, setClosedLoading] = useState(false);
  const [closedError, setClosedError] = useState<string | null>(null);
  const closedCacheRef = useRef(buildClosedCache(closedListingsFirstPage));
  const closedFirstPageKey = closedListingsFirstPage.map((row) => row.id).join(",");

  useEffect(() => {
    setOpenListings(openListingsProp);
    setClosedTotal(closedTotalProp);
    closedCacheRef.current = buildClosedCache(closedListingsFirstPage);
    setClosedListings(closedListingsFirstPage);
    setClosedPage(0);
    setClosedExpanded(false);
    setClosedError(null);
    setClosedLoading(false);
  }, [openListingsProp, closedTotalProp, closedFirstPageKey, closedListingsFirstPage]);

  useEffect(() => {
    const locallyClosed = readMagamLocallyClosedIds();
    if (locallyClosed.size === 0) return;

    setOpenListings((prev) => {
      const removed = prev.filter((row) => locallyClosed.has(row.id));
      if (removed.length === 0) return prev;
      setClosedTotal((total) => total + removed.length);
      return prev.filter((row) => !locallyClosed.has(row.id));
    });
  }, []);

  const hasAny = openListings.length > 0 || closedTotal > 0;
  const closedPageCount =
    closedTotal > 0 ? Math.ceil(closedTotal / MAGAM_MY_CLOSED_PAGE_SIZE) : 0;
  const showClosedPager = closedExpanded && closedPageCount > 1;

  const applyClosedPage = useCallback((page: number, listings: MagamListingRow[]) => {
    closedCacheRef.current.set(page, listings);
    setClosedListings(listings);
    setClosedPage(page);
  }, []);

  const loadClosedPage = useCallback(
    async (page: number, opts?: { silent?: boolean }) => {
      const cached = closedCacheRef.current.get(page);
      if (cached) {
        applyClosedPage(page, cached);
        return true;
      }

      if (!opts?.silent) {
        setClosedLoading(true);
        setClosedError(null);
      }

      const result = await getMyMagamClosedListingsPage(page);

      if (!opts?.silent) setClosedLoading(false);

      if (!result.ok) {
        if (!opts?.silent) setClosedError(result.error);
        return false;
      }

      applyClosedPage(result.page, result.listings);
      return true;
    },
    [applyClosedPage]
  );

  useEffect(() => {
    if (closedTotal <= MAGAM_MY_CLOSED_PAGE_SIZE) return;
    if (closedCacheRef.current.has(1)) return;
    void loadClosedPage(1, { silent: true });
  }, [closedTotal, loadClosedPage]);

  const toggleClosed = () => {
    if (closedExpanded) {
      setClosedExpanded(false);
      return;
    }

    setClosedExpanded(true);

    const cached = closedCacheRef.current.get(closedPage);
    if (cached) {
      applyClosedPage(closedPage, cached);
      return;
    }

    void loadClosedPage(closedPage);
  };

  const goClosedPage = (nextPage: number) => {
    if (nextPage < 0 || nextPage >= closedPageCount) return;

    const cached = closedCacheRef.current.get(nextPage);
    if (cached) {
      applyClosedPage(nextPage, cached);
      return;
    }

    setClosedPage(nextPage);
    void loadClosedPage(nextPage);
  };

  const showClosedSkeleton =
    closedExpanded && closedLoading && closedListings.length === 0;

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
                onClick={toggleClosed}
                aria-expanded={closedExpanded}
                className={cn(
                  magamTapClass,
                  "flex w-full items-center gap-2 rounded-[14px] border border-[#E3E6EC] bg-[#F8F9FB] px-3.5 py-3 text-left text-[14px] font-semibold text-[#5B6472] hover:bg-[#F2F3F6] active:bg-[#E8EAED]"
                )}
              >
                <span className="text-[#8B93A1]" aria-hidden>
                  {closedExpanded ? "▼" : "▶"}
                </span>
                {magamMyClosedSectionToggleLabel(closedTotal, closedExpanded)}
              </button>

              {closedExpanded ? (
                <div className="mt-2.5">
                  {closedError ? (
                    <p className="py-4 text-center text-[13px] text-[#DC2626]">{closedError}</p>
                  ) : showClosedSkeleton ? (
                    <p className="py-6 text-center text-[13px] text-[#8B93A1]">{MAGAM_MY_CLOSED_LOADING}</p>
                  ) : (
                    <ul
                      className={cn(
                        "space-y-2.5",
                        closedLoading && closedListings.length > 0 && "opacity-60"
                      )}
                    >
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
                        onClick={() => goClosedPage(closedPage - 1)}
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
                        onClick={() => goClosedPage(closedPage + 1)}
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
