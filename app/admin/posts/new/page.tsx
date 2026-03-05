import { createServerSupabase } from "@/lib/supabase-server";
import PostForm from "@/components/admin/PostForm";

export default async function NewPostPage() {
  const supabase = await createServerSupabase();
  const { data: categories } = await supabase
    .from("content_categories")
    .select("id, slug, name")
    .order("sort_order");

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">새 글</h1>
      <PostForm categories={categories ?? []} />
    </div>
  );
}
