import Link from "next/link";
import type { ReactNode } from "react";

const TONE_CLASS = {
  teal: {
    section:
      "border-teal-200 bg-gradient-to-br from-teal-50/80 to-white ring-teal-100",
    kicker: "text-teal-700",
    cta: "bg-teal-700 hover:bg-teal-800",
    stat: "border-teal-200/80 text-teal-800",
  },
  indigo: {
    section:
      "border-indigo-200 bg-gradient-to-br from-indigo-50/80 to-white ring-indigo-100",
    kicker: "text-indigo-700",
    cta: "bg-indigo-700 hover:bg-indigo-800",
    stat: "border-indigo-200/80 text-indigo-800",
  },
  emerald: {
    section:
      "border-emerald-200 bg-gradient-to-br from-emerald-50/80 to-white ring-emerald-100",
    kicker: "text-emerald-700",
    cta: "bg-emerald-700 hover:bg-emerald-800",
    stat: "border-emerald-200/80 text-emerald-800",
  },
} as const;

type Props = {
  tone: keyof typeof TONE_CLASS;
  kicker: string;
  headline: string;
  detail: string;
  href: string;
  cta: string;
  ariaLabel: string;
  stat?: ReactNode;
  compact?: boolean;
};

export default function RegionHubBridgeCard({
  tone,
  kicker,
  headline,
  detail,
  href,
  cta,
  ariaLabel,
  stat,
  compact = false,
}: Props) {
  const classes = TONE_CLASS[tone];

  if (compact) {
    return (
      <Link
        href={href}
        aria-label={ariaLabel}
        className={`group flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm transition hover:shadow-sm ${classes.section}`}
      >
        <span
          className={`shrink-0 pt-0.5 text-[11px] font-semibold uppercase tracking-wide ${classes.kicker}`}
        >
          {kicker}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium leading-snug text-slate-800">{headline}</span>
          {detail ? (
            <span className="mt-0.5 block text-xs leading-snug text-slate-500">{detail}</span>
          ) : null}
        </span>
        <span className={`shrink-0 self-center text-xs font-semibold ${classes.kicker}`}>
          {cta} →
        </span>
      </Link>
    );
  }

  return (
    <section
      className={`overflow-hidden rounded-2xl border-2 p-4 shadow-sm ring-1 ${classes.section}`}
      aria-label={ariaLabel}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={`text-[11px] font-semibold uppercase tracking-wide ${classes.kicker}`}>{kicker}</p>
          <h2 className="mt-1 text-base font-bold leading-snug text-slate-900">{headline}</h2>
          <p className="mt-1.5 text-sm text-slate-600">{detail}</p>
          {stat ? (
            <div className={`mt-3 rounded-lg border bg-white/90 px-3 py-2 ${classes.stat}`}>{stat}</div>
          ) : null}
        </div>
        <Link
          href={href}
          className={`inline-flex shrink-0 items-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition ${classes.cta}`}
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}
