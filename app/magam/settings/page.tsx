import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMagamSettingsBootstrap } from "@/app/magam/actions";
import MagamSettingsForm from "@/components/magam/MagamSettingsForm";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { getMagamSession } from "@/lib/magam/session";

export const metadata: Metadata = { title: "설정" };

export default async function MagamSettingsPage() {
  const [{ user }, bootstrap] = await Promise.all([
    getMagamSession(),
    getMagamSettingsBootstrap(),
  ]);
  if (!user) redirect("/login?from=magam&next=/magam/settings");
  if (!bootstrap) redirect("/login?from=magam&next=/magam/settings");

  return (
    <>
      <MagamPageHeader title="설정" />
      <MagamSettingsForm bootstrap={bootstrap} />
    </>
  );
}
