import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getMagamWriteBootstrap } from "@/app/magam/actions";
import MagamWriteForm from "@/components/magam/MagamWriteForm";
import { MagamPageHeader } from "@/components/magam/ui/MagamUi";
import { getMagamSession } from "@/lib/magam/session";

export const metadata: Metadata = { title: "글쓰기" };

export default async function MagamWritePage() {
  const [{ user }, bootstrap] = await Promise.all([
    getMagamSession(),
    getMagamWriteBootstrap(),
  ]);
  if (!user) redirect("/login?from=magam&next=/magam/write");

  return (
    <>
      <MagamPageHeader title="글쓰기" backHref="/magam/me" />
      <MagamWriteForm bootstrap={bootstrap} />
    </>
  );
}
