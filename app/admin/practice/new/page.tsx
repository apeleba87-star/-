import PracticeBlogForm from "@/components/practice-blog/PracticeBlogForm";
import {
  listAdminPracticeCategories,
  listAdminPracticePosts,
} from "@/lib/practice-blog/queries";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";

export default async function AdminPracticeNewPage() {
  const [products, posts, categories] = await Promise.all([
    listMergedProducts(),
    listAdminPracticePosts(),
    listAdminPracticeCategories(),
  ]);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">청소업 실무 · 새 글</h1>
      <PracticeBlogForm
        products={products
          .filter((p) => p.status !== "draft")
          .map((p) => ({ id: p.id, name: p.name, brand: p.brand }))}
        blogOptions={posts
          .filter((p) => p.slug)
          .map((p) => ({ slug: p.slug as string, title: p.title }))}
        categories={categories}
      />
    </div>
  );
}
