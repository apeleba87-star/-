import Link from "next/link";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { JobSpotlightSnapshot } from "@/lib/jobs-public/queries";

type CardProps = {
  kind: "local" | "pay";
  title: string;
  jobTitle: string | null;
  payDisplay: string | null;
  sub: string | null;
  href: string | null;
  empty: string;
};

function SpotlightCard({ kind, title, jobTitle, payDisplay, sub, href, empty }: CardProps) {
  const icon = kind === "local" ? "📍" : "💰";
  return (
    <article className="flex flex-1 flex-col rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">
        {icon} {title}
      </h2>
      {href && jobTitle ? (
        <>
          <p className="mt-4 text-xl font-bold leading-snug text-slate-900">{jobTitle}</p>
          <p className="mt-2 text-2xl font-extrabold text-blue-900">{payDisplay ?? PUBLIC_JOBS_COPY.payNegotiable}</p>
          {sub ? <p className="mt-2 text-base text-slate-600">{sub}</p> : null}
          <Link
            href={href}
            className="mt-5 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-900 px-4 text-lg font-semibold text-white"
          >
            {PUBLIC_JOBS_COPY.spotlightLocalCta}
          </Link>
        </>
      ) : (
        <p className="mt-4 text-lg text-slate-600">{empty}</p>
      )}
    </article>
  );
}

type Props = {
  snapshot: JobSpotlightSnapshot | null;
};

export default function PublicJobSpotlightSection({ snapshot }: Props) {
  const localHref = snapshot?.local_top_opening_id
    ? `/jobs/public/${encodeURIComponent(snapshot.local_top_opening_id)}`
    : null;
  const payHref = snapshot?.pay_top_opening_id
    ? `/jobs/public/${encodeURIComponent(snapshot.pay_top_opening_id)}`
    : null;

  const localSub = [
    snapshot?.local_top_preset_label,
    snapshot?.local_top_closing_label,
  ]
    .filter(Boolean)
    .join(" · ");

  const paySub = [
    snapshot?.pay_top_region_label,
    snapshot?.pay_delta_display,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className="grid gap-4 md:grid-cols-2"
      aria-label="우리 지역과 급여 최고 공고"
    >
      <SpotlightCard
        kind="local"
        title={PUBLIC_JOBS_COPY.spotlightLocalTitle}
        jobTitle={snapshot?.local_top_title ?? null}
        payDisplay={snapshot?.local_top_pay_display ?? null}
        sub={localSub || null}
        href={localHref}
        empty={PUBLIC_JOBS_COPY.spotlightLocalEmpty}
      />
      <SpotlightCard
        kind="pay"
        title={PUBLIC_JOBS_COPY.spotlightPayTitle}
        jobTitle={snapshot?.pay_top_title ?? null}
        payDisplay={snapshot?.pay_top_pay_display ?? null}
        sub={paySub || null}
        href={payHref}
        empty={PUBLIC_JOBS_COPY.spotlightPayEmpty}
      />
    </section>
  );
}
