import Link from "next/link";

import MagamReferralCopyButton from "@/components/magam/MagamReferralCopyButton";
import { MAGAM_APP_NAME, MAGAM_APP_TAGLINE } from "@/lib/magam/brand";

/** 공고(/p/)를 본 사람 → 올리는 사람 전환 */
export default function MagamPosterCta() {
  return (
    <section
      className="mt-6 rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-5 shadow-sm"
      aria-label="공고 올리기 안내"
    >
      <p className="text-sm font-semibold text-slate-900">{MAGAM_APP_NAME}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600">{MAGAM_APP_TAGLINE}</p>
      <p className="mt-2 text-sm text-slate-600">
        이런 공고, 링크 하나로 올리고 마감하면 연락처가 숨겨집니다.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Link
          href="/magam/app/"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          나도 공고 올리기
        </Link>
        <Link
          href="/magam/live"
          className="inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
        >
          모집 중 공고 보기
        </Link>
      </div>
      <p className="mt-3 text-xs text-slate-400">
        앱스토어 출시 전 · 로그인 후 바로 글쓰기가 가능합니다.
      </p>
      <div className="mt-3">
        <MagamReferralCopyButton />
      </div>
    </section>
  );
}
