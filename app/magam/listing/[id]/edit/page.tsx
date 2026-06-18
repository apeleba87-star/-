import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import {
  getMagamListingForOwner,
  getMagamWriteBootstrap,
} from "@/app/magam/actions";
import MagamWriteForm from "@/components/magam/MagamWriteForm";
import { MagamErrorBanner, MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { getMagamSession } from "@/lib/magam/session";

type Props = {
  params: Promise<{ id: string }>;
};

export const metadata: Metadata = { title: "공고 수정" };

export default async function MagamEditListingPage({ params }: Props) {
  const { id } = await params;

  const [{ user }, listing, bootstrap] = await Promise.all([
    getMagamSession(),
    getMagamListingForOwner(id),
    getMagamWriteBootstrap(),
  ]);

  if (!user) redirect(`/login?from=magam&next=/magam/listing/${id}/edit`);
  if (!listing) notFound();

  return (
    <>
      <MagamPageHeader title="공고 수정" backHref={`/magam/listing/${id}`} />
      {listing.status !== "open" ? (
        <MagamErrorBanner message="마감된 공고는 수정할 수 없습니다." />
      ) : (
        <MagamWriteForm bootstrap={bootstrap} initialListing={listing} />
      )}
    </>
  );
}
