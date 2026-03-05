import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 30;

export default async function UgcPage() {
  const supabase = createClient();
  const { data: items } = await supabase
    .from("ugc")
    .select("id, type, region, price_per_pyeong, rating, comment, status, created_at")
    .eq("status", "approved")
    .order("created_at", { ascending: false })
    .limit(50);

  const typeLabel: Record<string, string> = {
    field: "현장",
    review: "후기",
    issue: "이슈제보",
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">현장 · 후기</h1>
        <Link href="/ugc/new" className="btn-primary">
          글쓰기
        </Link>
      </div>
      {!items?.length ? (
        <div className="card">
          <p className="text-slate-500">등록된 현장/후기가 없습니다.</p>
          <Link href="/ugc/new" className="mt-3 inline-block text-blue-600 hover:underline">
            첫 글 쓰기 →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <Link href={`/ugc/${item.id}`} className="card block hover:border-blue-200">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                    {typeLabel[item.type] ?? item.type}
                  </span>
                  {item.region && (
                    <span className="text-sm text-slate-600">{item.region}</span>
                  )}
                  {item.price_per_pyeong != null && (
                    <span className="text-sm font-medium text-slate-800">
                      평당 {Number(item.price_per_pyeong).toLocaleString()}원
                    </span>
                  )}
                  {item.rating != null && (
                    <span className="text-sm text-amber-600">★ {item.rating}</span>
                  )}
                </div>
                {item.comment && (
                  <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.comment}</p>
                )}
                <time className="mt-2 block text-xs text-slate-400">
                  {new Date(item.created_at).toLocaleDateString("ko-KR")}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
