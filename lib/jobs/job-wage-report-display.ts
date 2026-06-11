import { canonicalSidoFromRegion } from "@/lib/listings/regions";
import { addDaysToDateString } from "@/lib/jobs/kst-date";
import { JOB_WAGE_MAP_TOP_PROVINCES, type JobWageDailyReportPayload, type JobWageProvinceRow } from "@/lib/jobs/job-wage-daily-report";

/** 구 스냅샷(regions만 있음) → 시·도 가중 평균으로 변환 */
export function provincesFromPayload(payload: JobWageDailyReportPayload): JobWageProvinceRow[] {
  if (payload.provinces?.length) return payload.provinces;
  const legacy = payload.regions ?? [];
  if (!legacy.length) return [];

  const byP = new Map<string, { sumW: number; posts: number }>();
  for (const r of legacy) {
    const sido = canonicalSidoFromRegion(r.region);
    const agg = byP.get(sido) ?? { sumW: 0, posts: 0 };
    agg.sumW += r.avgDailyWage * r.jobPostCount;
    agg.posts += r.jobPostCount;
    byP.set(sido, agg);
  }

  return [...byP.entries()]
    .map(([province, { sumW, posts }]) => ({
      province,
      avgDailyWage: posts > 0 ? Math.round(sumW / posts) : 0,
      jobPostCount: posts,
    }))
    .sort((a, b) => b.avgDailyWage - a.avgDailyWage || a.province.localeCompare(b.province, "ko"));
}

export function mapTopFromProvinces(provinces: JobWageProvinceRow[]): JobWageProvinceRow[] {
  return provinces.filter((p) => p.jobPostCount > 0).slice(0, JOB_WAGE_MAP_TOP_PROVINCES);
}

export function topProvinceFromProvinces(provinces: JobWageProvinceRow[]): JobWageProvinceRow | null {
  return mapTopFromProvinces(provinces)[0] ?? null;
}

/** 평균 일당이 가장 낮은 시·도(데이터가 2곳 이상일 때만) */
export function bottomProvinceFromProvinces(provinces: JobWageProvinceRow[]): JobWageProvinceRow | null {
  const withData = provinces.filter((p) => p.jobPostCount > 0);
  return withData.length >= 2 ? withData[withData.length - 1]! : null;
}

function isDailyReportPayload(p: unknown): p is JobWageDailyReportPayload {
  if (!p || typeof p !== "object") return false;
  const o = p as JobWageDailyReportPayload;
  return (
    typeof o.methodologyNote === "string" &&
    typeof o.reportDateKst === "string" &&
    (Array.isArray(o.provinces) || Array.isArray(o.regions)) &&
    o.windowDays === 1
  );
}

type PrevReportCandidate = { report_date: string; payload: unknown };

/** 전일(KST) 당일(windowDays=1) 리포트 우선, 없으면 직전 당일 리포트 */
export function pickPrevDailyReportRow(
  candidates: PrevReportCandidate[],
  reportDate: string
): PrevReportCandidate | null {
  const daily = candidates.filter((r) => isDailyReportPayload(r.payload));
  if (!daily.length) return null;

  const prevCalendar = addDaysToDateString(reportDate, -1);
  const exact = daily.find((r) => r.report_date === prevCalendar);
  return exact ?? daily[0] ?? null;
}

export function jobWageProvinceRowId(province: string): string {
  return `job-wage-province-${encodeURIComponent(province)}`;
}

export function resolveHighlightProvince(
  raw: string | undefined,
  provinces: JobWageProvinceRow[]
): string | null {
  if (!raw?.trim()) return null;
  let decoded: string;
  try {
    decoded = decodeURIComponent(raw.trim());
  } catch {
    decoded = raw.trim();
  }
  return provinces.some((p) => p.province === decoded) ? decoded : null;
}
