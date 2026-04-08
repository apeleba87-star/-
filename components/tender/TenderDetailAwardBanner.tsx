import Link from "next/link";
import { formatMoney, formatMoneyMan, formatDate } from "@/lib/tender-utils";
import type { TenderDetailAwardBannerState } from "@/lib/tenders/tender-detail-award";

/** 입찰 공고 `TenderBidSummary` 내부 카드와 동일 톤 */
const bidStyleCard =
  "rounded-2xl border border-slate-200/80 bg-white/60 px-4 py-3 backdrop-blur-sm";

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

function prtcptOrNull(v: unknown): number | null {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 1) return null;
  return Math.floor(n);
}

/** `competition_summary`를 칩용으로 분리 (유효 참여 N개사는 prtcpt_cnum 칩과 중복 제거) */
function competitionExtraPhrases(summary: string | null): string[] {
  const parts = summary?.split(/\s*·\s*/).map((s) => s.trim()).filter(Boolean) ?? [];
  return parts.filter((p) => !/^유효 참여\s*\d/.test(p));
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

/** 요약 문구 없을 때 `rate_band`로 표시용 구간 문장 */
function rateBandSegmentLabel(band: string | null): string | null {
  if (!band) return null;
  if (band === "under_85") return "낙찰률 85% 미만 구간";
  if (band === "85_95") return "낙찰률 85~95% 구간";
  if (band === "over_95") return "낙찰률 95% 초과 구간";
  return null;
}

/** 카드용: 큰 숫자만 (예: 85~95) + 보조 접미사 (%, % 미만 등) */
function bandRangeParts(band: string | null, segmentText: string): { primary: string; suffix: string } | null {
  const raw = segmentText.trim();
  if (raw && raw !== "—") {
    const range = raw.match(/(\d+)\s*~\s*(\d+)/);
    if (range) return { primary: `${range[1]}~${range[2]}`, suffix: "%" };
    const under = raw.match(/(\d+)\s*%\s*미만/);
    if (under) return { primary: under[1], suffix: "% 미만" };
    const over = raw.match(/(\d+)\s*%\s*초과/);
    if (over) return { primary: over[1], suffix: "% 초과" };
  }
  if (band === "85_95") return { primary: "85~95", suffix: "%" };
  if (band === "under_85") return { primary: "85", suffix: "% 미만" };
  if (band === "over_95") return { primary: "95", suffix: "% 초과" };
  return null;
}

export default function TenderDetailAwardBanner({ state }: { state: TenderDetailAwardBannerState }) {
  if (state.kind === "summary") {
    const { row } = state;
    const badge = rateBandBadge(row.rate_band);
    const pct = pctOrNull(row.bid_rate_pct);
    const awardAmt = moneyOrNull(row.sucsfbid_amt);
    const presmptAmt = moneyOrNull(row.presmpt_prce);
    const prtcpt = prtcptOrNull(row.prtcpt_cnum);
    const competitionExtras = competitionExtraPhrases(row.competition_summary);
    const segmentText =
      competitionExtras.length > 0
        ? competitionExtras.join(" · ")
        : rateBandSegmentLabel(row.rate_band) ?? "—";
    const bandRange = bandRangeParts(row.rate_band, segmentText);

    return (
      <section
        className="mb-6 rounded-3xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-teal-50/50 to-emerald-50/80 p-5 shadow-sm sm:p-6"
        aria-label="낙찰·개찰 요약"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">낙찰·개찰 요약</h2>
          {badge ? (
            <span className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm ${badge.className}`}>
              {badge.label}
            </span>
          ) : null}
        </div>

        <div className="my-4 h-px bg-gradient-to-r from-emerald-200 via-teal-200 to-emerald-200" />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={bidStyleCard}>
            <p className="text-xs font-medium text-slate-500">개찰일시</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-800">
              {row.openg_dt ? formatDate(row.openg_dt, { withTime: true }) : "—"}
            </p>
          </div>
          <div className={bidStyleCard}>
            <p className="text-xs font-medium text-slate-500">예정·추정가</p>
            <p className="mt-0.5 text-lg font-semibold text-slate-800">
              {presmptAmt != null ? formatMoneyMan(presmptAmt) : "—"}
            </p>
            {presmptAmt != null ? <p className="text-xs text-slate-500">{formatMoney(presmptAmt)}</p> : null}
          </div>
          <div className="rounded-2xl border-2 border-emerald-700 bg-gradient-to-br from-emerald-600 to-teal-600 px-4 py-3 shadow-lg">
            <p className="text-xs font-medium text-emerald-100">낙찰금액</p>
            <p className="mt-0.5 text-xl font-bold text-white md:text-2xl">
              {awardAmt != null ? formatMoneyMan(awardAmt) : "—"}
            </p>
            {awardAmt != null ? <p className="text-xs text-emerald-100/90">{formatMoney(awardAmt)}</p> : null}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className={bidStyleCard}>
            <p className="text-xs font-medium text-slate-500">낙찰률</p>
            <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight text-emerald-700 md:text-[1.75rem]">
              {pct != null ? `${pct.toFixed(2)}%` : "—"}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-500">
              {pct != null ? "낙찰액 ÷ 예정·추정가" : "산출 불가 시 표시 없음"}
            </p>
          </div>
          <div
            className={`${bidStyleCard} border-teal-200/70 bg-gradient-to-br from-teal-50/50 to-white/70`}
          >
            <p className="text-xs font-medium text-slate-500">참여 업체수</p>
            <p className="mt-0.5 flex flex-wrap items-baseline gap-1 tabular-nums">
              <span className="text-2xl font-bold tracking-tight text-teal-800 md:text-[1.75rem]">
                {prtcpt != null ? prtcpt : "—"}
              </span>
              {prtcpt != null ? (
                <span className="text-base font-bold text-teal-700">개사</span>
              ) : null}
            </p>
            <p className="mt-1 text-[11px] leading-snug text-slate-600">개찰 시 유효 투찰 업체 수</p>
          </div>
          <div
            className={`${bidStyleCard} border-indigo-200/60 bg-gradient-to-br from-indigo-50/40 to-white/70`}
          >
            <p className="text-xs font-medium text-slate-500">낙찰률 구간</p>
            {bandRange ? (
              <p className="mt-0.5 flex flex-wrap items-baseline gap-x-1 gap-y-0 tabular-nums">
                <span className="text-2xl font-bold tracking-tight text-indigo-900 md:text-[1.85rem]">
                  {bandRange.primary}
                </span>
                {bandRange.suffix ? (
                  <span className="text-lg font-bold text-indigo-700 md:text-xl">{bandRange.suffix}</span>
                ) : null}
              </p>
            ) : (
              <p className="mt-0.5 text-2xl font-bold text-slate-300">—</p>
            )}
            <p className="mt-1 text-[11px] leading-snug text-slate-500">예정가 대비 낙찰률 구간</p>
          </div>
        </div>

        <div className={`mt-4 ${bidStyleCard}`}>
          <p className="text-xs font-medium text-slate-500">낙찰자</p>
          <p className="mt-0.5 break-words text-sm font-semibold leading-relaxed text-slate-800">
            {row.sucsfbider_nm ?? "—"}
          </p>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-slate-600">
          수집 시점 API·매칭 결과이며, 원문은 나라장터에서 확인하세요.
        </p>
        <div className="mt-4 border-t border-emerald-200/60 pt-4">
          <Link
            href="/tender-awards"
            className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
          >
            낙찰·개찰 목록 →
          </Link>
        </div>
      </section>
    );
  }

  const tone =
    state.kind === "before_close"
      ? "border-sky-200/60 bg-gradient-to-br from-sky-50 via-sky-50/80 to-sky-100/40 text-sky-950"
      : state.kind === "before_openg"
        ? "border-indigo-200/60 bg-gradient-to-br from-indigo-50 via-indigo-50/50 to-indigo-100/40 text-indigo-950"
        : state.kind === "outcome_hint"
          ? state.outcome === "failed"
            ? "border-amber-200/60 bg-gradient-to-br from-amber-50 via-amber-50/50 to-amber-100/40 text-amber-950"
            : state.outcome === "cancelled"
              ? "border-slate-200/60 bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/60 text-slate-900"
              : "border-violet-200/60 bg-gradient-to-br from-violet-50 via-violet-50/50 to-violet-100/40 text-violet-950"
          : "border-slate-200/60 bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100/50 text-slate-800";

  const title =
    state.kind === "before_close"
      ? "진행 중"
      : state.kind === "before_openg"
        ? "개찰 전"
        : state.kind === "outcome_hint"
          ? state.outcome === "failed"
            ? "낙찰 없음(추정)"
            : state.outcome === "cancelled"
              ? "취소·변경 가능성"
              : "재공고·재입찰 가능성"
          : "낙찰 요약 없음";

  return (
    <section
      className={`mb-6 rounded-3xl border p-5 shadow-sm sm:p-6 ${tone}`}
      aria-label="낙찰·개찰 상태"
    >
      <h2 className="text-xl font-bold tracking-tight text-slate-900 md:text-2xl">{title}</h2>
      <div className="my-4 h-px bg-gradient-to-r from-slate-200/80 via-slate-300/60 to-slate-200/80" />
      <div className={`${bidStyleCard} border-slate-200/70 bg-white/70`}>
        <p className="text-sm leading-relaxed text-slate-700">{state.message}</p>
        {state.kind === "outcome_hint" && state.detail ? (
          <p className="mt-2 text-xs text-slate-500">참고: {state.detail}</p>
        ) : null}
      </div>
      <div className="mt-4 border-t border-slate-200/50 pt-4">
        <Link
          href="/tender-awards"
          className="text-sm font-medium text-blue-600 transition-colors hover:text-blue-800 hover:underline"
        >
          낙찰·개찰 목록에서 유사 건 보기 →
        </Link>
      </div>
    </section>
  );
}
