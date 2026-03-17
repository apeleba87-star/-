import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import { ClipboardList, CalendarCheck, ChevronRight } from "lucide-react";
import { homeDashboardCardClass } from "./home-section-styles";

/**
 * 로그인 사용자 전용: 내 구인·지원 통계. Suspense로 감싸서 홈 첫 렌더를 차단하지 않음.
 */
type Props = { userId: string; todayKst: string };

export default async function HomeUserStatsSection({ userId, todayKst }: Props) {
  const authSupabase = await createServerSupabase();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    jobPostsClosedRes,
    jobPostsOpenRes,
    jobPostsPastWorkDateRes,
    applications30dRes,
    matchesCompleted30dRes,
  ] = await Promise.all([
    authSupabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "closed")
      .gte("updated_at", thirtyDaysAgo),
    authSupabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "open")
      .or(`work_date.gte.${todayKst},work_date.is.null`),
    authSupabase
      .from("job_posts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "open")
      .lt("work_date", todayKst),
    authSupabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", thirtyDaysAgo),
    authSupabase
      .from("job_applications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "accepted")
      .gte("updated_at", thirtyDaysAgo),
  ]);

  const closed30d = jobPostsClosedRes.count ?? 0;
  const openPastWorkDate = jobPostsPastWorkDateRes.count ?? 0;
  const userStats = {
    jobPostsClosed30d: closed30d + openPastWorkDate,
    jobPostsOpen: jobPostsOpenRes.count ?? 0,
    applications30d: applications30dRes.count ?? 0,
    matchesCompleted30d: matchesCompleted30dRes.count ?? 0,
  };

  return (
    <section className="mb-8 grid gap-4 sm:grid-cols-2">
      <Link href="/jobs/manage" className="block h-full">
        <div className={`${homeDashboardCardClass} flex h-full flex-col border-emerald-200 bg-emerald-50/50`}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500 text-white">
              <ClipboardList className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-slate-900">내 구인 현황</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">30일 집계 기준</p>
          <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-700">
            <span>
              구인중 <strong className="text-slate-900">{userStats.jobPostsOpen}</strong>건
            </span>
            <span>
              구인 마감건 <strong className="text-slate-900">{userStats.jobPostsClosed30d}</strong>건
            </span>
          </div>
          <span className="mt-3 inline-flex items-center text-sm font-medium text-emerald-700">
            확인하기
            <ChevronRight className="ml-0.5 h-4 w-4" />
          </span>
        </div>
      </Link>

      <Link href="/jobs" className="block h-full">
        <div className={`${homeDashboardCardClass} flex h-full flex-col border-blue-200 bg-blue-50/50`}>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500 text-white">
              <CalendarCheck className="h-4 w-4" />
            </span>
            <h3 className="font-semibold text-slate-900">내 지원·매칭</h3>
          </div>
          <p className="mt-1 text-xs text-slate-500">30일 집계 기준</p>
          <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm text-slate-700">
            <span>
              <strong className="text-slate-900">{userStats.applications30d}</strong>건 지원 /{" "}
              <strong className="text-slate-900">{userStats.matchesCompleted30d}</strong>건 완료
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-600">
            지원 성공율{" "}
            {userStats.applications30d > 0 ? (
              <strong className="text-slate-900">
                {Math.round((userStats.matchesCompleted30d / userStats.applications30d) * 100)}%
              </strong>
            ) : (
              <span className="text-slate-500">—</span>
            )}
          </p>
          <span className="mt-3 inline-flex items-center text-sm font-medium text-blue-700">
            확인하기
            <ChevronRight className="ml-0.5 h-4 w-4" />
          </span>
        </div>
      </Link>
    </section>
  );
}
