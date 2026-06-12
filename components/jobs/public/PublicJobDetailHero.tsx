import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";

export type PublicJobDetailFact = {
  label: string;
  value: string;
};

type Props = {
  preset: string;
  title: string;
  payDisplay: string;
  salTpNm?: string | null;
  payBadges: string[];
  facts: PublicJobDetailFact[];
  syncedLabel: string;
};

export default function PublicJobDetailHero({
  preset,
  title,
  payDisplay,
  salTpNm,
  payBadges,
  facts,
  syncedLabel,
}: Props) {
  return (
    <header className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-2.5">
        <span className="text-sm font-medium text-slate-600">{preset}</span>
      </div>

      <div className="p-5">
        <h1 className="text-xl font-bold leading-snug text-slate-900 sm:text-2xl">{title}</h1>

        <div className="mt-4">
          <p className="text-3xl font-extrabold tracking-tight text-blue-900 sm:text-4xl">{payDisplay}</p>
          {salTpNm && !payDisplay.includes(salTpNm) ? (
            <p className="mt-1 text-sm text-slate-500">{salTpNm}</p>
          ) : null}
          {payBadges.length > 0 ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {payBadges.map((badge) => (
                <span
                  key={badge}
                  className="inline-flex rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800"
                >
                  {badge}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {facts.length > 0 ? (
          <dl className="mt-5 divide-y divide-slate-100 border-y border-slate-100">
            {facts.map((fact) => (
              <div key={fact.label} className="flex gap-3 py-2.5 text-sm leading-snug">
                <dt className="w-11 shrink-0 font-medium text-slate-500">{fact.label}</dt>
                <dd className="min-w-0 flex-1 font-medium text-slate-900">{fact.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}

        <p className="mt-4 text-xs text-slate-400">
          {PUBLIC_JOBS_COPY.syncedPrefix} · {syncedLabel}
        </p>
      </div>
    </header>
  );
}
