import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Lightbulb, Search, TrendingDown, TrendingUp } from "lucide-react";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import {
  MARKETING_SUGGESTED_TITLE_DISPLAY_CAP,
  type DailyReportPayload,
  type GroupTrendRow,
} from "@/lib/naver/trend-report";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";

export const dynamic = "force-dynamic";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const cardClass = "rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm sm:p-6";

function rankBadgeClass(i: number): string {
  if (i === 0) return "bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-sm";
  if (i === 1) return "bg-gradient-to-br from-teal-500 to-teal-600 text-white shadow-sm";
  return "bg-slate-500 text-white shadow-sm";
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
  const [{ data: report, error }, { data: recent }] = await Promise.all([
    supabase.from("naver_trend_daily_reports").select("headline, payload, fetch_error").eq("report_date", date).maybeSingle(),
    supabase.from("naver_trend_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(14),
  ]);

  if (error || !report) notFound();

  const payload = report.payload as unknown as DailyReportPayload | null;
  const hasPayload = payload && "topThree" in payload && Array.isArray(payload.topThree);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-teal-50/40">
      <div className="page-shell py-10 lg:py-12">
        <div className="lg:text-center">
          <h1 className="mb-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            마케팅 리포트
          </h1>
          <p className="mx-auto mb-1 max-w-2xl text-sm font-medium text-slate-800">{report.headline}</p>
          <p className="mx-auto mb-6 text-sm text-slate-600">네이버 데이터랩 · 통합검색 트렌드 · 기준일(KST) {date}</p>
        </div>

        <NewsCategoryTabs current="marketing" showPrivateTab={isAdmin} />

        <p className="mx-auto mt-6 max-w-3xl text-center text-sm">
          <Link href="/marketing-report" className="font-medium text-teal-700 hover:underline">
            ← 전체 리포트 목록
          </Link>
        </p>

        {report.fetch_error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
            일부 오류: {report.fetch_error}
          </div>
        )}

        <div className="mx-auto mt-8 max-w-5xl px-0">
          {!hasPayload ? (
            <div className={`${cardClass} text-center text-slate-600`}>리포트 데이터가 없습니다.</div>
          ) : (
            <>
              <section className={`${cardClass} mb-6`}>
                <div className="flex items-center gap-2">
                  <Search className="h-5 w-5 shrink-0 text-teal-600" aria-hidden />
                  <h2 className="text-base font-semibold text-slate-800">오늘 쓸 만한 키워드</h2>
                </div>
                <ul className="mt-4 space-y-3">
                  {payload.topThree.map((t, i) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
                    >
                      <span
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankBadgeClass(i)}`}
                      >
                        {i + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">{t.groupName}</p>
                        <p className="text-xs text-slate-500">{t.hint}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`${cardClass} mb-6`}>
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 shrink-0 text-teal-600" aria-hidden />
                  <h2 className="text-base font-semibold text-slate-800">추천 제목</h2>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  키워드별 추천 제목입니다.
                  <br />
                  참고용으로만 사용하세요.
                </p>
                <ul className="mt-4 space-y-5">
                  {payload.topThree.map((t) => {
                    const titles = (payload.suggestedTitles[t.groupName] ?? []).slice(
                      0,
                      MARKETING_SUGGESTED_TITLE_DISPLAY_CAP
                    );
                    return (
                      <li key={t.id}>
                        <p className="text-sm font-medium text-slate-700">{t.groupName}</p>
                        {titles.length === 0 ? (
                          <p className="mt-1 text-xs text-slate-400">
                            템플릿 풀이 비어 있거나 이 그룹에 등록된 템플릿이 없습니다.
                          </p>
                        ) : (
                          <ul className="mt-2 space-y-2">
                            {titles.map((title, idx) => (
                              <li
                                key={`${t.id}-${idx}`}
                                className="flex items-start gap-2.5 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 text-sm text-slate-800 shadow-sm"
                              >
                                <FileText className="mt-0.5 h-4 w-4 shrink-0 text-teal-600/90" aria-hidden />
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

              <section className={`${cardClass} mb-6`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 shrink-0 text-teal-600" aria-hidden />
                  <h2 className="text-base font-semibold text-slate-800">급상승 · 하락</h2>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  전일 대비 지표 차이 ±{10} 이상이면 상승/하락으로 분류합니다. 수치는 기간 내 상대 비율입니다. 해당하는 키워드를{" "}
                  <strong className="font-medium text-slate-600">모두</strong> 표시합니다.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <BucketColumn title="상승" items={payload.rising} variant="up" Icon={TrendingUp} />
                  <BucketColumn title="하락" items={payload.falling} variant="down" Icon={TrendingDown} />
                </div>
              </section>

              <p className="text-xs leading-relaxed text-slate-500">{payload.disclaimer}</p>
              {payload.window && (
                <p className="mt-2 text-xs text-slate-400">
                  조회 구간: {payload.window.startDate} ~ {payload.window.endDate} ({payload.window.timeUnit})
                </p>
              )}
            </>
          )}

          {recent && recent.length > 0 && (
            <section className="mt-10 border-t border-slate-200/80 pt-8">
              <h2 className="text-sm font-semibold text-slate-700">최근 리포트</h2>
              <ul className="mt-3 flex flex-wrap gap-2">
                {recent.map((r) => (
                  <li key={r.report_date}>
                    <Link
                      href={`/marketing-report/${r.report_date}`}
                      className={`inline-block rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                        r.report_date === date
                          ? "bg-teal-600 text-white shadow-sm"
                          : "bg-white text-slate-700 ring-1 ring-slate-200/80 hover:bg-slate-50"
                      }`}
                    >
                      {r.report_date}
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link
              href="/news?category=report"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
            >
              입찰 리포트(업계 소식)
            </Link>
            <Link
              href="/jobs"
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 hover:bg-slate-50"
            >
              인력 구인
            </Link>
          </div>
        </div>
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
      className={`flex max-h-[min(28rem,65vh)] flex-col overflow-hidden rounded-xl border border-slate-200/90 border-l-4 shadow-sm ${accent}`}
    >
      <div
        className={`flex shrink-0 items-center justify-between gap-2 border-b border-slate-200/80 px-3 py-2.5 ${headerTint}`}
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
