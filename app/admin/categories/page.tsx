import { getCategories, getCategoryListingTypesMap, getJobCategoryReferences, getJobTypePresets } from "./actions";
import CategoriesManager from "./CategoriesManager";

export default async function AdminCategoriesPage() {
  const [{ data: categories, error }, { data: listingTypesMap, error: ltError }, { data: jobCategoryRefs }, { data: jobTypePresets }] = await Promise.all([
    getCategories(),
    getCategoryListingTypesMap(),
    getJobCategoryReferences(),
    getJobTypePresets(),
  ]);

  if (error) {
    return (
      <div>
        <h1 className="mb-4 text-2xl font-bold text-slate-900">카테고리 관리</h1>
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">카테고리 관리</h1>
      <p className="mb-6 text-sm text-slate-500">
        대분류·소분류를 추가·수정·비활성화할 수 있습니다. 비활성화한 카테고리는 글쓰기 선택 목록에 나오지 않으며, 기존 게시글 데이터는 유지됩니다.
      </p>
      <CategoriesManager
        initialCategories={categories}
        initialCategoryListingTypes={ltError ? {} : (listingTypesMap ?? {})}
        initialJobCategoryRefs={jobCategoryRefs ?? []}
        initialJobTypePresets={jobTypePresets ?? []}
      />
    </div>
  );
}
