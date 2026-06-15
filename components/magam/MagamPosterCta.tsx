import Link from "next/link";

import MagamAppPitch from "@/components/magam/MagamAppPitch";
import MagamReferralCopyButton from "@/components/magam/MagamReferralCopyButton";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";

/** 공고(/p/)를 본 사람 → 올리는 사람 전환 */
export default function MagamPosterCta() {
  return (
    <section
      className="mt-8 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm"
      aria-label="공고 올리기 안내"
    >
      <p className="text-sm font-semibold text-slate-900">{MAGAM_APP_NAME}</p>
      <MagamAppPitch className="mt-1" />
      <div className="mt-4">
        <Link
          href="/magam/write"
          className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          나도 공고 올리기
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        로그인 후 바로 글쓰기 · 앱 설치 없이 웹에서 이용
      </p>
      <div className="mt-3">
        <MagamReferralCopyButton />
      </div>
    </section>
  );
}
