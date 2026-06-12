"use client";

import Link from "next/link";
import { usePublicJobPayMode } from "@/components/jobs/public/PublicJobPayModeProvider";
import { publicJobRowMeta } from "@/lib/jobs-public/public-job-row-meta";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

type ItemProps = {
  label: string;
  pay: string;
  href: string;
  external?: boolean;
};

function StripItem({ label, pay, href, external }: ItemProps) {
  const className =
    "inline-flex min-h-[40px] flex-col justify-center rounded-lg px-3 py-1.5 text-left hover:bg-white/80 sm:flex-row sm:items-center sm:gap-2";
  const inner = (
    <>
      <span className="text-xs font-semibold text-slate-500 sm:text-sm">{label}</span>
      <span className="text-base font-extrabold text-blue-900 sm:text-lg">{pay}</span>
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} className={className}>
      {inner}
    </Link>
  );
}

export type PublicJobSpotlightStripProps = {
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
  closingSoonCount: number;
  nationalScopeOnly: boolean;
  localPayCompareNote: string | null;
};

export default function PublicJobSpotlightStrip({
  localPay,
  nationalPay,
  closingSoonCount,
  nationalScopeOnly,
  localPayCompareNote,
}: PublicJobSpotlightStripProps) {
  const { payMode } = usePublicJobPayMode();
  const localMeta = localPay ? publicJobRowMeta(localPay, { payMode }) : null;
  const nationalMeta = nationalPay ? publicJobRowMeta(nationalPay, { payMode }) : null;

  const localHref = localMeta?.externalUrl ?? localMeta?.detailHref ?? null;
  const nationalHref = nationalMeta?.externalUrl ?? nationalMeta?.detailHref ?? null;

  return (
    <section
      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 sm:px-4 sm:py-3"
      aria-label={PUBLIC_JOBS_COPY.spotlightStripLabel}
    >
      <div className="flex flex-wrap items-stretch gap-1 divide-slate-200 sm:gap-0 sm:divide-x">
        {!nationalScopeOnly && localMeta && localHref ? (
          <StripItem
            label={PUBLIC_JOBS_COPY.spotlightStripLocalPay}
            pay={localMeta.pay}
            href={localHref}
            external={Boolean(localMeta.externalUrl)}
          />
        ) : null}
        {nationalMeta && nationalHref ? (
          <StripItem
            label={PUBLIC_JOBS_COPY.spotlightStripNationalPay}
            pay={nationalMeta.pay}
            href={nationalHref}
            external={Boolean(nationalMeta.externalUrl)}
          />
        ) : null}
        <Link
          href="?sort=closing"
          className="inline-flex min-h-[40px] flex-col justify-center rounded-lg px-3 py-1.5 hover:bg-white/80 sm:flex-row sm:items-center sm:gap-2"
        >
          <span className="text-xs font-semibold text-slate-500 sm:text-sm">
            {PUBLIC_JOBS_COPY.spotlightStripClosing}
          </span>
          <span className="text-base font-bold text-slate-800 sm:text-lg">
            {closingSoonCount > 0
              ? `${closingSoonCount}${PUBLIC_JOBS_COPY.spotlightStripClosingUnit}`
              : PUBLIC_JOBS_COPY.spotlightStripClosingNone}
          </span>
        </Link>
      </div>
      {localPayCompareNote ? (
        <p className="mt-1.5 px-3 text-xs text-slate-500 sm:text-sm">{localPayCompareNote}</p>
      ) : null}
    </section>
  );
}
