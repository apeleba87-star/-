import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 60;

export default async function ArchivePage() {
  const supabase = createClient();
  const { data: issues } = await supabase
    .from("newsletter_issues")
    .select("id, issue_number, subject, summary, sent_at")
    .not("sent_at", "is", null)
    .order("sent_at", { ascending: false })
    .limit(50);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">뉴스레터 아카이브</h1>
      {!issues || issues.length === 0 ? (
        <div className="card">
          <p className="text-slate-500">발송된 뉴스레터가 없습니다.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {issues.map((issue) => (
            <li key={issue.id}>
              <Link
                href={`/archive/${issue.id}`}
                className="card block hover:border-blue-200"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800">{issue.subject}</span>
                  <span className="text-sm text-slate-500">
                    {issue.sent_at
                      ? new Date(issue.sent_at).toLocaleDateString("ko-KR", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })
                      : "—"}
                  </span>
                </div>
                {issue.summary && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{issue.summary}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
