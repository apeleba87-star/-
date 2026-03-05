import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import Card from "@/components/Card";

export const revalidate = 60;

export default async function HomePage() {
  const supabase = createClient();

  let tendersToday = 0;
  let recentIssues: { id: string; subject: string; sent_at: string | null }[] = [];
  let postsCount = 0;

  try {
    const today = new Date().toISOString().slice(0, 10);
    const { count: tCount } = await supabase
      .from("tenders")
      .select("*", { count: "exact", head: true })
      .gte("bid_ntce_dt", today)
      .lt("bid_ntce_dt", today + "T23:59:59.999Z");
    tendersToday = tCount ?? 0;

    const { data: issues } = await supabase
      .from("newsletter_issues")
      .select("id, subject, sent_at")
      .not("sent_at", "is", null)
      .order("sent_at", { ascending: false })
      .limit(5);
    recentIssues = issues ?? [];

    const { count: pCount } = await supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .not("published_at", "is", null);
    postsCount = pCount ?? 0;
  } catch {
    // 테이블 미생성 시 무시
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <section className="mb-12 text-center">
        <h1 className="text-3xl font-bold text-slate-900 md:text-4xl">
          청소업 정보, 한곳에서
        </h1>
        <p className="mt-3 text-lg text-slate-600">
          나라장터 데이터 · 현장 후기 · 업계 이슈를 뉴스레터로 받아보세요.
        </p>
      </section>

      <section className="mb-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="오늘 수집 공고" href="/tenders/dashboard">
          <p className="text-2xl font-bold text-blue-600">{tendersToday}건</p>
          <p className="mt-1 text-sm text-slate-500">나라장터 입찰 공고</p>
        </Card>
        <Card title="콘텐츠">
          <p className="text-2xl font-bold text-slate-800">{postsCount}개</p>
          <p className="mt-1 text-sm text-slate-500">약품/장비/이슈 글</p>
        </Card>
        <Card title="뉴스레터" href="/archive">
          <p className="text-slate-600">최근 회차 보기</p>
          <span className="mt-2 inline-block text-sm text-blue-600">아카이브 →</span>
        </Card>
        <Card title="현장·후기" href="/ugc">
          <p className="text-slate-600">실제 현장 단가·후기</p>
          <span className="mt-2 inline-block text-sm text-blue-600">목록 보기 →</span>
        </Card>
      </section>

      <section>
        <h2 className="mb-4 text-xl font-semibold text-slate-800">최근 뉴스레터</h2>
        {recentIssues.length === 0 ? (
          <div className="card">
            <p className="text-slate-500">아직 발송된 뉴스레터가 없습니다.</p>
            <Link href="/archive" className="mt-2 inline-block text-blue-600 hover:underline">
              아카이브 보기
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {recentIssues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={`/archive/${issue.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 transition hover:bg-slate-50"
                >
                  <span className="font-medium text-slate-800">{issue.subject}</span>
                  <span className="text-sm text-slate-500">
                    {issue.sent_at
                      ? new Date(issue.sent_at).toLocaleDateString("ko-KR")
                      : "—"}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
