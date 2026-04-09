import Link from "next/link";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import PartnerPortfolioEditor, { type PortfolioEditorItem } from "@/components/partners/PartnerPortfolioEditor";
import { resolvePortfolioItemUrls } from "@/lib/partners/resolve-portfolio-item-urls";

export const revalidate = 0;
export const dynamic = "force-dynamic";

type PortfolioRow = {
  id: string;
  title: string;
  caption: string | null;
  sort_order: number;
  image_path_thumb: string | null;
  image_path_display: string | null;
  external_image_url: string | null;
};

export default async function AdminPartnerPortfolioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabase();

  const { data: company, error: companyError } = await supabase
    .from("partner_companies")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (companyError || !company) notFound();

  const { data: rows } = await supabase
    .from("partner_company_portfolio_items")
    .select("id, title, caption, sort_order, image_path_thumb, image_path_display, external_image_url")
    .eq("company_id", id)
    .order("sort_order", { ascending: true });

  const items: PortfolioEditorItem[] = ((rows ?? []) as PortfolioRow[]).map((r) => {
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">포트폴리오 관리</h1>
          <p className="mt-1 text-sm text-slate-600">{company.name as string}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link href={`/admin/partners/${id}/edit`} className="font-medium text-sky-700 hover:underline">
            업체 수정
          </Link>
          <Link href="/admin/partners" className="font-medium text-emerald-700 hover:underline">
            ← 협력센터 관리
          </Link>
        </div>
      </div>
      <PartnerPortfolioEditor companyId={id} initialItems={items} />
    </div>
  );
}
