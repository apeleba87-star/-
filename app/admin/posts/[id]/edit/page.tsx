import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import PostForm from "@/components/admin/PostForm";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createServerSupabase();
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", id)
    .single();
  const { data: categories } = await supabase
    .from("content_categories")
    .select("id, slug, name")
    .order("sort_order");

  if (error || !post) notFound();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">글 수정</h1>
      <PostForm categories={categories ?? []} post={post} />
    </div>
  );
}
