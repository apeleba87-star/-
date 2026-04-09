import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import PartnerDetailShell from "@/components/partners/PartnerDetailShell";
import PartnerDetailViewTracker from "@/components/partners/PartnerDetailViewTracker";
import { resolvePortfolioItemUrls } from "@/lib/partners/resolve-portfolio-item-urls";

export const revalidate = 120;

type PartnerCompanyRow = {
  id: string;
  name: string;
  contact_name: string;
  one_liner: string | null;
  work_scope: string | null;
  business_verified: boolean;
  homepage_url: string | null;
  sns_url: string | null;
  main_image_url: string | null;
  status: string;
};

type RegionLinkRow = { region_code: string };
type CategoryLinkRow = { category_code: string };
type PriceRow = { item_name: string; unit: string | null; base_price: number; note: string | null; sort_order: number };
type RegionMasterRow = { code: string; label: string };
type CategoryMasterRow = { code: string; label: string };
type PortfolioRow = {
  id: string;
  title: string;
  caption: string | null;
  sort_order: number;
  image_path_thumb: string | null;
  image_path_display: string | null;
  external_image_url: string | null;
};

export default async function PartnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [
    { data: company },
    { data: regionLinks },
    { data: categoryLinks },
    { data: prices },
    { data: regions },
    { data: categories },
    { data: portfolioRows },
    { data: favRow },
  ] = await Promise.all([
    supabase
      .from("partner_companies")
      .select("id, name, contact_name, one_liner, work_scope, business_verified, homepage_url, sns_url, main_image_url, status")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("partner_company_regions").select("region_code").eq("company_id", id),
    supabase.from("partner_company_categories").select("category_code").eq("company_id", id),
    supabase.from("partner_company_prices").select("item_name, unit, base_price, note, sort_order").eq("company_id", id).order("sort_order", { ascending: true }),
    supabase.from("partner_regions").select("code, label"),
    supabase.from("partner_categories").select("code, label"),
    supabase
      .from("partner_company_portfolio_items")
      .select("id, title, caption, sort_order, image_path_thumb, image_path_display, external_image_url")
      .eq("company_id", id)
      .order("sort_order", { ascending: true }),
    user
      ? supabase
          .from("partner_company_favorites")
          .select("company_id")
          .eq("user_id", user.id)
          .eq("company_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null as { company_id: string } | null }),
  ]);

  const row = company as PartnerCompanyRow | null;
  if (!row || row.status !== "active") notFound();

  const regionMaster = new Map(((regions ?? []) as RegionMasterRow[]).map((x) => [x.code, x.label]));
  const categoryMaster = new Map(((categories ?? []) as CategoryMasterRow[]).map((x) => [x.code, x.label]));
  const regionLabels = ((regionLinks ?? []) as RegionLinkRow[])
    .map((x) => regionMaster.get(x.region_code))
    .filter(Boolean) as string[];
  const categoryLabels = ((categoryLinks ?? []) as CategoryLinkRow[])
    .map((x) => categoryMaster.get(x.category_code))
    .filter(Boolean) as string[];
  const priceRows = (prices ?? []) as PriceRow[];

  const portfolioItems = ((portfolioRows ?? []) as PortfolioRow[]).map((r) => {
    const { thumbUrl, displayUrl } = resolvePortfolioItemUrls(r);
    return {
      id: r.id,
      title: r.title,
      caption: r.caption,
      sort_order: r.sort_order,
      thumbUrl,
      displayUrl,
      isExternal: Boolean(r.external_image_url?.trim()),
    };
  });

  const initialFavorited = Boolean(favRow && (favRow as { company_id?: string }).company_id);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="sr-only">{row.name}</h1>
      <PartnerDetailViewTracker companyId={row.id} />
      <div className="mb-4 flex justify-end">
        <Link href="/partners" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          ← 협력 센터 목록
        </Link>
      </div>

      <PartnerDetailShell
        companyId={row.id}
        companyName={row.name}
        businessVerified={row.business_verified}
        categoryLabels={categoryLabels}
        regionLabels={regionLabels}
        oneLiner={row.one_liner}
        contactName={row.contact_name}
        workScope={row.work_scope}
        mainImageUrl={row.main_image_url}
        homepageUrl={row.homepage_url}
        snsUrl={row.sns_url}
        priceRows={priceRows}
        portfolioItems={portfolioItems}
        initialFavorited={initialFavorited}
        isLoggedIn={Boolean(user)}
      />
    </main>
  );
}
