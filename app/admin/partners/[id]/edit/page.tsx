import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import PartnerCompanyEditForm, { type PartnerEditInitial } from "./PartnerCompanyEditForm";

export const dynamic = "force-dynamic";

type OptionRow = { code: string; label: string };
type CategoryAdminRow = OptionRow & { is_active: boolean };
type RegionAdminRow = OptionRow & { is_active: boolean };

export default async function AdminPartnerEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const [{ data: company }, { data: catLinks }, { data: regLinks }, { data: prices }, { data: categories }, { data: regions }] =
    await Promise.all([
      supabase
        .from("partner_companies")
        .select(
          "id, name, contact_name, phone, one_liner, work_scope, business_verified, homepage_url, sns_url, main_image_url, status, owner_user_id"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase.from("partner_company_categories").select("category_code").eq("company_id", id),
      supabase.from("partner_company_regions").select("region_code").eq("company_id", id),
      supabase.from("partner_company_prices").select("item_name, unit, base_price, note").eq("company_id", id).order("sort_order", { ascending: true }),
      supabase.from("partner_categories").select("code, label, is_active, sort_order").order("sort_order", { ascending: true }),
      supabase.from("partner_regions").select("code, label, is_active, sort_order").order("sort_order", { ascending: true }),
    ]);

  if (!company) notFound();

  const c = company as Record<string, unknown>;
  const categoryRows = (categories ?? []) as CategoryAdminRow[];
  const regionRows = (regions ?? []) as RegionAdminRow[];
  const activeCategoryRows: OptionRow[] = categoryRows.filter((x) => x.is_active).map((x) => ({ code: x.code, label: x.label }));
  const activeRegionRows: OptionRow[] = regionRows.filter((x) => x.is_active).map((x) => ({ code: x.code, label: x.label }));

  const initial: PartnerEditInitial = {
    id: c.id as string,
    name: (c.name as string) ?? "",
    contact_name: (c.contact_name as string) ?? "",
    phone: (c.phone as string) ?? "",
    one_liner: (c.one_liner as string | null) ?? null,
    work_scope: (c.work_scope as string | null) ?? null,
    business_verified: Boolean(c.business_verified),
    homepage_url: (c.homepage_url as string | null) ?? null,
    sns_url: (c.sns_url as string | null) ?? null,
    main_image_url: (c.main_image_url as string | null) ?? null,
    status: (c.status as string) ?? "active",
    owner_user_id: (c.owner_user_id as string | null) ?? null,
    category_codes: ((catLinks ?? []) as { category_code: string }[]).map((x) => x.category_code),
    region_codes: ((regLinks ?? []) as { region_code: string }[]).map((x) => x.region_code),
    prices: ((prices ?? []) as { item_name: string; unit: string | null; base_price: number; note: string | null }[]).map((p) => ({
      item_name: p.item_name,
      unit: p.unit,
      base_price: p.base_price,
      note: p.note,
    })),
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900">협력업체 수정</h1>
        <Link href="/admin/partners" className="text-sm font-medium text-slate-600 hover:underline">
          ← 협력센터 관리
        </Link>
      </div>
      <PartnerCompanyEditForm initial={initial} categories={activeCategoryRows} regions={activeRegionRows} />
    </div>
  );
}
