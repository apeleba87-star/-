import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { MARKETING_SUGGESTED_TITLE_DISPLAY_CAP, type DailyReportPayload } from "@/lib/naver/trend-report";
import NewsCategoryTabs from "@/components/news/NewsCategoryTabs";

export const dynamic = "force-dynamic";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

const cardClass = "rounded-2xl border border-slate-200/80 bg-white/80 p-5 shadow-sm sm:p-6";

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
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">네이버 데이터랩 · 통합검색 트렌드</p>
          <h1 className="mt-2 bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
            마케팅 리포트
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">{report.headline}</p>
          <p className="mt-1 text-xs text-slate-500">기준일(KST): {date}</p>
        </div>

        <div className="mt-6">
          <NewsCategoryTabs current="marketing" showPrivateTab={isAdmin} />
        </div>

        <p className="mx-auto mt-4 max-w-3xl text-center text-sm">
          <Link href="/marketing-report" className="font-medium text-teal-700 hover:underline">
            ← 전체 리포트 목록
          </Link>
        </p>

        {report.fetch_error && (
          <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-900">
            일부 오류: {report.fetch_error}
          </div>
        )}

        <div className="mx-auto mt-8 max-w-3xl">
          {!hasPayload ? (
            <div className={`${cardClass} text-center text-slate-600`}>리포트 데이터가 없습니다.</div>
          ) : (
            <>
              <section className={`${cardClass} mb-6`}>
                <h2 className="text-base font-semibold text-slate-800">오늘 쓸 만한 키워드</h2>
                <ul className="mt-4 space-y-3">
                  {payload.topThree.map((t, i) => (
                    <li
                      key={t.id}
                      className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-sm font-bold text-white shadow-sm">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-semibold text-slate-900">{t.groupName}</p>
                        <p className="text-xs text-slate-500">{t.hint}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section className={`${cardClass} mb-6`}>
                <h2 className="text-base font-semibold text-slate-800">파생 아이디어 · 블로그 제목 (복붙용)</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600">
                  {payload.titleIdeasNote ??
                    "선정된 키워드에 대해 관리자가 등록한 템플릿·서브·크기로 기준일마다 순환 배정한 목록입니다. {지역}은 실제 지명으로 바꿔 쓰세요."}
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
                                className="rounded-xl border border-slate-200/80 bg-slate-50/90 px-3 py-2.5 text-sm text-slate-800"
                              >
                                {title}
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
                <h2 className="text-base font-semibold text-slate-800">급상승 · 하락</h2>
                <p className="mt-1 text-xs text-slate-500">
                  전일 대비 지표 차이 ±{10} 이상이면 상승/하락으로 분류합니다. 수치는 기간 내 상대 비율입니다.
                </p>
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <BucketColumn title="상승" items={payload.rising} tone="text-emerald-800 bg-emerald-50/90 ring-emerald-100" />
                  <BucketColumn title="하락" items={payload.falling} tone="text-rose-800 bg-rose-50/90 ring-rose-100" />
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
                      className={`inline-block rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        r.report_date === date
                          ? "bg-gradient-to-r from-teal-500 to-emerald-600 text-white shadow-md"
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
  tone,
}: {
  title: string;
  items: { groupName: string; delta: number; latest: number }[];
  tone: string;
}) {
  return (
    <div className={`rounded-xl p-4 ring-1 ${tone}`}>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-600">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.length === 0 ? (
          <li className="rounded-lg px-2 py-2 text-xs text-slate-500">없음</li>
        ) : (
          items.map((x) => (
            <li key={x.groupName} className="rounded-lg bg-white/70 px-2 py-2 text-xs shadow-sm">
              <span className="font-medium text-slate-900">{x.groupName}</span>
              <span className="ml-1 text-slate-600">
                (Δ{x.delta >= 0 ? "+" : ""}
                {x.delta.toFixed(1)})
              </span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
