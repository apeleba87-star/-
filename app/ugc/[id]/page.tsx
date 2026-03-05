import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 30;

export default async function UgcDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createClient();
  const { data: item, error } = await supabase
    .from("ugc")
    .select("*")
    .eq("id", id)
    .eq("status", "approved")
    .single();

  if (error || !item) notFound();

  const typeLabel: Record<string, string> = {
    field: "현장 공유",
    review: "후기",
    issue: "이슈 제보",
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <Link href="/ugc" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 목록
      </Link>
      <article className="card">
        <span className="rounded bg-slate-100 px-2 py-1 text-sm font-medium text-slate-600">
          {typeLabel[item.type] ?? item.type}
        </span>
        <h1 className="mt-3 text-xl font-bold text-slate-900">
          {item.type === "field" && item.region
            ? `${item.region} · ${item.area_sqm ? `${item.area_sqm}㎡` : ""}`
            : item.type === "review"
              ? `별점 ${item.rating}/5`
              : "이슈 제보"}
        </h1>
        <div className="mt-4 space-y-2 text-sm text-slate-600">
          {item.region && <p><strong>지역:</strong> {item.region}</p>}
          {item.area_sqm != null && <p><strong>면적:</strong> {item.area_sqm}㎡</p>}
          {item.frequency && <p><strong>주기:</strong> {item.frequency}</p>}
          {item.price_per_pyeong != null && (
            <p><strong>평당 단가:</strong> {Number(item.price_per_pyeong).toLocaleString()}원</p>
          )}
          {item.scope && <p><strong>작업 범위:</strong> {item.scope}</p>}
          {item.rating != null && <p><strong>별점:</strong> {item.rating}/5</p>}
        </div>
        {(item.comment || item.issue_text) && (
          <div className="mt-4 rounded-lg bg-slate-50 p-4">
            <p className="whitespace-pre-wrap text-slate-700">
              {item.comment || item.issue_text}
            </p>
          </div>
        )}
        <time className="mt-4 block text-xs text-slate-400">
          {new Date(item.created_at).toLocaleDateString("ko-KR")}
        </time>
      </article>
    </div>
  );
}
