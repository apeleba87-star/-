import EduBlogForm from "@/components/edu-blog/EduBlogForm";
import { listAdminEduBlogPosts } from "@/lib/edu-blog/queries";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";

export default async function AdminBlogNewPage() {
  const [products, posts] = await Promise.all([
    listMergedProducts(),
    listAdminEduBlogPosts(),
  ]);

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">청소지식 · 새 글</h1>
      <EduBlogForm
        products={products
          .filter((p) => p.status !== "draft")
          .map((p) => ({ id: p.id, name: p.name, brand: p.brand }))}
        blogOptions={posts
          .filter((p) => p.slug)
          .map((p) => ({ slug: p.slug as string, title: p.title }))}
      />
    </div>
  );
}
