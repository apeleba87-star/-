"use client";



import Link from "next/link";

import { useRouter } from "next/navigation";

import { useState, useTransition } from "react";



import { closeMagamListing } from "@/app/magam/actions";

import MagamCloseListingButton from "@/components/magam/MagamCloseListingButton";
import MagamCloseListingDialog from "@/components/magam/MagamCloseListingDialog";

import MagamListingDisplayRows from "@/components/magam/MagamListingDisplayRows";

import {

  MagamRadarNationalBanner,

  MagamRadarRegionalBanner,

} from "@/components/magam/MagamRadarAdBanner";

import MagamShareBlock from "@/components/magam/MagamShareBlock";
import MagamInAppBrowserBanner from "@/components/magam/MagamInAppBrowserBanner";

import {

  MagamErrorBanner,

  MagamSectionCard,

  MagamStatusBadge,

  MagamSuccessBanner,

  MagamTypeBadge,

  magamOutlineBtnClass,

} from "@/components/magam/ui/MagamUi";

import {

  MAGAM_SHARE_PREVIEW_LABEL,
  MAGAM_STATUS_LABEL,
  MAGAM_CLOSE_SUCCESS_BODY,
  MAGAM_CLOSE_SUCCESS_TITLE,
} from "@/lib/magam/copy";
import { markMagamListingClosedLocally } from "@/lib/magam/listing-close-sync";

import {
  MAGAM_SHARE_FROM_LISTING,
  magamPublicListingHref,
} from "@/lib/magam/back-href";
import { formatKrMobilePhone } from "@/lib/format/kr-mobile-phone";

import { getMagamListingDisplayRows } from "@/lib/magam/format-listing";

import { magamRegionalAdKeysForListing } from "@/lib/magam/region-ad-keys";

import type { MagamListingRow } from "@/lib/magam/types";

type Props = {
  listing: MagamListingRow;
  shareUrl: string;
  isNew?: boolean;
};

export default function MagamOwnerListingPanel({ listing: initialListing, shareUrl, isNew }: Props) {
  const router = useRouter();

  const [listing, setListing] = useState(initialListing);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeJustDone, setCloseJustDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startRefresh] = useTransition();

  const isOpen = listing.status === "open";

  const rows = getMagamListingDisplayRows(listing);

  const regionalKeys = magamRegionalAdKeysForListing(listing);

  const pagePath = `magam:listing/${listing.id}`;



  async function handleCloseConfirm() {
    const snapshot = listing;
    setCloseDialogOpen(false);
    setError(null);
    setCloseJustDone(true);
    setListing((prev) => ({
      ...prev,
      status: "closed",
      closed_at: prev.closed_at ?? new Date().toISOString(),
    }));
    markMagamListingClosedLocally(listing.id);

    const result = await closeMagamListing(listing.id);

    if (!result.ok) {
      setListing(snapshot);
      setCloseJustDone(false);
      setError(result.error);
      return;
    }

    startRefresh(() => {
      router.refresh();
    });
  }



  return (

    <div className="space-y-3">

      {regionalKeys.length > 0 ? (

        <MagamRadarRegionalBanner regionKeys={regionalKeys} pagePath={pagePath} compact />

      ) : null}



      {isNew ? (

        <MagamSuccessBanner

          title="등록 완료!"

          body="내용 확인 후 카톡·카페에 붙여넣으세요."

        />

      ) : null}

      {closeJustDone && !isOpen ? (
        <MagamSuccessBanner
          title={MAGAM_CLOSE_SUCCESS_TITLE}
          body={MAGAM_CLOSE_SUCCESS_BODY}
        />
      ) : null}



      <MagamSectionCard>

        <div className="mb-6 flex items-center gap-2">

          <MagamStatusBadge label={MAGAM_STATUS_LABEL[listing.status]} isOpen={isOpen} />

          <span className="ml-auto">
            <MagamTypeBadge listingType={listing.listing_type} muted={!isOpen} />
          </span>

        </div>

        <MagamListingDisplayRows rows={rows} compact />

        {isOpen && listing.contact_phone ? (

          <div className="mt-4 rounded-[14px] bg-[#F2F3F6] px-3.5 py-3">

            <p className="text-[13px] font-semibold text-[#5B6472]">연락처</p>

            <p className="mt-1 text-[15px] font-semibold text-[#141824]">

              {formatKrMobilePhone(listing.contact_phone)}

            </p>

          </div>

        ) : null}

        {!isOpen ? (

          <p className="mt-4 text-[13px] font-semibold text-[#5B6472]">마감됨 — 연락처 숨김</p>

        ) : null}

      </MagamSectionCard>

      <Link
        href={magamPublicListingHref(listing.share_slug, {
          from: MAGAM_SHARE_FROM_LISTING,
          listingId: listing.id,
        })}
        className={`${magamOutlineBtnClass} block text-center text-[15px]`}
      >
        {MAGAM_SHARE_PREVIEW_LABEL}
      </Link>

      {isOpen ? (
        <Link
          href={`/magam/listing/${listing.id}/edit`}
          className={`${magamOutlineBtnClass} block text-center text-[15px]`}
        >
          수정하기
        </Link>
      ) : null}

      {isOpen ? (

        <MagamCloseListingButton onClick={() => setCloseDialogOpen(true)} />

      ) : null}



      <MagamRadarNationalBanner pagePath={pagePath} />

      <MagamInAppBrowserBanner />

      <MagamShareBlock
        listing={listing}
        shareUrl={shareUrl}
        highlightShare={isNew}
      />



      {isNew ? (

        <Link href="/magam/me" className="block text-center text-sm font-semibold text-[#2563EB]">

          내 공고로 가기

        </Link>

      ) : null}



      {!isOpen && !isNew ? (

        <p className="text-center text-[13px] text-[#5B6472]">

          마감된 공고입니다. 공유 링크에서 연락처가 숨겨집니다.

        </p>

      ) : null}



      {error ? <MagamErrorBanner message={error} /> : null}

      <MagamCloseListingDialog
        open={closeDialogOpen}
        onClose={() => setCloseDialogOpen(false)}
        onConfirm={handleCloseConfirm}
      />
    </div>

  );

}


