import { createClient } from "@/lib/supabase-server";
import NewListingForm from "./NewListingForm";

export const revalidate = 60;

export default async function NewListingPage() {
  const supabase = createClient();

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id, slug, sort_order, is_active, created_at, updated_at, usage")
    .eq("is_active", true)
    .in("usage", ["listing", "default"])
    .order("sort_order", { ascending: true });

  const list = categories ?? [];
  const listingOnly = list.filter((c) => (c as { usage?: string }).usage === "listing");
  const mainCategories = (listingOnly.length > 0 ? listingOnly : list).filter((c) => c.parent_id == null);
  const subCategories = (listingOnly.length > 0 ? listingOnly : list).filter((c) => c.parent_id != null);

  const { data: cltRows } = await supabase.from("category_listing_types").select("category_id, listing_type");
  const categoryListingTypes: Record<string, string[]> = {};
  for (const row of cltRows ?? []) {
    const id = row.category_id as string;
    if (!categoryListingTypes[id]) categoryListingTypes[id] = [];
    categoryListingTypes[id].push(row.listing_type as string);
  }

  if (mainCategories.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="rounded-lg bg-amber-50 p-4 text-amber-800">
          등록된 카테고리가 없습니다. 관리자 페이지에서 현장거래 카테고리 → 유형을 먼저 추가해 주세요.
        </p>
        <a href="/admin/categories" className="mt-4 inline-block text-blue-600 hover:underline">
          카테고리 관리 →
        </a>
      </div>
    );
  }

  const mainForForm = mainCategories.map((c) => ({ id: c.id, name: (c.name ?? "").trim() || "(이름 없음)" }));
  const subForForm = subCategories.map((c) => ({ id: c.id, name: (c.name ?? "").trim() || "(이름 없음)", parent_id: c.parent_id!, slug: c.slug ?? undefined }));

  return (
    <NewListingForm
      mainCategories={mainForForm}
      subCategories={subForForm}
      categoryListingTypes={categoryListingTypes}
    />
  );
}
