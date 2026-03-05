import Link from "next/link";
import { createClient } from "@/lib/supabase-server";
import Card from "@/components/Card";

export const revalidate = 60;

export default async function CategoriesPage() {
  const supabase = createClient();
  const { data: categories } = await supabase
    .from("content_categories")
    .select("id, slug, name, sort_order")
    .order("sort_order", { ascending: true });

  if (!categories?.length) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="mb-8 text-2xl font-bold text-slate-900">카테고리</h1>
        <div className="card">
          <p className="text-slate-500">카테고리가 없습니다. DB 마이그레이션을 실행해 주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="mb-8 text-2xl font-bold text-slate-900">카테고리</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {categories.map((cat) => (
          <Link key={cat.id} href={`/categories/${cat.slug}`}>
            <Card title={cat.name} className="h-full">
              <p className="text-sm text-slate-600">글 목록 보기</p>
              <span className="mt-2 inline-block text-sm text-blue-600">보기 →</span>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
