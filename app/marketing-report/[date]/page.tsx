import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Lightbulb, Megaphone, PenLine, Search, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import {
  MARKETING_SUGGESTED_TITLE_DISPLAY_CAP,
  type DailyReportPayload,
  type GroupTrendRow,
} from "@/lib/naver/trend-report";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";
import GuestPreviewGate from "@/components/auth/GuestPreviewGate";
import ReportNextStep from "@/components/report/ReportNextStep";
import ReportTeamShareButton from "@/components/report/ReportTeamShareButton";
import { marketingTopRisingGroupName } from "@/lib/news/parseReportCardHero";
import { MARKETING_TEAM_SHARE_TEXT } from "@/lib/report/team-share-messages";

export const dynamic = "force-dynamic";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const cardClass =
  "rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm ring-1 ring-slate-100/80 sm:p-7";
const insightClass =
  "rounded-3xl border border-indigo-200/80 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/50 p-6 shadow-md ring-1 ring-indigo-100/60 sm:p-7";

function rankBadgeClass(i: number): string {
  if (i === 0) return "bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25";
  if (i === 1) return "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-md shadow-indigo-500/20";
  return "bg-gradient-to-br from-slate-500 to-slate-600 text-white shadow-sm";
}

function SectionHeader({
  icon: Icon,
  kicker,
  title,
  description,
  iconBg,
}: {
  icon: typeof Search;
  kicker: string;
  title: string;
  description?: ReactNode;
  iconBg: string;
}) {
  return (
    <div className="flex flex-wrap items-start gap-4">
      <div
        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg ${iconBg}`}
      >
        <Icon className="h-6 w-6" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{kicker}</p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-slate-600">{description}</p> : null}
      </div>
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isYmd(date)) return { title: "마케팅 리포트" };
  return {
    title: `청소 키워드 트렌드 ${date} | 마케팅 리포트`,
    description: "네이버 데이터랩 통합검색 검색어 트렌드 기준 키워드 인사이트",
  };
}

export default async function MarketingReportDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isYmd(date)) notFound();

  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const { data: profile } = user
    ? await authSupabase.from("profiles").select("role").eq("id", user.id).single()
    : { data: null };
  const isAdmin = profile?.role === "admin" || profile?.role === "editor";

  const supabase = createClient();
  const [{ data: report, error }, { data: recent }, { data: jobWageLatest }] = await Promise.all([
    supabase.from("naver_trend_daily_reports").select("headline, payload, fetch_error").eq("report_date", date).maybeSingle(),
    supabase.from("naver_trend_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(14),
    supabase.from("job_wage_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(1).maybeSingle(),
  ]);

  if (error || !report) notFound();

  const payload = report.payload as unknown as DailyReportPayload | null;
  const hasPayload = payload && "topThree" in payload && Array.isArray(payload.topThree);
  const topKwThis = marketingTopRisingGroupName(report.payload);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-b from-slate-100/80 via-white to-violet-50/40">
      <div
        className="pointer-events-none absolute inset-x-0 -top-24 h-72 bg-gradient-to-b from-indigo-200/25 via-violet-100/20 to-transparent blur-3xl"
        aria-hidden
      />
      <div className="page-shell relative py-10 lg:py-12">
        <div className="lg:text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-indigo-700/90">검색 트렌드 스냅샷</p>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">마케팅 리포트</h1>
          <p className="mx-auto mb-3 max-w-2xl text-lg font-semibold leading-snug text-slate-800">{report.headline}</p>
          <p className="mx-auto mb-6 inline-flex flex-wrap items-center justify-center gap-2 rounded-full bg-slate-100/90 px-4 py-1.5 text-sm text-slate-600 ring-1 ring-slate-200/80">
            <span className="font-medium text-slate-500">네이버 데이터랩</span>
            <span className="hidden text-slate-300 sm:inline" aria-hidden>
              ·
            </span>
            <span className="font-semibold text-slate-800">기준일 KST {date}</span>
          </p>
        </div>

        <NewsCategoryTabs current="marketing" showPrivateTab={isAdmin} />

        <p className="mx-auto mt-4 max-w-3xl text-center text-sm">
          <Link href="/marketing-report" className="font-medium text-indigo-700 hover:underline">
            ← 전체 리포트 목록
          </Link>
        </p>

        {report.fetch_error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900 shadow-sm ring-1 ring-amber-100">
            일부 오류: {report.fetch_error}
          </div>
        )}

        <GuestPreviewGate isLoggedIn={!!user} loginNext={`/marketing-report/${date}`} tone="indigo">
        <div className="mx-auto mt-8 max-w-5xl space-y-6 px-0">
          <section className={insightClass}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/25">
                <Sparkles className="h-6 w-6" aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold text-indigo-950">이 리포트를 이렇게 쓰세요</h2>
                <p className="mt-1 text-sm text-indigo-900/75">상위 키워드와 추천 제목은 그날의 트렌드 스냅샷이에요. 급상승·하락은 캠페인 타이밍을 가늠할 때 참고하세요.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-indigo-100/80">
                <div className="flex items-center gap-2 text-indigo-800">
                  <Megaphone className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="font-bold">마케터</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  <strong className="text-slate-900">1~3위 키워드</strong>로 검색·콘텐츠 키워드를 맞추고,{" "}
                  <strong className="text-slate-900">추천 제목</strong>은 블로그·SNS 초안에 그대로 가져다 써도 됩니다.
                </p>
              </div>
              <div className="rounded-2xl bg-white/80 p-5 ring-1 ring-violet-100/90">
                <div className="flex items-center gap-2 text-violet-900">
                  <PenLine className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="font-bold">콘텐츠</span>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  <strong className="text-slate-900">상승·하락 목록</strong>은 &ldquo;지금 뜨는 말&rdquo;과 &ldquo;잠잠해진 말&rdquo;을 나란히 보며 주제를 고를 때 유용합니다.
                </p>
              </div>
            </div>
          </section>

          {!hasPayload ? (
            <div className={`${cardClass} text-center text-slate-600`}>리포트 데이터가 없습니다.</div>
          ) : (
            <>
              <section className={cardClass}>
                <SectionHeader
                  icon={Search}
                  kicker="핵심 키워드"
                  title="오늘 쓸 만한 키워드 TOP 3"
                  description="통합검색 트렌드에서 그날 가장 주목할 그룹을 골랐습니다."
                  iconBg="bg-gradient-to-br from-violet-600 to-indigo-600 shadow-violet-500/30"
                />
                <ul className="mt-6 grid gap-4 sm:grid-cols-3">
                  {payload.topThree.map((t, i) => (
                    <li
                      key={t.id}
                      className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/90 p-4 shadow-sm ring-1 ring-slate-100/80"
                    >
                      <div
                        className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                          i === 0 ? "from-violet-500 to-indigo-500" : i === 1 ? "from-indigo-400 to-violet-500" : "from-slate-400 to-slate-500"
                        }`}
                        aria-hidden
                      />
                      <div className="flex items-start gap-3 pt-1">
                        <span
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold ${rankBadgeClass(i)}`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-900">{t.groupName}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{t.hint}</p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={cardClass}>
                <SectionHeader
                  icon={Lightbulb}
                  kicker="카피 아이디어"
                  title="추천 제목"
                  description="키워드별로 템플릿에서 뽑은 문장입니다. 실제 발행 전에는 브랜드 톤에 맞게 다듬어 주세요."
                  iconBg="bg-gradient-to-br from-amber-500 to-orange-500 shadow-amber-500/25"
                />
                <ul className="mt-6 space-y-6">
                  {payload.topThree.map((t) => {
                    const titles = (payload.suggestedTitles[t.groupName] ?? []).slice(
                      0,
                      MARKETING_SUGGESTED_TITLE_DISPLAY_CAP
                    );
                    return (
                      <li key={t.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 ring-1 ring-slate-100/80">
                        <p className="text-sm font-bold text-slate-900">{t.groupName}</p>
                        {titles.length === 0 ? (
                          <p className="mt-2 text-xs text-slate-500">
                            템플릿 풀이 비어 있거나 이 그룹에 등록된 템플릿이 없습니다.
                          </p>
                        ) : (
                          <ul className="mt-3 space-y-2">
                            {titles.map((title, idx) => (
                              <li
                                key={`${t.id}-${idx}`}
                                className="flex items-start gap-3 rounded-xl border border-white bg-white px-4 py-3 text-sm text-slate-800 shadow-sm"
                              >
                                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-xs font-bold text-indigo-800">
                                  {idx + 1}
                                </span>
                                <FileText className="mt-1 h-4 w-4 shrink-0 text-indigo-500/80" aria-hidden />
                                <span className="min-w-0 leading-relaxed">{title}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>

              <section className={cardClass}>
                <SectionHeader
                  icon={TrendingUp}
                  kicker="변동 요약"
                  title="급상승 · 급하락"
                  description={
                    <>
                      전일 대비 지표 차이 ±{10} 이상이면 상승/하락으로 분류합니다. 수치는 기간 내 상대 비율입니다. 해당하는 키워드를{" "}
                      <strong className="font-medium text-slate-800">모두</strong> 표시합니다.
                    </>
                  }
                  iconBg="bg-gradient-to-br from-teal-500 to-emerald-600 shadow-teal-500/25"
                />
                <div className="mt-6 grid gap-5 lg:grid-cols-2">
                  <BucketColumn title="상승" items={payload.rising} variant="up" Icon={TrendingUp} />
                  <BucketColumn title="하락" items={payload.falling} variant="down" Icon={TrendingDown} />
                </div>
              </section>

              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/80 px-5 py-4 text-xs leading-relaxed text-slate-600 ring-1 ring-slate-100">
                <p>{payload.disclaimer}</p>
                {payload.window ? (
                  <p className="mt-2 font-medium text-slate-500">
                    조회 구간: {payload.window.startDate} ~ {payload.window.endDate} ({payload.window.timeUnit})
                  </p>
                ) : null}
              </div>
            </>
          )}

          {recent && recent.length > 0 && (
            <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-sm ring-1 ring-slate-100/80 sm:p-7">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">최근 리포트</h2>
              <p className="mt-1 text-xs text-slate-500">날짜를 눌러 다른 날 스냅샷으로 이동합니다.</p>
              <ul className="mt-4 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <li key={r.report_date}>
                    <Link
                      href={`/marketing-report/${r.report_date}`}
                      className={`inline-flex min-h-9 items-center rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all ${
                        r.report_date === date
                          ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-indigo-500/20"
                          : "bg-slate-50 text-slate-700 ring-1 ring-slate-200/90 hover:bg-white hover:ring-indigo-200/80"
                      }`}
                    >
                      {r.report_date}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mx-auto mt-6 max-w-2xl">
            <ReportNextStep
              variant="indigo"
              situation={
                topKwThis
                  ? `「${topKwThis}」 키워드 쪽 검색 관심이 두드러집니다.`
                  : "검색 트렌드를 본 뒤에는, 같은 맥락의 실제 일당을 확인하면 수요와 단가를 함께 볼 수 있습니다."
              }
              actionLabel="이 키워드에 맞는 실제 일당 구간 확인하기"
              href={
                jobWageLatest?.report_date
                  ? `/job-market-report/${jobWageLatest.report_date}`
                  : "/job-market-report"
              }
            />
          </div>

          <div className="mx-auto mt-6 max-w-2xl">
            <ReportTeamShareButton
              kind="marketing"
              reportDate={date}
              shareTitle={`마케팅 리포트 ${date}`}
              shareText={MARKETING_TEAM_SHARE_TEXT}
              loginNextPath={`/marketing-report/${date}`}
              layout="full"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Link
              href="/news?category=report"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl bg-slate-900 px-6 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800"
            >
              입찰 리포트(업계 소식)
            </Link>
            <Link
              href="/job-market-report"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border-2 border-slate-200 bg-white px-6 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/40"
            >
              일당 리포트
            </Link>
            <Link
              href="/jobs"
              className="inline-flex min-h-[44px] items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              인력 구인
            </Link>
          </div>
        </div>
        </GuestPreviewGate>
      </div>
    </div>
  );
}

function BucketColumn({
  title,
  items,
  variant,
  Icon,
}: {
  title: string;
  items: GroupTrendRow[];
  variant: "up" | "down";
  Icon: typeof TrendingUp;
}) {
  const maxAbs = Math.max(1, ...items.map((x) => Math.abs(x.delta)));

  const accent =
    variant === "up"
      ? "border-l-teal-500 bg-gradient-to-r from-teal-50/40 to-white"
      : "border-l-rose-500 bg-gradient-to-r from-rose-50/40 to-white";

  const barFill = variant === "up" ? "bg-teal-500" : "bg-rose-500";
  const deltaClass = variant === "up" ? "text-teal-800" : "text-rose-800";
  const headerTint = variant === "up" ? "bg-teal-50/80 text-teal-900" : "bg-rose-50/80 text-rose-900";

  return (
    <div
      className={`flex max-h-[min(28rem,65vh)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 border-l-[5px] shadow-md ring-1 ring-slate-100/60 ${accent}`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-4 py-3 ${headerTint}`}
      >
        <div className="flex items-center gap-1.5">
          <Icon className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <span className="text-xs font-medium tabular-nums text-slate-600">{items.length}건</span>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
        {items.length === 0 ? (
          <li className="px-3 py-8 text-center text-xs text-slate-500">없음</li>
        ) : (
          items.map((x, idx) => {
            const w = (Math.abs(x.delta) / maxAbs) * 100;
            return (
              <li
                key={`${x.id}-${idx}`}
                className="border-b border-slate-100/90 last:border-b-0 hover:bg-white/70"
              >
                <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:py-2.5">
                  <span className="w-5 shrink-0 text-center text-[11px] font-semibold tabular-nums text-slate-400 sm:w-6">
                    {idx + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm font-medium leading-snug text-slate-900">{x.groupName}</span>
                  <span className={`w-[3.25rem] shrink-0 text-right text-sm font-semibold tabular-nums sm:w-16 ${deltaClass}`}>
                    {x.delta >= 0 ? "+" : ""}
                    {x.delta.toFixed(1)}
                  </span>
                  <div
                    className="hidden h-2 w-14 shrink-0 overflow-hidden rounded-full bg-slate-100 sm:block md:w-20"
                    title={`변동폭 상대 비율 (열 내 최대 대비)`}
                  >
                    <div className={`h-full rounded-full ${barFill} opacity-80`} style={{ width: `${w}%` }} />
                  </div>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
