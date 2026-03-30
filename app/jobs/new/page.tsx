import { redirect } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import JobPostForm from "./JobPostForm";
import type { InitialCompany } from "@/components/jobs/CompanyProfileModal";
import { hasPremiumAccess } from "@/lib/jobs/wage-insight";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function NewJobPostPage() {
  const supabase = createClient();
  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  if (!user) redirect("/login?next=/jobs/new");

  const { data: profile } = await authSupabase.from("profiles").select("onboarding_done").eq("id", user.id).single();
  if (!profile?.onboarding_done) redirect("/onboarding?next=/jobs/new");
  const premiumAccess = await hasPremiumAccess(authSupabase, user.id);

  const { data: categories } = await supabase
    .from("categories")
    .select("id, name, parent_id, slug, sort_order, is_active, created_at, updated_at")
    .eq("is_active", true)
    .in("usage", ["job", "default"])
    .order("sort_order", { ascending: true });
  const { data: jobTypePresets } = await supabase
    .from("job_type_presets")
    .select("key, label, sort_order, is_active")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("label", { ascending: true });

  const list = categories ?? [];
  const mainCategories = list.filter((c) => c.parent_id == null);
  const subCategories = list.filter((c) => c.parent_id != null);

  const { data: company } = await authSupabase
    .from("company_profiles")
    .select("company_name, representative_name, business_number, contact_phone")
    .eq("user_id", user.id)
    .maybeSingle();

  const companyName = (company?.company_name ?? "").trim();
  const representativeName = (company?.representative_name ?? "").trim();
  const businessNumber = (company?.business_number ?? "").replace(/\D/g, "");
  const contactPhone = (company?.contact_phone ?? "").trim();
  const companyProfileComplete =
    companyName !== "" &&
    representativeName !== "" &&
    businessNumber.length === 10 &&
    contactPhone.replace(/-/g, "").length >= 10;

  const initialCompany: InitialCompany = {
    company_name: company?.company_name ?? "",
    representative_name: company?.representative_name ?? "",
    business_number: company?.business_number ?? "",
    contact_phone: company?.contact_phone ?? "",
  };

  return (
    <JobPostForm
      mainCategories={mainCategories}
      subCategories={subCategories}
      jobTypePresets={(jobTypePresets ?? []) as { key: string; label: string; sort_order?: number; is_active?: boolean }[]}
      companyProfileComplete={companyProfileComplete}
      initialCompany={initialCompany}
      contactPhoneFromProfile={companyProfileComplete ? (initialCompany.contact_phone || null) : null}
      premiumAccess={premiumAccess}
    />
  );
}
