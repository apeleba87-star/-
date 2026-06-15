import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { getMagamListingForOwner } from "@/app/magam/actions";
import MagamOwnerListingPanel from "@/components/magam/MagamOwnerListingPanel";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { createServerSupabase } from "@/lib/supabase-server";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ new?: string }>;
};

function shareBaseUrl(): string {
  return (
    process.env.MAGAM_SHARE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://cleanidex.co.kr"
  ).replace(/\/+$/, "");
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getMagamListingForOwner(id);
  if (!listing) return { title: "모집 안내" };
  return { title: "모집 안내" };
}

export default async function MagamOwnerListingPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { new: isNew } = await searchParams;

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?from=magam&next=/magam/listing/${id}`);

  const listing = await getMagamListingForOwner(id);
  if (!listing) notFound();

  const shareUrl = `${shareBaseUrl()}/p/${listing.share_slug}`;

  return (
    <>
      <MagamPageHeader title="모집 안내" backHref="/magam/me" />
      <MagamOwnerListingPanel listing={listing} shareUrl={shareUrl} isNew={isNew === "1"} />
    </>
  );
}
