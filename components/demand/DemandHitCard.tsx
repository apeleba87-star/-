import { formatMomPercent } from "@/lib/demand/copy";
import type { DemandHit } from "@/lib/demand/types";
import ScopeBadge from "@/components/demand/ScopeBadge";

export default function DemandHitCard({ hit }: { hit: DemandHit }) {
  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ring-1 ring-slate-100/80">
      <div className="flex flex-wrap items-center gap-2">
        <ScopeBadge scope={hit.scope} />
        {hit.gu ? <span className="text-xs font-semibold text-slate-600">{hit.gu}</span> : null}
        {hit.hit ? (
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
            ✅ 적중
          </span>
        ) : null}
      </div>
      <div className="mt-4 space-y-3 text-sm">
        <div>
          <p className="text-xs font-medium text-slate-500">{hit.leadPeriod}</p>
          <p className="font-semibold text-slate-900">
            {hit.leadLabel}{" "}
            <span className="text-emerald-700">{formatMomPercent(hit.leadMomPercent)}</span>
          </p>
        </div>
        <p className="text-center text-slate-400" aria-hidden>
          ↓
        </p>
        <div>
          <p className="text-xs font-medium text-slate-500">{hit.lagPeriod}</p>
          <p className="font-semibold text-slate-900">
            {hit.lagLabel}{" "}
            <span className="text-emerald-700">{formatMomPercent(hit.lagMomPercent)}</span>
          </p>
        </div>
      </div>
    </article>
  );
}
