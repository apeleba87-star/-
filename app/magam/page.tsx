import { redirect } from "next/navigation";

/** /magam → 웹앱 진입 */
export default function MagamRootPage() {
  redirect("/magam/app");
}
