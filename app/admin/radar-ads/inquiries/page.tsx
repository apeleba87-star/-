import MonetizationSectionTabs from "@/components/admin/MonetizationSectionTabs";
import RadarAdsSubNav from "@/components/admin/RadarAdsSubNav";
import { createServerSupabase } from "@/lib/supabase-server";
import RadarAdInquiriesPanel, { type RadarAdInquiryRow } from "./RadarAdInquiriesPanel";

export const dynamic = "force-dynamic";

export default async function AdminRadarAdInquiriesPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return <p className="text-red-600">로그인이 필요합니다.</p>;
  }
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return <p className="text-red-600">권한이 없습니다.</p>;
  }

  const { data: rows, error } = await supabase
    .from("radar_ad_inquiries")
    .select(
      "id, created_at, company_name, contact_name, phone, email, scope, region_interest, category, message, status, admin_note"
    )
    .order("created_at", { ascending: false })
    .limit(300);

  if (error) {
    return (
      <div className="space-y-6">
        <MonetizationSectionTabs />
        <RadarAdsSubNav />
        <p className="text-red-600">
          불러오지 못했습니다. Supabase 마이그레이션{" "}
          <code className="rounded bg-slate-100 px-1">170_radar_ad_inquiries</code> 적용 여부를 확인해
          주세요.
        </p>
        <p className="font-mono text-sm text-slate-600">{error.message}</p>
      </div>
    );
  }

  const list = (rows ?? []) as RadarAdInquiryRow[];
  const newCount = list.filter((r) => r.status === "new").length;

  return (
    <div className="space-y-6">
      <MonetizationSectionTabs />
      <RadarAdsSubNav />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">광고 문의</h1>
        <p className="mt-1 text-sm text-slate-600">
          <a href="/advertise" target="_blank" rel="noreferrer" className="font-medium text-teal-700 hover:underline">
            /advertise
          </a>{" "}
          접수 목록 · 신규 {newCount}건
        </p>
      </div>
      <RadarAdInquiriesPanel rows={list} />
    </div>
  );
}
