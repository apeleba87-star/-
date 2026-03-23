import { createServerSupabase } from "@/lib/supabase-server";
import { redirect } from "next/navigation";
import ExternalListingBulkUpload from "./ExternalListingBulkUpload";
import ExternalListingForm from "./ExternalListingForm";
import ExcelPasteForm from "./ExcelPasteForm";

const LISTING_TYPE_OPTIONS = [
  { value: "sale_regular", label: "정기 매매" },
  { value: "referral_regular", label: "정기 소개" },
  { value: "referral_one_time", label: "일회성 소개" },
  { value: "subcontract", label: "도급" },
] as const;

export default async function AdminExternalListingPage() {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin/listings/external");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "editor") redirect("/admin");

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name")
    .eq("usage", "listing")
    .eq("is_active", true)
    .order("sort_order", { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">현장거래 등록 (외부 퍼옴)</h1>
        <p className="mt-1 text-sm text-slate-500">
          외부 커뮤니티에서 가져온 글을 등록합니다. 평균단가 집계에 포함되며, 상세에서 직접 연락·확인 안내가 노출됩니다.
        </p>
      </div>
      <ExternalListingForm
        listingTypes={LISTING_TYPE_OPTIONS}
        categories={categories ?? []}
      />

      <ExternalListingBulkUpload />

      <hr className="border-slate-200" />

      <ExcelPasteForm categories={categories ?? []} />
    </div>
  );
}
