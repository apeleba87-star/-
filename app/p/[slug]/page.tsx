import type { Metadata } from "next";
import { notFound } from "next/navigation";
import MagamOpenListings from "@/components/magam/MagamOpenListings";
import MagamShareCard from "@/components/magam/MagamShareCard";
import { MAGAM_SHARE_PAGE_TITLE, MAGAM_SHARE_LINK_CTA } from "@/lib/magam/copy";
import { getMagamListingBySlug, getMagamOpenListings } from "@/lib/magam/queries";
import { MAGAM_LISTING_TYPE_LABEL } from "@/lib/magam/copy";

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
    regionGu: listing.region_gu,
    listingType: listing.listing_type,
    excludeSlug: slug,
    limit: 12,
  });

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-6 sm:py-8">
      <header className="mb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{MAGAM_SHARE_PAGE_TITLE}</p>
      </header>

      <MagamShareCard listing={listing} highlight />

      <MagamOpenListings
        listings={openListings}
        title={`${listing.region_gu} · ${MAGAM_LISTING_TYPE_LABEL[listing.listing_type]} 모집 중`}
        emptyHint="같은 지역·유형의 다른 모집 글이 없습니다."
      />
    </div>
  );
}
