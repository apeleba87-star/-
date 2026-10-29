import Link from "next/link";
import { redirect } from "next/navigation";
import DoneList from "@/components/ai-blog/DoneList";
import { getAiBlogUser, loadProfile, loadUsage } from "@/lib/ai-blog/server";
import {
  isMonthKey,
  kstToday,
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

type RowAction = {
  kind: "todo" | "done" | "hold";
  label: string;
  cta: string;
  href: string;
  badge: string;
};

function rowAction(row: Row): RowAction {
  const contents = row.contents.filter((c) => !c.deleted_at);
  const latest = contents[contents.length - 1];
  const pairs = row.media_pairs[0]?.count ?? 0;
  const base = `/ai-blog/projects/${row.id}`;

  if (!latest) {
    if (!pairs) {
      return {
        kind: "todo",
        label: "사진 남음",
        cta: "사진 맞추기 →",
        href: `${base}?tab=photos`,
        badge: "bg-amber-100 text-amber-900",
      };
    }
    return {
      kind: "todo",
      label: "글 쓰기",
      cta: "글 만들기 →",
      href: `${base}?tab=blog`,
      badge: "bg-sky-100 text-sky-900",
    };
  }
  if (latest.status === "DONE") {
    return {
      kind: "done",
      label: "완료",
      cta: "다시 보기",
      href: `/ai-blog/contents/${latest.id}`,
      badge: "bg-emerald-100 text-emerald-900",
    };
  }
  if (latest.status === "READY") {
    return {
      kind: "todo",
      label: "네이버에 올리기",
      cta: "네이버에 올리기 →",
      href: `/ai-blog/contents/${latest.id}?step=transfer`,
      badge: "bg-orange-100 text-orange-900",
    };
  }
  if (latest.status === "ARCHIVED") {
    return {
      kind: "hold",
      label: "보관",
      cta: "다시 보기",
      href: `/ai-blog/contents/${latest.id}`,
      badge: "bg-slate-100 text-slate-600",
    };
  }
  if (!pairs) {
    return {
      kind: "todo",
      label: "사진 남음",
      cta: "사진 맞추기 →",
      href: `${base}?tab=photos`,
      badge: "bg-amber-100 text-amber-900",
    };
  }
  return {
    kind: "todo",
    label: "작성 중",
    cta: "이어서 쓰기 →",
    href: `/ai-blog/contents/${latest.id}`,
    badge: "bg-slate-800 text-white",
  };
}

function projectTitle(r: StatProject) {
  const place = [r.region_sigungu, r.region_dong].filter(Boolean).join(" ");
  const size = [r.property_type, r.area_pyeong ? `${r.area_pyeong}평` : null].filter(Boolean).join(" ");
  return [place, size].filter(Boolean).join(" · ") || "이름 없는 작업";
}

function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${y}년 ${Number(m)}월`;
}

function Kpi({ label, value, sub }: { label: string; value: string; sub?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/80 px-4 py-3.5 shadow-sm backdrop-blur">
      <p className="text-[11px] font-medium tracking-wide text-slate-500">{label}</p>
      <p className="mt-1.5 text-xl font-bold tracking-tight text-slate-900">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
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
  if (!user.companyId) redirect("/ai-blog/profile?welcome=1");
  if (user.roleCode !== "admin") {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        AI 블로그는 업체 대표(관리자) 계정만 사용할 수 있습니다.
      </div>
    );
  }
  if (!(await loadProfile(supabase, user.companyId))) {
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

  const withAction = rows.map((r) => ({ r, action: rowAction(r) }));
  const todos = withAction.filter((x) => x.action.kind === "todo");
  const dones = withAction.filter((x) => x.action.kind !== "todo");

  return (
    <div className="relative -mx-4 space-y-6 px-4 sm:-mx-0 sm:px-0">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-4 h-56 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.12),_transparent_55%),linear-gradient(180deg,#f8fafc_0%,transparent_100%)]"
      />

      <div className="relative flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wide text-emerald-700">AI 블로그</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">내 블로그 글</h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-600">
            작업 등록 → 사진 맞추기 → 네이버에 올리기. 하나씩만 따라가면 됩니다.
          </p>
        </div>
        <Link
          href="/ai-blog/projects/new"
          className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-800 hover:shadow-xl"
        >
          + 새 블로그 쓰기
        </Link>
      </div>

      <section className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-5 py-3.5">
          <h2 className="text-sm font-bold text-slate-900">할 일</h2>
          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
            {todos.length}
          </span>
          {month === thisMonth && remaining != null ? (
            <span className="ml-auto text-xs text-slate-500">이번 달 남은 글 {remaining}편</span>
          ) : null}
        </div>
        {todos.length ? (
          <ul className="divide-y divide-slate-100">
            {todos.map(({ r, action }) => (
              <li key={r.id}>
                <Link
                  href={action.href}
                  className="group flex flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition hover:bg-emerald-50/40"
                >
                  <span className="flex h-10 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-slate-100 text-[11px] font-semibold leading-tight text-slate-600 group-hover:bg-white">
                    {workDay(r).slice(5).replace("-", ".")}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[15px] font-semibold tracking-tight text-slate-900">
                      {projectTitle(r)}
                    </span>
                    <span className="text-xs text-slate-500">{r.service_type}</span>
                  </span>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${action.badge}`}>
                    {action.label}
                  </span>
                  <span className="rounded-xl bg-slate-900 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition group-hover:bg-emerald-700">
                    {action.cta}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="px-5 py-10 text-center text-sm text-slate-600">
            {rows.length
              ? "밀린 할 일이 없습니다. 새 글을 쓰려면 위를 눌러 주세요."
              : "아직 글이 없습니다. 위의 \"새 블로그 쓰기\"로 시작해 보세요."}
          </div>
        )}
      </section>

      <DoneList
        items={dones.map(({ r, action }) => ({
          id: r.id,
          date: workDay(r).slice(5).replace("-", "."),
          title: projectTitle(r),
          service: r.service_type,
          label: action.label,
          cta: action.cta,
          href: action.href,
          badge: action.badge,
        }))}
      />

      {/* 실적: 항상 요약이 보이고, 상세는 펼침 */}
      <section className="relative overflow-hidden rounded-2xl border border-emerald-200/70 bg-gradient-to-br from-emerald-50 via-white to-slate-50 shadow-sm">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-200/30 blur-2xl" aria-hidden />
        <div className="relative px-5 pt-5">
          <div className="flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-emerald-700">매출 · 효율</p>
              <h2 className="mt-0.5 text-lg font-bold tracking-tight text-slate-900">이번 달 실적</h2>
              <p className="mt-1 text-xs text-slate-500">
                시간당 매출 = 금액 ÷ (인원 × 작업시간). 사람 한 명이 한 시간 일할 때 얼마인지입니다.
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white/90 px-1 py-0.5 text-sm shadow-sm">
              <Link
                href={`/ai-blog?m=${prevMonth}`}
                className="rounded-full px-2.5 py-1 text-slate-500 hover:bg-slate-100"
                aria-label="이전 달"
              >
                ◀
              </Link>
              <span className="px-1 font-semibold text-slate-800">{monthLabel(month)}</span>
              {month < thisMonth ? (
                <Link
                  href={`/ai-blog?m=${nextMonth}`}
                  className="rounded-full px-2.5 py-1 text-slate-500 hover:bg-slate-100"
                  aria-label="다음 달"
                >
                  ▶
                </Link>
              ) : (
                <span className="px-2.5 py-1 text-slate-300">▶</span>
              )}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
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
              sub={current.avgPrice != null ? `평균 ${manwon(current.avgPrice)}` : "금액 미입력"}
            />
            <Kpi
              label="시간당 매출"
              value={current.perManHour != null ? won(current.perManHour) : "-"}
              sub={
                current.manHours
                  ? `사람·시간 합산 ${Math.round(current.manHours * 10) / 10}시간 기준`
                  : "인원·작업시간 입력 시 계산"
              }
            />
            <Kpi label="평당 매출" value={current.perPyeong != null ? won(current.perPyeong) : "-"} sub="금액 ÷ 평수" />
            <Kpi
              label="블로그 완료"
              value={`${doneCount ?? 0}편`}
              sub={month === thisMonth ? `남은 ${remaining ?? "-"}편 · 작성 중 ${drafting}` : `작성 중 ${drafting}`}
            />
          </div>
        </div>

        <div className="relative mt-4 space-y-4 border-t border-emerald-100/80 px-5 pb-5 pt-4">
          <h3 className="text-sm font-bold text-slate-900">서비스별 · 효율</h3>
          {current.missing ? (
            <div className="rounded-xl border border-amber-200/80 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              {monthLabel(month)} 작업 중 {current.missing}건은 금액·인원·작업시간 중 빠진 값이 있어 효율 계산에서
              빠졌습니다.
            </div>
          ) : null}

          {current.count ? (
            <div className="grid gap-3 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">서비스별 매출</h4>
                {current.byService.length ? (
                  <ul className="space-y-2.5">
                    {current.byService.map((s) => (
                      <li key={s.service} className="text-sm">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="flex-1 text-slate-800">{s.service}</span>
                          <span className="text-xs text-slate-500">{s.count}건</span>
                          <span className="w-20 text-right font-semibold text-slate-900">{manwon(s.revenue)}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${topService ? (s.revenue / topService) * 100 : 0}%` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-500">금액이 입력된 작업이 없습니다.</p>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4">
                <h4 className="mb-3 text-sm font-semibold text-slate-900">시간당 매출이 높은·낮은 작업</h4>
                {current.best.length ? (
                  <div className="space-y-3">
                    <EfficiencyList title="시간당 매출 높은 작업" rows={current.best} />
                    {current.worst.length ? (
                      <EfficiencyList title="시간당 매출 낮은 작업" rows={current.worst} />
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">금액·인원·작업시간이 모두 입력된 작업이 없습니다.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500">{monthLabel(month)}에 작업한 기록이 없습니다.</p>
          )}
          {month !== thisMonth ? (
            <Link href="/ai-blog" className="inline-block text-xs font-medium text-emerald-800 hover:underline">
              이번 달 실적으로 돌아가기
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
