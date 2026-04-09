"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { HOME_CLEAN_INDEX, HOME_REPORT_TEASER } from "@/lib/copy/home-clean-index";

type Props = {
  isLoggedIn: boolean;
  tenderTitle: string;
  amountLine: string;
  regionLine: string;
  ddayLine: string;
  reportListHref?: string;
  /** 기본: 전폭 버튼 · inline: 공고 한 줄용 텍스트형 */
  variant?: "block" | "inline";
};

export default function HomeReportTeaserButton({
  isLoggedIn,
  tenderTitle,
  amountLine,
  regionLine,
  ddayLine,
  reportListHref = "/news?section=report&category=report",
  variant = "block",
}: Props) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const blockClass =
    "flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 px-5 text-[1.0625rem] font-bold text-white shadow-lg shadow-violet-500/25 transition hover:from-blue-500 hover:via-violet-500 hover:to-purple-500 hover:shadow-xl active:scale-[0.99] sm:min-h-[58px] sm:text-lg";
  const inlineClass =
    "shrink-0 inline-flex min-h-[2.25rem] items-center justify-center rounded-xl bg-zinc-900 px-3.5 py-2 text-[0.6875rem] font-semibold text-white shadow-md shadow-zinc-900/15 ring-1 ring-white/10 transition hover:bg-zinc-800 hover:shadow-lg active:scale-[0.98]";

  const modal =
    open ? (
      <div
        className="fixed inset-0 z-[100] flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="home-report-teaser-title"
        onClick={close}
      >
        <div
          className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-slate-200 bg-white shadow-2xl sm:rounded-3xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
            <div>
              <p id="home-report-teaser-title" className="text-base font-semibold text-slate-900">
                {HOME_REPORT_TEASER.title}
              </p>
              <p className="mt-1 text-xs text-slate-500">{HOME_REPORT_TEASER.intro}</p>
            </div>
            <button
              type="button"
              onClick={close}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              aria-label="닫기"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3 px-5 py-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-sm text-slate-800">
              <p className="font-medium text-slate-900 line-clamp-2">{tenderTitle}</p>
              <dl className="mt-2 grid grid-cols-[4.5rem_1fr] gap-x-2 gap-y-1 text-xs text-slate-600">
                <dt className="text-slate-500">금액</dt>
                <dd>{amountLine}</dd>
                <dt className="text-slate-500">지역</dt>
                <dd>{regionLine}</dd>
                <dt className="text-slate-500">마감</dt>
                <dd>{ddayLine}</dd>
              </dl>
            </div>
            <ul className="list-inside list-disc space-y-1.5 text-sm text-slate-700">
              {HOME_REPORT_TEASER.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4">
            <Link
              href={`/login?next=${encodeURIComponent(reportListHref)}`}
              className="flex min-h-[52px] items-center justify-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {HOME_REPORT_TEASER.loginCta}
            </Link>
            <Link
              href={reportListHref}
              onClick={close}
              className="flex min-h-[48px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 hover:border-slate-300 hover:bg-slate-50"
            >
              {HOME_REPORT_TEASER.guestListCta}
            </Link>
          </div>
        </div>
      </div>
    ) : null;

  if (variant === "inline") {
    if (isLoggedIn) {
      return (
        <Link href={reportListHref} className={inlineClass}>
          {HOME_CLEAN_INDEX.reportCta}
        </Link>
      );
    }
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className={inlineClass}>
          {HOME_CLEAN_INDEX.reportCta}
        </button>
        {modal}
      </>
    );
  }

  if (isLoggedIn) {
    return (
      <Link href={reportListHref} className={blockClass}>
        {HOME_CLEAN_INDEX.reportCta}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={blockClass}>
        {HOME_CLEAN_INDEX.reportCta}
      </button>
      {modal}
    </>
  );
}
