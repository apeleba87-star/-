import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMyMagamListings } from "@/app/magam/actions";
import MagamMyListings from "@/components/magam/MagamMyListings";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";
import { getMagamSession } from "@/lib/magam/session";

export const metadata: Metadata = { title: MAGAM_APP_NAME };

export default async function MagamMePage() {
  const { user } = await getMagamSession();
  if (!user) redirect("/login?from=magam&next=/magam/me");

  const { openListings, openHasMore, closedTotal } = await getMyMagamListings();

  return (
    <>
      <MagamPageHeader title={MAGAM_APP_NAME} iconSrc="/magam/app/icons/Icon-192.png" />
      <MagamMyListings
        openListings={openListings}
        openHasMore={openHasMore}
        closedTotal={closedTotal}
      />
    </>
  );
}
