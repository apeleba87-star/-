import Link from "next/link";

import { MagamPageHeader, magamPrimaryBtnClass } from "@/components/magam/ui/MagamUi";
import {
  MAGAM_APP_HIGHLIGHTS,
  MAGAM_APP_NAME,
  MAGAM_APP_TAGLINE,
} from "@/lib/magam/brand";
import { magamSiteMetadata } from "@/lib/magam/metadata";
import { MAGAM_ME_PATH } from "@/lib/magam/nav-links";

export const metadata = magamSiteMetadata("/magam/intro");

export default function MagamIntroPage() {
  return (
    <>
      <MagamPageHeader title={MAGAM_APP_NAME} iconSrc="/magam/app/icons/Icon-192.png" />
      <div className="mx-auto w-full max-w-lg px-4 pb-10">
        <section className="rounded-2xl border border-[#E4E6EB] bg-white p-6 shadow-sm">
          <p className="text-lg font-bold tracking-[-0.2px] text-[#141824]">{MAGAM_APP_TAGLINE}</p>
          <ul className="mt-4 space-y-2 text-[15px] leading-relaxed text-[#5B6472]">
            {MAGAM_APP_HIGHLIGHTS.map((line) => (
              <li key={line}>· {line}</li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-[#5B6472]">※ 앱스토어 출시 전 · 아래에서 바로 이용하세요.</p>
          <Link
            href={`/login?from=magam&next=${encodeURIComponent(MAGAM_ME_PATH)}`}
            className={`${magamPrimaryBtnClass} mt-6 w-full text-center text-[16px]`}
          >
            {MAGAM_APP_NAME} 시작하기
          </Link>
        </section>
      </div>
    </>
  );
}
