import Link from "next/link";
import { redirect } from "next/navigation";
import { getAiBlogUser, loadProfile, loadUsage } from "@/lib/ai-blog/server";
import {
  isMonthKey,
  kstToday,
  manHoursOf,
  manwon,
  monthRangeIso,
  perManHourOf,
  shiftMonth,
  summarize,
  won,
  workDay,
  type StatProject,
} from "@/lib/ai-blog/stats";

export const dynamic = "force-dynamic";

const STAT_COLUMNS =
  "id, service_type, region_sigungu, region_dong, property_type, area_pyeong, worker_count, work_minutes, price, work_date, created_at";

type Row = StatProject & {
  media_pairs: { count: number }[];
  contents: { id: string; status: string; generation_count: number; deleted_at: string | null }[];
};

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "작성 중",
  READY: "옮기기 준비",
  DONE: "옮기기 완료",
  ARCHIVED: "보관",
};

function projectTitle(r: StatProject) {
  const place = [r.region_sigungu, r.region_dong].filter(Boolean).join(" ");
  const size = [r.property_type, r.area_pyeong ? `${r.area_pyeong}평` : null].filter(Boolean).join(" ");
  return [place, size].filter(Boolean).join(" · ") || "이름 없는 현장";
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-slate-900">{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

function EfficiencyList({ title, rows }: { title: string; rows: StatProject[] }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-500">{title}</p>
      <ul className="space-y-1">
        {rows.map((r) => (
          <li key={r.id}>
            <Link
              href={`/ai-blog/projects/${r.id}`}
              className="flex items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-slate-50"
            >
              <span className="min-w-0 flex-1 truncate text-slate-800">
                {projectTitle(r)} <span className="text-xs text-slate-500">{r.service_type}</span>
              </span>
              <span className="text-xs text-slate-500">
                {r.worker_count}명 × {Math.round(((r.work_minutes ?? 0) / 60) * 10) / 10}시간
              </span>
              <span className="w-24 text-right font-medium text-slate-900">{won(perManHourOf(r) ?? 0)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function AiBlogHomePage({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const got = await getAiBlogUser();
  if (!got) redirect("/login?next=/ai-blog");
  const { supabase, user } = got;
  const active = user.access.state === "active";
  if (!user.companyId && active) redirect("/ai-blog/profile?welcome=1");
  if (user.companyId && user.roleCode !== "admin") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        AI 블로그는 업체 대표(관리자) 계정만 사용할 수 있습니다.
      </div>
    );
  }
  if (user.companyId && active && !(await loadProfile(supabase, user.companyId))) {
    redirect("/ai-blog/profile?welcome=1");
  }

  const { m } = await searchParams;
  const thisMonth = kstToday().slice(0, 7);
  const month = isMonthKey(m) && m <= thisMonth ? m : thisMonth;
  const prevMonth = shiftMonth(month, -1);
  const nextMonth = shiftMonth(month, 1);
  const range = monthRangeIso(month);
  const rangeWithPrev = { start: new Date(monthRangeIso(prevMonth).start).toISOString(), end: new Date(range.end).toISOString() };

  const [{ data }, { data: statData }, { count: doneCount }, usage] = await Promise.all([
    supabase
      .schema("cleanidex")
      .from("projects")
      .select(`${STAT_COLUMNS}, media_pairs(count), contents(id, status, generation_count, deleted_at)`)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .schema("cleanidex")
      .from("projects")
      .select(STAT_COLUMNS)
      .is("deleted_at", null)
      .or(
        `and(work_date.gte.${prevMonth}-01,work_date.lt.${nextMonth}-01),and(work_date.is.null,created_at.gte."${rangeWithPrev.start}",created_at.lt."${rangeWithPrev.end}")`,
      )
      .limit(2000),
    supabase
      .schema("cleanidex")
      .from("contents")
      .select("id", { count: "exact", head: true })
      .eq("status", "DONE")
      .is("deleted_at", null)
      .gte("updated_at", new Date(range.start).toISOString())
      .lt("updated_at", new Date(range.end).toISOString()),
    loadUsage(supabase),
  ]);

  const rows = (data ?? []) as unknown as Row[];
  const statRows = (statData ?? []) as StatProject[];
  const current = summarize(statRows.filter((r) => workDay(r).startsWith(month)));
  const previous = summarize(statRows.filter((r) => workDay(r).startsWith(prevMonth)));
  const revenueDelta = previous.revenue ? Math.round(((current.revenue - previous.revenue) / previous.revenue) * 100) : null;
  const remaining = usage ? Math.max(usage.monthly_content_limit - usage.contents_used, 0) : null;
  const drafting = rows.reduce(
    (n, r) => n + r.contents.filter((c) => !c.deleted_at && c.status === "DRAFT").length,
    0,
  );
  const topService = current.byService[0]?.revenue ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href={`/ai-blog?m=${prevMonth}`}
          className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
          aria-label="이전 달"
        >
          ◀
        </Link>
        <h1 className="text-lg font-bold text-slate-900">{monthLabel(month)}</h1>
        {month < thisMonth ? (
          <Link
            href={`/ai-blog?m=${nextMonth}`}
            className="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100"
            aria-label="다음 달"
          >
            ▶
          </Link>
        ) : (
          <span className="px-2 py-1 text-slate-300">▶</span>
        )}
        {month !== thisMonth ? (
          <Link href="/ai-blog" className="text-xs text-slate-500 hover:underline">
            이번 달로
          </Link>
        ) : null}
        <div className="flex-1" />
        <Link
          href="/ai-blog/projects/new"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
        >
          새 현장 등록
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          label="매출"
          value={manwon(current.revenue)}
          sub={
            revenueDelta == null ? (
              "지난달 기록 없음"
            ) : (
              <span className={revenueDelta >= 0 ? "text-emerald-600" : "text-rose-600"}>
                지난달 대비 {revenueDelta >= 0 ? "▲" : "▼"} {Math.abs(revenueDelta)}%
              </span>
            )
          }
        />
        <Kpi
          label="작업 건수"
          value={`${current.count}건`}
          sub={current.avgPrice != null ? `평균 단가 ${manwon(current.avgPrice)}` : "금액 입력 없음"}
        />
        <Kpi
          label="인시당 매출"
          value={current.perManHour != null ? won(current.perManHour) : "-"}
          sub={`총 ${Math.round(current.manHours * 10) / 10}인시 (인원 × 1인 작업시간)`}
        />
        <Kpi
          label="평당 매출"
          value={current.perPyeong != null ? won(current.perPyeong) : "-"}
          sub="금액 ÷ 평수"
        />
        <Kpi
          label="블로그 옮기기 완료"
          value={`${doneCount ?? 0}편`}
          sub={
            month === thisMonth
              ? `남은 작성 ${remaining ?? "-"}편 · 작성 중 ${drafting}건`
              : `작성 중 ${drafting}건`
          }
        />
      </div>

      {current.missing ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {monthLabel(month)} 현장 중 {current.missing}건은 금액·인원·1인 작업시간 중 빠진 값이 있어 효율 계산에서
          빠졌습니다. 현장 정보에서 채우면 더 정확해집니다.
        </div>
      ) : null}

      {current.count ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">서비스별 매출</h2>
            {current.byService.length ? (
              <ul className="space-y-2">
                {current.byService.map((s) => (
                  <li key={s.service} className="text-sm">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="flex-1 text-slate-800">{s.service}</span>
                      <span className="text-xs text-slate-500">{s.count}건</span>
                      <span className="w-20 text-right font-medium text-slate-900">{manwon(s.revenue)}</span>
                      <span className="w-10 text-right text-xs text-slate-500">
                        {Math.round((s.revenue / current.revenue) * 100)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full bg-emerald-500"
                        style={{ width: `${topService ? (s.revenue / topService) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">금액이 입력된 현장이 없습니다.</p>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">인시당 매출 효율</h2>
            {current.best.length ? (
              <div className="space-y-3">
                <EfficiencyList title="효율 좋은 현장" rows={current.best} />
                {current.worst.length ? <EfficiencyList title="효율 낮은 현장" rows={current.worst} /> : null}
              </div>
            ) : (
              <p className="text-sm text-slate-500">금액·인원·1인 작업시간이 모두 입력된 현장이 없습니다.</p>
            )}
          </section>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
          {monthLabel(month)}에 작업한 현장이 없습니다.
        </div>
      )}

      <section className="rounded-xl border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-900">내 현장</h2>
          <span className="text-xs text-slate-500">전체 {rows.length}건</span>
        </div>
        {rows.length ? (
          <ul className="divide-y divide-slate-100">
            {rows.map((r) => {
              const contents = r.contents.filter((c) => !c.deleted_at);
              const latest = contents[contents.length - 1];
              const pairs = r.media_pairs[0]?.count ?? 0;
              const rate = perManHourOf(r);
              const hours = manHoursOf(r);
              return (
                <li key={r.id}>
                  <Link
                    href={`/ai-blog/projects/${r.id}`}
                    className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 hover:bg-slate-50"
                  >
                    <span className="w-14 text-xs text-slate-500">{workDay(r).slice(5).replace("-", ".")}</span>
                    <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">{projectTitle(r)}</span>
                    <span className="text-xs text-slate-600">{r.service_type}</span>
                    <span className="w-24 text-right text-xs text-slate-900">{r.price ? won(r.price) : "금액 없음"}</span>
                    <span
                      className="w-28 text-right text-xs text-slate-600"
                      title={hours ? `${Math.round(hours * 10) / 10}인시` : undefined}
                    >
                      {rate != null ? `인시당 ${manwon(rate)}` : "정보 부족"}
                    </span>
                    <span className="w-20 text-xs text-slate-600">{pairs ? `사진 ${pairs}쌍` : "사진 미정렬"}</span>
                    <span className="w-36 text-xs text-slate-600">
                      {latest
                        ? `${STATUS_LABEL[latest.status] ?? latest.status}${contents.length > 1 ? ` 외 ${contents.length - 1}` : ""}`
                        : "초안 없음"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-4 py-10 text-center text-sm text-slate-600">
            아직 등록된 현장이 없습니다. 오른쪽 위의 &quot;새 현장 등록&quot;으로 시작해 보세요.
          </div>
        )}
      </section>
    </div>
  );
}
