import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMyMagamListings } from "@/app/magam/actions";
import MagamMyListings from "@/components/magam/MagamMyListings";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";
import { createServerSupabase } from "@/lib/supabase-server";

export const metadata: Metadata = { title: MAGAM_APP_NAME };

export default async function MagamMePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=magam&next=/magam/me");

  const listings = await getMyMagamListings();

  return (
    <>
      <MagamPageHeader title={MAGAM_APP_NAME} iconSrc="/magam/app/icons/Icon-192.png" />
      <MagamMyListings listings={listings} />
    </>
  );
}
