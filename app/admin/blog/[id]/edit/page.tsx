import { notFound } from "next/navigation";
import EduBlogForm from "@/components/edu-blog/EduBlogForm";
import {
  getAdminEduBlogById,
  listAdminEduBlogPosts,
} from "@/lib/edu-blog/queries";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function AdminBlogEditPage({ params }: Props) {
  const { id } = await params;
  const [post, products, posts] = await Promise.all([
    getAdminEduBlogById(id),
    listMergedProducts(),
    listAdminEduBlogPosts(),
  ]);
  if (!post) notFound();

  return (
    <div>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">청소지식 · 수정</h1>
      <EduBlogForm
        post={post}
        products={products
          .filter((p) => p.status !== "draft")
          .map((p) => ({ id: p.id, name: p.name, brand: p.brand }))}
        blogOptions={posts
          .filter((p) => p.slug && p.id !== post.id)
          .map((p) => ({ slug: p.slug as string, title: p.title }))}
      />
    </div>
  );
}
