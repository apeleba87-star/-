import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMagamWriteBootstrap } from "@/app/magam/actions";
import MagamWriteForm from "@/components/magam/MagamWriteForm";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { createServerSupabase } from "@/lib/supabase-server";

export const metadata: Metadata = { title: "글쓰기" };

export default async function MagamWritePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?from=magam&next=/magam/write");

  const bootstrap = await getMagamWriteBootstrap();

  return (
    <>
      <MagamPageHeader title="글쓰기" backHref="/magam/me" />
      <MagamWriteForm bootstrap={bootstrap} />
    </>
  );
}
