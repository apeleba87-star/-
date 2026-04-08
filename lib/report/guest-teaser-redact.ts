/**
 * 비로그인 리포트 티저: 서버에서 민감 필드를 제거·마스킹한 뒤 클라이언트는 락 UI만 표시.
 * (HTML/네트워크 응답에 실제 값이 포함되지 않도록 여기서만 원본을 줄임)
 */

import type { DailyReportPayload, GroupTrendRow } from "@/lib/naver/trend-report";
import type { DailyTenderPayload, TopTenderItem } from "@/lib/content/tender-report-queries";
import type { ReportContentBlock } from "@/lib/content/report-snapshot-types";
import type { JobWageDailyReportPayload, JobWageProvinceRow } from "@/lib/jobs/job-wage-daily-report";
import { provincesFromPayload } from "@/lib/jobs/job-wage-report-display";

/** 지역/업종 건수 잠금 시 UI에서 숫자 대신 락 표시 */
export const GUEST_COUNT_LOCKED = -1 as number;

/** 마케팅 트렌드 행 숫자 잠금 (delta/latest 등) */
export const GUEST_TREND_METRIC_HIDDEN = -999_999 as number;

/** key_metrics 문자열 잠금 플래그 */
export const GUEST_METRIC_LOCKED = "__GUEST_LOCKED__";

/** 일당(원) 잠금 — 음수는 비정상 금액으로 UI에서만 처리 */
export const GUEST_WAGE_LOCKED = -1 as number;

export const GUEST_TEASER_RATIO = 0.2;

export function teaserSliceCount(length: number, ratio = GUEST_TEASER_RATIO): number {
  if (length <= 0) return 0;
  return Math.max(1, Math.ceil(length * ratio));
}

export function isGuestLockedCount(n: number): boolean {
  return n === GUEST_COUNT_LOCKED;
}

export function isGuestLockedWage(n: number): boolean {
  return n === GUEST_WAGE_LOCKED;
}

export function isGuestLockedTrendMetric(n: number): boolean {
  return n === GUEST_TREND_METRIC_HIDDEN;
}

export function isGuestLockedMetricText(s: string | undefined | null): boolean {
  return s === GUEST_METRIC_LOCKED;
}

function lockedTopTender(): TopTenderItem {
  return {
    title: "",
    agency: "",
    budget: GUEST_COUNT_LOCKED,
    budgetLabel: "",
    deadline: "",
    deadlineLabel: "",
  };
}

export function redactDailyTenderPayloadForGuest(src: DailyTenderPayload): DailyTenderPayload {
  const rb = src.region_breakdown;
  const rk = teaserSliceCount(rb.length);
  const region_breakdown = rb.map((r, i) =>
    i < rk ? { ...r } : { name: r.name, count: GUEST_COUNT_LOCKED }
  );

  const ib = src.industry_breakdown;
  const industry_breakdown = ib?.length
    ? ib.map((r, i) => (i < teaserSliceCount(ib.length) ? { ...r } : { ...r, count: GUEST_COUNT_LOCKED }))
    : ib;

  const topn = src.top_budget_tenders;
  const tk = teaserSliceCount(Math.max(topn.length, 1));
  const top_budget_tenders =
    topn.length === 0
      ? []
      : topn.map((t, i) => (i < tk ? { ...t } : lockedTopTender()));

  const ds = src.deadline_soon_tenders;
  const dk = teaserSliceCount(Math.max(ds.length, 1));
  const deadline_soon_tenders =
    ds.length === 0 ? [] : ds.map((t, i) => (i < dk ? { ...t } : lockedTopTender()));

  return {
    ...src,
    budget_total: 0,
    budget_label: "—",
    region_breakdown,
    industry_breakdown,
    top_industry: null,
    top_budget_tenders,
    deadline_soon_tenders,
    has_budget_unknown: false,
    agency_breakdown: [],
    budget_band_breakdown: [],
  };
}

type SnapshotTop3 = NonNullable<ReportContentBlock["top3"]>;
type RegionTop3 = { name: string; count: number };

export type ReportSnapshotGuestContent = ReportContentBlock & {
  region_top3?: RegionTop3[];
  top3?: SnapshotTop3;
};

export function redactGenericReportSnapshotForGuest(content: ReportSnapshotGuestContent): ReportSnapshotGuestContent {
  const km = content.key_metrics;
  const key_metrics = km?.length
    ? km.map((m, i) => (i < teaserSliceCount(km.length) ? m : GUEST_METRIC_LOCKED))
    : km;

  const rt = content.region_top3;
  const region_top3 = rt?.length
    ? rt.map((r, i) => (i < teaserSliceCount(rt.length) ? { ...r } : { name: r.name, count: GUEST_COUNT_LOCKED }))
    : rt;

  const t3 = content.top3 as unknown[] | undefined;
  const top3 =
    t3 && t3.length > 0
      ? (t3.map((row, i) => {
          if (i < teaserSliceCount(t3.length)) return row;
          const o = row && typeof row === "object" ? (row as Record<string, unknown>) : {};
          return { ...o, title: "", agency: "", budget: GUEST_COUNT_LOCKED, budgetLabel: "", deadline: "", deadlineLabel: "" };
        }) as SnapshotTop3)
      : t3;

  return {
    ...content,
    key_metrics,
    region_top3,
    top3,
    practical_note: "",
    next_action: "",
    beneficiary: "",
    comparison: "",
    proportion: "",
  };
}

type AwardIndustryRow = {
  industry_name: string;
  award_count: number;
  avg_award_amt: number | null;
  avg_rate: number | null;
  avg_participants: number | null;
  top_region: string;
};

type AwardRegionRow = {
  region: string;
  award_count: number;
  share_pct: number;
  avg_award_amt: number | null;
};

type AwardTopAward = {
  rank: number;
  bid_ntce_nm: string;
  region: string;
  agency_name: string;
  industry_name: string;
  base_amt: number | null;
  award_amt: number | null;
  bid_rate_pct: number | null;
  participants: number | null;
  openg_dt: string | null;
};

export type AwardMarketSnapshotContent = ReportContentBlock & {
  recommendation?: Record<string, unknown>;
  industry_comparison?: AwardIndustryRow[];
  region_distribution?: AwardRegionRow[];
  top_awards?: AwardTopAward[];
  out_of_scope_summary?: Record<string, unknown>;
};

export function redactAwardMarketSnapshotForGuest(content: AwardMarketSnapshotContent): AwardMarketSnapshotContent {
  const km = content.key_metrics;
  const key_metrics = km?.length
    ? km.map((m, i) => (i < teaserSliceCount(km.length) ? m : GUEST_METRIC_LOCKED))
    : km;

  const ind = content.industry_comparison;
  const industry_comparison = ind?.length
    ? ind.map((r, i) =>
        i < teaserSliceCount(ind.length)
          ? { ...r }
          : {
              ...r,
              award_count: GUEST_COUNT_LOCKED,
              avg_award_amt: null,
              avg_rate: null,
              avg_participants: null,
              top_region: "",
            }
      )
    : ind;

  const reg = content.region_distribution;
  const region_distribution = reg?.length
    ? reg.map((r, i) =>
        i < teaserSliceCount(reg.length)
          ? { ...r }
          : {
              ...r,
              award_count: GUEST_COUNT_LOCKED,
              share_pct: GUEST_COUNT_LOCKED,
              avg_award_amt: null,
            }
      )
    : reg;

  const ta = content.top_awards;
  const top_awards = ta?.length
    ? ta.map((r, i) =>
        i < teaserSliceCount(ta.length)
          ? { ...r }
          : {
              ...r,
              bid_ntce_nm: "",
              region: "",
              agency_name: "",
              industry_name: "",
              base_amt: null,
              award_amt: null,
              bid_rate_pct: null,
              participants: null,
              openg_dt: null,
            }
      )
    : ta;

  return {
    ...content,
    key_metrics,
    recommendation: undefined,
    industry_comparison,
    region_distribution,
    top_awards,
    out_of_scope_summary: undefined,
    practical_note: "",
    next_action: "",
  };
}

function lockTrendRow(r: GroupTrendRow): GroupTrendRow {
  return {
    ...r,
    latest: GUEST_TREND_METRIC_HIDDEN,
    previous: GUEST_TREND_METRIC_HIDDEN,
    delta: GUEST_TREND_METRIC_HIDDEN,
    avg7: null,
  };
}

export function redactMarketingPayloadForGuest(p: DailyReportPayload): DailyReportPayload {
  const topThree = p.topThree.map((t, i) =>
    i === 0 ? { ...t } : { ...t, groupName: "로그인 후 확인", hint: "" }
  );
  const firstName = p.topThree[0]?.groupName;
  const suggestedTitles: Record<string, string[]> = {};
  if (firstName && p.suggestedTitles[firstName]) {
    suggestedTitles[firstName] = p.suggestedTitles[firstName]!.slice(0, 1);
  }

  const tease = (rows: GroupTrendRow[]) => {
    const k = teaserSliceCount(rows.length);
    return rows.map((r, i) => (i < k ? { ...r } : lockTrendRow(r)));
  };

  return {
    ...p,
    topThree,
    suggestedTitles,
    rising: tease(p.rising),
    falling: tease(p.falling),
    groups: tease(p.groups),
    stable: tease(p.stable),
  };
}

export function redactJobWagePayloadForGuest(p: JobWageDailyReportPayload): JobWageDailyReportPayload {
  const provinces = provincesFromPayload(p);
  const k = teaserSliceCount(provinces.length);
  const sorted = [...provinces].sort(
    (a, b) => b.avgDailyWage - a.avgDailyWage || a.province.localeCompare(b.province, "ko")
  );
  const redactedProvinces: JobWageProvinceRow[] = sorted.map((row, i) =>
    i < k ? { ...row } : { province: row.province, avgDailyWage: GUEST_WAGE_LOCKED, jobPostCount: 0 }
  );

  return {
    ...p,
    provinces: redactedProvinces,
    regions: undefined,
    topProvinceByAvgWage: null,
    bottomProvinceByAvgWage: null,
    mapTopProvincesByAvg: [],
    maxDailyWage: null,
    minDailyWage: null,
  };
}

export function guestDailyInsightTeaserLine(payload: DailyTenderPayload): string {
  const n = payload.count_total;
  return `이날 총 공고 ${n.toLocaleString("ko-KR")}건입니다. 로그인하면 지역·예산·마감 등 세부 지표를 모두 볼 수 있습니다.`;
}
