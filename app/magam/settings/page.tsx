import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMagamSettingsBootstrap } from "@/app/magam/actions";
import MagamSettingsForm from "@/components/magam/MagamSettingsForm";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { createServerSupabase } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "설정" };

export default async function MagamSettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=magam&next=/magam/settings");

  const bootstrap = await getMagamSettingsBootstrap();
  if (!bootstrap) redirect("/login?from=magam&next=/magam/settings");

  return (
    <>
      <MagamPageHeader title="설정" />
      <MagamSettingsForm bootstrap={bootstrap} />
    </>
  );
}
