import Link from "next/link";
import { Users } from "lucide-react";
import { formatMoney } from "@/lib/tender-utils";
import { HOME_CLEAN_INDEX } from "@/lib/copy/home-clean-index";
import type { HomeSpotlightJob } from "@/lib/home/home-spotlight";

type Props = {
  job: HomeSpotlightJob | null;
  isLoggedIn: boolean;
};

export default function HomeJobSpotlight({ job, isLoggedIn }: Props) {
  const annualMan = job ? Math.round(job.annualWon / 10000) : 0;
  const dailyLabel = job ? `일당 ${formatMoney(job.dailyWon)}` : "";

  return (
    <section
      className="mb-8 overflow-hidden rounded-3xl bg-white shadow-[0_8px_30px_-12px_rgba(15,23,42,0.1)] ring-1 ring-emerald-200/60"
      aria-labelledby="home-job-spotlight-title"
    >
      <div className="flex items-center gap-2 border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/90 to-white px-4 py-3 sm:px-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
          <Users className="h-4 w-4" strokeWidth={2} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-emerald-700">
            {HOME_CLEAN_INDEX.jobSectionKicker}
          </p>
          <h2 id="home-job-spotlight-title" className="text-sm font-bold text-slate-900 sm:text-base">
            {HOME_CLEAN_INDEX.jobSectionTitle}
          </h2>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        {job ? (
          <>
            <p className="font-mono text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
              연봉 {annualMan.toLocaleString("ko-KR")}
              <span className="text-lg font-semibold sm:text-xl">만 원</span>
            </p>
            <p className="mt-1 text-[0.7rem] leading-snug text-slate-500">
              {HOME_CLEAN_INDEX.jobFootnoteTemplate(dailyLabel)}
            </p>
            <p className="mt-3 text-sm font-semibold leading-snug text-slate-800 line-clamp-2">{job.title}</p>

            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                <span className="text-slate-500">지역</span>{" "}
                <span className="font-medium text-slate-900">{job.regionLabel}</span>
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                <span className="text-slate-500">형태</span>{" "}
                <span className="font-medium text-slate-900">{job.workFormLabel}</span>
              </span>
            </div>

            <Link
              href={isLoggedIn ? `/jobs/${job.id}` : `/login?next=${encodeURIComponent(`/jobs/${job.id}`)}`}
              className="mt-4 flex min-h-[48px] w-full items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
            >
              {HOME_CLEAN_INDEX.jobCta}
            </Link>
          </>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6 text-center">
            <p className="text-sm text-slate-600">{HOME_CLEAN_INDEX.jobEmptyHint}</p>
          </div>
        )}
        <Link
          href={isLoggedIn ? "/jobs" : "/login?next=%2Fjobs"}
          className="mt-3 block text-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          전체 채용 목록
        </Link>
        <p className="mt-2 text-center text-[0.65rem] text-slate-400">{HOME_CLEAN_INDEX.jobSourceNote}</p>
      </div>
    </section>
  );
}
