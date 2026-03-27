import { unstable_cache } from "next/cache";
import { createClient } from "@/lib/supabase-server";
import { getJobsHeadlineDailyWageStats } from "@/lib/jobs/daily-wage-stats";

/** 목록 상단 일당 평균 — 전역 통계라 짧게 캐시해도 됨 */
export function getCachedJobsHeadlineDailyWageStats() {
  return unstable_cache(
    async () => {
      const supabase = createClient();
      return getJobsHeadlineDailyWageStats(supabase);
    },
    ["jobs-headline-daily-wage-v1"],
    { revalidate: 600 }
  )();
}
