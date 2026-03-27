/**
 * 입찰 리포트 집계: 동일 KST 일자·주차에 대한 반복 조회를 줄이기 위한 서버 캐시.
 * (로그인 페이지에서도 동일 payload이므로 사용자별 분리 없음)
 */
import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { aggregateDailyTenders, aggregateWeeklyTenders } from "@/lib/content/tender-report-queries";
import { getKstWeekKey } from "@/lib/content/kst-utils";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;

/** 집계 테이블·스냅샷 갱신 주기에 맞춤 (초) */
const DAILY_AGGREGATE_REVALIDATE_SEC = 90;
const WEEKLY_AGGREGATE_REVALIDATE_SEC = 300;

export async function getCachedDailyTenderPayload(reportDateYmd: string) {
  if (!YMD_RE.test(reportDateYmd)) {
    throw new Error(`getCachedDailyTenderPayload: invalid date ${reportDateYmd}`);
  }
  return unstable_cache(
    async () => {
      const supabase = createClient();
      return aggregateDailyTenders(supabase, new Date(`${reportDateYmd}T12:00:00Z`));
    },
    ["tender-aggregate-daily", reportDateYmd],
    { revalidate: DAILY_AGGREGATE_REVALIDATE_SEC }
  )();
}

export async function getCachedWeeklyTenderPayload(anchorDateYmd: string) {
  if (!YMD_RE.test(anchorDateYmd)) {
    throw new Error(`getCachedWeeklyTenderPayload: invalid date ${anchorDateYmd}`);
  }
  const weekKey = getKstWeekKey(new Date(`${anchorDateYmd}T12:00:00Z`));
  return unstable_cache(
    async () => {
      const supabase = createClient();
      return aggregateWeeklyTenders(supabase, new Date(`${anchorDateYmd}T12:00:00Z`));
    },
    ["tender-aggregate-weekly", weekKey],
    { revalidate: WEEKLY_AGGREGATE_REVALIDATE_SEC }
  )();
}
