import { redirect } from "next/navigation";

import { getMagamSession } from "@/lib/magam/session";

/** Flutter 앱 진입 — 로그인 시 내 공고, 미로그인 시 로그인 */
export default async function MagamRootPage() {
  const { user } = await getMagamSession();

  if (user) redirect("/magam/me");
  redirect("/login?from=magam&next=/magam/me");
}
