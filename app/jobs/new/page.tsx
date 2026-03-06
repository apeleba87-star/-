import { createClient } from "@/lib/supabase-server";
import JobPostForm from "./JobPostForm";

export const revalidate = 60;

export default async function NewJobPostPage() {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id, slug, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  const list = categories ?? [];
  const mainCategories = list.filter((c) => c.parent_id == null);
  const subCategories = list.filter((c) => c.parent_id != null);

  if (mainCategories.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="rounded-lg bg-amber-50 p-4 text-amber-800">
          등록된 카테고리가 없습니다. 관리자 페이지에서 대분류를 먼저 추가해 주세요.
        </p>
        <a href="/admin/categories" className="mt-4 inline-block text-blue-600 hover:underline">
          카테고리 관리 →
        </a>
      </div>
    );
  }

  return (
    <JobPostForm
      mainCategories={mainCategories as { id: string; name: string; parent_id: string | null; slug: string; sort_order: number; is_active: boolean }[]}
      subCategories={subCategories as { id: string; name: string; parent_id: string | null; slug: string; sort_order: number; is_active: boolean }[]}
    />
  );
}
