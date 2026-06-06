import { permanentRedirect } from "next/navigation";

/** legacy — 입주레이더 허브는 `/` */
export default function DemandHubLegacyRedirect() {
  permanentRedirect("/");
}
