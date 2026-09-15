import Link from "next/link";
import EduBlogCategoriesManager from "@/components/admin/EduBlogCategoriesManager";
import { listAdminEduBlogCategories } from "@/lib/edu-blog/categories";
import { EDU_BLOG_NAV_LABEL } from "@/lib/edu-blog/constants";

export default async function AdminEduBlogCategoriesPage() {
  const categories = await listAdminEduBlogCategories();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">{EDU_BLOG_NAV_LABEL} · 칸</h1>
        <p className="mt-1 text-sm text-slate-600">
          허브 안쪽 칸(입주·에어컨·마케팅 등)을 만들고 순서를 정합니다. 글 작성 시 칸을 고릅니다.
        </p>
        <p className="mt-2 text-xs text-amber-800">
          저장 오류 시: Supabase에{" "}
          <code className="rounded bg-amber-50 px-1">202_edu_blog_categories.sql</code> 적용
          여부를 확인하세요.
        </p>
        <p className="mt-3">
          <Link href="/admin/blog" className="text-sm font-medium text-teal-800 hover:underline">
            ← 글 목록
          </Link>
        </p>
      </div>
      <EduBlogCategoriesManager initialCategories={categories} />
    </div>
  );
}
