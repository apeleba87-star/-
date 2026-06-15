import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MagamOpenListings from "@/components/magam/MagamOpenListings";
import MagamPosterCta from "@/components/magam/MagamPosterCta";
import {
  MagamRadarNationalBanner,
  MagamRadarRegionalBanner,
} from "@/components/magam/MagamRadarAdBanner";
import MagamShareCard from "@/components/magam/MagamShareCard";
import {
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_OTHER_OPEN_LISTINGS_LIMIT,
  MAGAM_OTHER_OPEN_LISTINGS_TITLE,
  MAGAM_SHARE_LINK_CTA,
  MAGAM_SHARE_PAGE_TITLE,
} from "@/lib/magam/copy";
import { getMagamListingBySlug, getMagamOpenListings } from "@/lib/magam/queries";
import { magamRegionalAdKeysForListing } from "@/lib/magam/region-ad-keys";

export const revalidate = 30;

type Props = {
  params: Promise<{ slug: string }>;
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

export default async function MagamSharePage({ params }: Props) {
  const { slug } = await params;
  const listing = await getMagamListingBySlug(slug);
  if (!listing) notFound();

  const openListings = await getMagamOpenListings({
    excludeSlug: slug,
    limit: MAGAM_OTHER_OPEN_LISTINGS_LIMIT,
  });

  const regionalKeys = magamRegionalAdKeysForListing(listing);
  const pagePath = `magam:share/${slug}`;

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:py-8">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{MAGAM_SHARE_PAGE_TITLE}</p>
      </header>

      <MagamShareCard listing={listing} highlight />

      {regionalKeys.length > 0 ? (
        <MagamRadarRegionalBanner
          regionKeys={regionalKeys}
          pagePath={pagePath}
          className="mt-6"
        />
      ) : null}

      <MagamOpenListings listings={openListings} title={MAGAM_OTHER_OPEN_LISTINGS_TITLE} />

      <MagamPosterCta />

      <MagamRadarNationalBanner pagePath={pagePath} className="mt-6" />
    </div>
  );
}
