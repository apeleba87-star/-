import Link from "next/link";
import { formatMoney, formatDate } from "@/lib/tender-utils";

export type TenderAwardListRow = {
  id: string;
  tender_id: string | null;
  bid_ntce_no: string;
  bid_ntce_ord: string;
  bid_ntce_nm: string | null;
  openg_dt: string | null;
  sucsfbider_nm: string | null;
  sucsfbid_amt: number | string | null;
  presmpt_prce: number | string | null;
  bid_rate_pct: number | string | null;
  competition_summary: string | null;
  rate_band: string | null;
  is_clean_related: boolean;
};

function moneyOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pctOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function rateBandBadge(band: string | null): { label: string; className: string } | null {
  if (!band) return null;
  if (band === "under_85") {
    return { label: "낙찰률 낮음", className: "bg-slate-100 text-slate-800 border-slate-200" };
  }
  if (band === "85_95") {
    return { label: "낙찰률 중간", className: "bg-amber-50 text-amber-900 border-amber-200" };
  }
  if (band === "over_95") {
    return { label: "낙찰률 높음", className: "bg-rose-50 text-rose-900 border-rose-200" };
  }
  return null;
}

export default function TenderAwardListCard({ row }: { row: TenderAwardListRow }) {
  const badge = rateBandBadge(row.rate_band);
  const pct = pctOrNull(row.bid_rate_pct);

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 text-base font-semibold text-slate-900 md:text-lg line-clamp-2">
          {row.bid_ntce_nm ?? "공고명 없음"}
        </h2>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {row.is_clean_related && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-800">
              청소 관련
            </span>
          )}
          {badge && (
            <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>
      </div>
      <p className="mt-1 font-mono text-xs text-slate-500">
        {row.bid_ntce_no}-{row.bid_ntce_ord}
      </p>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-slate-500">개찰일시</dt>
          <dd className="text-slate-800">{row.openg_dt ? formatDate(row.openg_dt, { withTime: true }) : "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">낙찰자</dt>
          <dd className="text-slate-800">{row.sucsfbider_nm ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">낙찰금액</dt>
          <dd className="font-medium text-slate-900">{formatMoney(moneyOrNull(row.sucsfbid_amt))}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-slate-500">예정·추정가</dt>
          <dd className="text-slate-800">{formatMoney(moneyOrNull(row.presmpt_prce))}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs font-medium text-slate-500">낙찰률·경쟁</dt>
          <dd className="text-slate-800">
            {pct != null ? <span className="font-medium">{pct.toFixed(2)}%</span> : <span className="text-slate-500">산출 불가</span>}
            {row.competition_summary ? (
              <span className="text-slate-600"> · {row.competition_summary}</span>
            ) : null}
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-3 border-t border-slate-100 pt-3">
        {row.tender_id ? (
          <Link
            href={`/tenders/${row.tender_id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
          >
            입찰 공고 상세 →
          </Link>
        ) : (
          <span className="text-xs text-slate-500">동일 공고가 목록에 없으면 상세 링크가 표시되지 않습니다.</span>
        )}
      </div>
    </article>
  );
}
