import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MagamOpenListings from "@/components/magam/MagamOpenListings";
import MagamPosterCta from "@/components/magam/MagamPosterCta";
import {
  MagamRadarNationalBanner,
  MagamRadarRegionalBanner,
} from "@/components/magam/MagamRadarAdBanner";
import MagamShareCard from "@/components/magam/MagamShareCard";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import {
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_OTHER_OPEN_LISTINGS_LIMIT,
  MAGAM_OTHER_OPEN_LISTINGS_TITLE,
  MAGAM_SHARE_LINK_CTA,
  MAGAM_SHARE_PAGE_TITLE,
} from "@/lib/magam/copy";
import { magamShareBackHref } from "@/lib/magam/back-href";
import { getMagamListingBySlug, getMagamOpenListings } from "@/lib/magam/queries";
import { magamRegionalAdKeysForListing } from "@/lib/magam/region-ad-keys";

export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string; listingId?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const listing = await getMagamListingBySlug(slug);
  if (!listing) {
    return { title: "글을 찾을 수 없습니다" };
  }
  const typeLabel = MAGAM_LISTING_TYPE_LABEL[listing.listing_type];
  const preview = listing.body_text.replace(/\s+/g, " ").trim().slice(0, 80);
  const ogTitle =
    listing.status === "open"
      ? `${MAGAM_SHARE_LINK_CTA} · ${listing.region_gu}`
      : `모집 마감 · ${listing.region_gu}`;
  return {
    title: { absolute: `${typeLabel} · ${listing.region_gu}` },
    description: preview,
    openGraph: {
      title: ogTitle,
      description: preview,
      siteName: MAGAM_SHARE_PAGE_TITLE,
    },
  };
}

export default async function MagamSharePage({ params, searchParams }: Props) {
  const { slug } = await params;
  const { from, listingId } = await searchParams;
  const listing = await getMagamListingBySlug(slug);
  if (!listing) notFound();

  const openListings = await getMagamOpenListings({
    excludeSlug: slug,
    limit: MAGAM_OTHER_OPEN_LISTINGS_LIMIT,
  });

  const regionalKeys = magamRegionalAdKeysForListing(listing);
  const pagePath = `magam:share/${slug}`;
  const backHref = magamShareBackHref(from, listingId);
  const shareFrom = from?.trim() || "live";

  return (
    <div className="min-h-[100dvh] bg-[#F2F3F6] text-[#141824] antialiased">
      <div className="mx-auto w-full max-w-lg px-4 pt-3 pb-8">
        <MagamPageHeader title={MAGAM_SHARE_PAGE_TITLE} backHref={backHref} />

        <MagamShareCard listing={listing} highlight />

        {regionalKeys.length > 0 ? (
          <MagamRadarRegionalBanner
            regionKeys={regionalKeys}
            pagePath={pagePath}
            className="mt-6"
          />
        ) : null}

        <MagamOpenListings
          listings={openListings}
          title={MAGAM_OTHER_OPEN_LISTINGS_TITLE}
          shareFrom={shareFrom}
        />

        <MagamPosterCta />

        <MagamRadarNationalBanner pagePath={pagePath} className="mt-6" />
      </div>
    </div>
  );
}
