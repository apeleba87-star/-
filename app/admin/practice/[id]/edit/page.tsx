import { notFound } from "next/navigation";
import PracticeBlogForm from "@/components/practice-blog/PracticeBlogForm";
import {
  getAdminPracticeById,
  listAdminPracticeCategories,
  listAdminPracticePosts,
} from "@/lib/practice-blog/queries";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminPracticeEditPage({ params }: Props) {
  const { id } = await params;
  const [post, products, posts, categories] = await Promise.all([
    getAdminPracticeById(id),
    listMergedProducts(),
    listAdminPracticePosts(),
    listAdminPracticeCategories(),
  ]);
  if (!post) notFound();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">청소업 실무 · 수정</h1>
      <PracticeBlogForm
        post={post}
        products={products
          .filter((p) => p.status !== "draft")
          .map((p) => ({ id: p.id, name: p.name, brand: p.brand }))}
        blogOptions={posts
          .filter((p) => p.slug && p.id !== post.id)
          .map((p) => ({ slug: p.slug as string, title: p.title }))}
        categories={categories}
      />
    </div>
  );
}
