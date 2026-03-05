import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 60;

export default async function IssuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: issue, error } = await supabase
    .from("newsletter_issues")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !issue) notFound();

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/archive" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 아카이브
      </Link>
      <article className="card">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-bold text-slate-900">{issue.subject}</h1>
          <time className="mt-2 block text-sm text-slate-500">
            {issue.sent_at
              ? new Date(issue.sent_at).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : "—"}
          </time>
        </header>
        {issue.summary && (
          <p className="mt-4 text-slate-600">{issue.summary}</p>
        )}
        {issue.body_html && (
          <div
            className="prose prose-slate mt-6 max-w-none"
            dangerouslySetInnerHTML={{ __html: issue.body_html }}
          />
        )}
        {!issue.body_html && !issue.summary && (
          <p className="mt-4 text-slate-500">본문이 없습니다.</p>
        )}
      </article>
    </div>
  );
}
