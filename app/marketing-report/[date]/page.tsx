import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import type { DailyReportPayload } from "@/lib/naver/trend-report";
import { glassCard } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
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

  const supabase = createClient();
  const [{ data: report, error }, { data: recent }] = await Promise.all([
    supabase.from("naver_trend_daily_reports").select("headline, payload, fetch_error").eq("report_date", date).maybeSingle(),
    supabase.from("naver_trend_daily_reports").select("report_date").order("report_date", { ascending: false }).limit(14),
  ]);

  if (error || !report) notFound();

  const payload = report.payload as unknown as DailyReportPayload | null;
  const hasPayload = payload && "topThree" in payload && Array.isArray(payload.topThree);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:py-10">
      <nav className="mb-6 text-sm text-slate-500">
        <Link href="/news" className="hover:text-slate-800">
          업계 소식
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">마케팅 리포트</span>
      </nav>

      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-wide text-blue-600">네이버 데이터랩 · 통합검색 트렌드</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{report.headline}</h1>
        <p className="mt-2 text-sm text-slate-500">기준일(KST): {date}</p>
        {report.fetch_error && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            일부 오류: {report.fetch_error}
          </p>
        )}
      </header>

      {!hasPayload ? (
        <p className="text-slate-600">리포트 데이터가 없습니다.</p>
      ) : (
        <>
          <section className={`${glassCard} mb-6 p-5 sm:p-6`}>
            <h2 className="text-sm font-semibold text-slate-800">오늘 쓸 만한 키워드</h2>
            <ul className="mt-4 space-y-3">
              {payload.topThree.map((t, i) => (
                <li key={t.id} className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white/70 px-4 py-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
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

          <section className={`${glassCard} mb-6 p-5 sm:p-6`}>
            <h2 className="text-sm font-semibold text-slate-800">추천 블로그 제목 (복붙용)</h2>
            <ul className="mt-3 space-y-4">
              {payload.topThree.map((t) => (
                <li key={t.id}>
                  <p className="text-xs font-medium text-slate-500">{t.groupName}</p>
                  <ul className="mt-1 space-y-1">
                    {(payload.suggestedTitles[t.groupName] ?? []).map((title) => (
                      <li
                        key={title}
                        className="rounded-lg border border-slate-100 bg-slate-50/90 px-3 py-2 text-sm text-slate-800"
                      >
                        {title}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${glassCard} mb-6 p-5 sm:p-6`}>
            <h2 className="text-sm font-semibold text-slate-800">급상승 · 하락 · 횡보</h2>
            <p className="mt-1 text-xs text-slate-500">
              전일 대비 지표 차이 ±{10} 이상이면 상승/하락으로 분류합니다. 수치는 기간 내 상대 비율입니다.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <BucketColumn title="상승" items={payload.rising} tone="text-emerald-700 bg-emerald-50" />
              <BucketColumn title="하락" items={payload.falling} tone="text-rose-700 bg-rose-50" />
              <BucketColumn title="횡보" items={payload.stable} tone="text-slate-700 bg-slate-50" />
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
        <section className="mt-10 border-t border-slate-200 pt-8">
          <h2 className="text-sm font-semibold text-slate-700">최근 리포트</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {recent.map((r) => (
              <li key={r.report_date}>
                <Link
                  href={`/marketing-report/${r.report_date}`}
                  className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                    r.report_date === date ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {r.report_date}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/jobs"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-medium text-white hover:bg-slate-800"
        >
          내 일감 찾기
        </Link>
        <Link
          href="/jobs/new"
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 bg-white px-5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          인력 구하기
        </Link>
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
    <div>
      <h3 className="text-xs font-semibold text-slate-600">{title}</h3>
      <ul className="mt-2 space-y-2">
        {items.length === 0 ? (
          <li className={`rounded-lg px-2 py-2 text-xs ${tone}`}>없음</li>
        ) : (
          items.map((x) => (
            <li key={x.groupName} className={`rounded-lg px-2 py-2 text-xs ${tone}`}>
              <span className="font-medium">{x.groupName}</span>
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
