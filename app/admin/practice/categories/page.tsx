import PracticeCategoryManager from "@/components/practice-blog/PracticeCategoryManager";
import {
  countPracticePostsInCategory,
  listAdminPracticeCategories,
} from "@/lib/practice-blog/queries";

export default async function AdminPracticeCategoriesPage() {
  const categories = await listAdminPracticeCategories();
  const counts = Object.fromEntries(
    await Promise.all(
      categories.map(async (c) => [c.id, await countPracticePostsInCategory(c.id)] as const)
    )
  );

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">청소업 실무 · 칸(메뉴)</h1>
      <p className="mb-6 text-sm text-slate-600">
        공개한 칸만 /practice에 카드로 나옵니다. 칸을 지워도 글 URL은 남습니다.
      </p>
      <PracticeCategoryManager categories={categories} postCounts={counts} />
    </div>
  );
}
