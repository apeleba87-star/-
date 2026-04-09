import Link from "next/link";
import { ArrowRight, ListTree } from "lucide-react";
import type { SimilarTenderBrief, SimilarTendersMode } from "@/lib/tenders/similar-tenders-for-detail";
import { buildTendersSearchParams } from "@/lib/tenders/user-focus";
import { formatMoneyMan, shortRegion, ddayNumber } from "@/lib/tender-utils";

function ddayBadge(days: number): { label: string; className: string } {
  if (days < 0) return { label: "마감", className: "bg-slate-100 text-slate-700 border-slate-200" };
  if (days <= 3) return { label: days === 0 ? "D-Day" : `D-${days}`, className: "bg-red-50 text-red-800 border-red-200" };
  if (days <= 7) return { label: `D-${days}`, className: "bg-orange-50 text-orange-800 border-orange-200" };
  return { label: `D-${days}`, className: "bg-blue-50 text-blue-800 border-blue-200" };
}

/** 기관명·사업지역 한 줄 (동일·중복 지역 문자열 제거) */
function formatMetaLine(t: SimilarTenderBrief): string {
  const org = (t.ntce_instt_nm ?? "").trim();
  const dstr = (t.bsns_dstr_nm ?? "").trim();
  if (!org && !dstr) return "—";
  if (dstr && org === dstr) return org;
  if (dstr && org) {
    const rD = shortRegion(dstr);
    const rO = shortRegion(org);
    if (rD === rO) return org;
    return `${org} · ${rD}`;
  }
  if (org) return org;
  return shortRegion(dstr) || "—";
}

export default function SimilarTendersList(props: {
  items: SimilarTenderBrief[];
  mode: SimilarTendersMode;
  industryCodes: string[];
  regionSido: string | null;
  regionGugun: string | null;
}) {
  const { items, mode, industryCodes, regionSido, regionGugun } = props;
  const headerDesc =
    mode === "industry_region"
      ? "같은 업종·지역의 진행 중 공고"
      : mode === "region_only"
        ? "같은 지역의 진행 중 공고 (업종 완화)"
        : mode === "industry_only"
          ? "같은 업종의 진행 중 공고 (지역 완화)"
          : "조건과 무관한 최신 진행 중 공고";
  const ctaLabel =
    mode === "industry_region"
      ? "전체 목록"
      : mode === "region_only"
        ? "지역 전체 보기"
        : mode === "industry_only"
          ? "업종 전체 보기"
          : "최신 공고 전체";
  const fullListHref =
    "/tenders" +
    buildTendersSearchParams({
      industryCodes: mode === "industry_only" || mode === "industry_region" ? industryCodes : [],
      regionSido: mode === "region_only" || mode === "industry_region" ? regionSido : null,
      regionGugun: mode === "region_only" || mode === "industry_region" ? regionGugun : null,
      sort: "posted",
    });

  return (
    <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm md:mt-8">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/80 px-4 py-3.5 md:px-5 md:py-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm">
            <ListTree className="size-5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-bold tracking-tight text-slate-900 md:text-lg">유사 입찰</h2>
            <p className="mt-0.5 text-xs text-slate-500 md:text-sm">{headerDesc}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {items.length > 0 ? (
            <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-sm font-semibold tabular-nums text-slate-700">
              {items.length}건
            </span>
          ) : null}
          <Link
            href={fullListHref}
            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border-2 border-teal-600 bg-white px-3.5 py-2 text-sm font-bold text-teal-700 shadow-sm hover:bg-teal-50"
          >
            {ctaLabel}
            <ArrowRight className="size-4 shrink-0" aria-hidden />
          </Link>
        </div>
      </div>

      <div className="p-3 md:p-4">
        {items.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-8 text-center text-sm leading-relaxed text-slate-600">
            조건에 맞는 진행 중 공고가 없습니다.
            <Link href="/tenders" className="mt-2 inline-block font-semibold text-blue-600 hover:underline">
              입찰 목록으로 이동
            </Link>
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {items.map((t, idx) => {
              const days = ddayNumber(t.bid_clse_dt);
              const badge = ddayBadge(days);
              const meta = formatMetaLine(t);
              return (
                <li key={t.id}>
                  <Link
                    href={`/tenders/${t.id}`}
                    className="group flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-blue-200 hover:shadow-md active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between sm:gap-4 md:p-5"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="mb-1.5 inline-block rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">
                        {idx + 1}
                      </span>
                      <p className="line-clamp-2 text-base font-semibold leading-snug text-slate-900 group-hover:text-blue-700 md:text-lg">
                        {t.bid_ntce_nm ?? "(제목 없음)"}
                      </p>
                      <p className="mt-2 text-sm text-slate-600 md:text-[0.9375rem]">{meta}</p>
                      {t.base_amt != null ? (
                        <p className="mt-1.5 text-base font-bold tabular-nums text-slate-900 md:text-lg">
                          {formatMoneyMan(Number(t.base_amt))}
                          <span className="ml-1.5 text-sm font-medium text-slate-500">기초금액</span>
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`shrink-0 self-start rounded-xl border-2 px-4 py-2 text-sm font-bold sm:self-center ${badge.className}`}
                    >
                      {badge.label}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
