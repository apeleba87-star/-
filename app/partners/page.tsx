import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 120;

type PartnerListRow = {
  id: string;
  name: string;
  business_verified: boolean;
  main_image_url: string | null;
};

type PartnerCategoryRow = {
  company_id: string;
  category_code: string;
};

type PartnerRegionLinkRow = {
  company_id: string;
  region_code: string;
};

type CategoryMasterRow = {
  code: string;
  label: string;
};

type RegionMasterRow = {
  code: string;
  label: string;
};

type PriceRow = {
  id: string;
  company_id: string;
  item_name: string;
  unit: string | null;
  base_price: number;
  sort_order: number;
};

function formatWon(n: number): string {
  return Number.isFinite(n) ? `${n.toLocaleString("ko-KR")}원` : "—";
}

export default async function PartnersPage() {
  const supabase = createClient();
  const [
    { data: companies },
    { data: companyCategories },
    { data: categories },
    { data: companyRegions },
    { data: regions },
    { data: prices },
  ] = await Promise.all([
    supabase
      .from("partner_companies")
      .select("id, name, business_verified, main_image_url")
      .eq("status", "active")
      .order("is_paid_slot", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(80),
    supabase.from("partner_company_categories").select("company_id, category_code"),
    supabase.from("partner_categories").select("code, label").eq("is_active", true),
    supabase.from("partner_company_regions").select("company_id, region_code"),
    supabase.from("partner_regions").select("code, label").eq("is_active", true),
    supabase.from("partner_company_prices").select("id, company_id, item_name, unit, base_price, sort_order"),
  ]);

  const rows = (companies ?? []) as PartnerListRow[];
  const links = (companyCategories ?? []) as PartnerCategoryRow[];
  const catMaster = (categories ?? []) as CategoryMasterRow[];
  const regionLinks = (companyRegions ?? []) as PartnerRegionLinkRow[];
  const regionMaster = (regions ?? []) as RegionMasterRow[];
  const priceRows = (prices ?? []) as PriceRow[];

  const categoryLabelByCode = new Map(catMaster.map((c) => [c.code, c.label]));
  const categoryLabelsByCompany = new Map<string, string[]>();
  for (const link of links) {
    const label = categoryLabelByCode.get(link.category_code);
    if (!label) continue;
    const current = categoryLabelsByCompany.get(link.company_id) ?? [];
    current.push(label);
    categoryLabelsByCompany.set(link.company_id, current);
  }

  const regionLabelByCode = new Map(regionMaster.map((r) => [r.code, r.label]));
  const regionLabelsByCompany = new Map<string, string[]>();
  for (const link of regionLinks) {
    const label = regionLabelByCode.get(link.region_code);
    if (!label) continue;
    const current = regionLabelsByCompany.get(link.company_id) ?? [];
    current.push(label);
    regionLabelsByCompany.set(link.company_id, current);
  }

  const pricesByCompany = new Map<string, PriceRow[]>();
  for (const p of priceRows) {
    const list = pricesByCompany.get(p.company_id) ?? [];
    list.push(p);
    pricesByCompany.set(p.company_id, list);
  }
  const topPricesByCompany = new Map<string, PriceRow[]>();
  for (const [cid, list] of pricesByCompany) {
    list.sort((a, b) => a.sort_order - b.sort_order || a.item_name.localeCompare(b.item_name));
    topPricesByCompany.set(cid, list.slice(0, 2));
  }

  return (
    <main className="min-h-[60vh] bg-gradient-to-b from-slate-50/80 via-white to-white">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-5 sm:py-12">
        <header className="mb-10 border-b border-slate-200/90 pb-10 sm:mb-12 sm:pb-12">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700/90">Partners</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-[2rem]">협력 센터</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-slate-600">
            서울·경기 중심 B2B 협력업체를 소개합니다. 업종과 지역은 정책에 따라 순차 확대됩니다.
          </p>
        </header>

        {rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 px-6 py-14 text-center shadow-sm">
            <p className="text-sm font-medium text-slate-700">현재 공개된 협력업체가 없습니다.</p>
            <p className="mt-1 text-xs text-slate-500">준비가 완료되는 대로 이곳에 표시됩니다.</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-7">
            {rows.map((company) => {
              const categoryLabels = categoryLabelsByCompany.get(company.id) ?? [];
              const regionLabels = regionLabelsByCompany.get(company.id) ?? [];
              const topPrices = topPricesByCompany.get(company.id) ?? [];
              const industryBadge =
                categoryLabels.length > 0 ? categoryLabels.join(" · ") : "업종 미등록";
              return (
                <article
                  key={company.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] ring-1 ring-slate-900/[0.03] transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-[0_12px_40px_-12px_rgba(15,23,42,0.18)] hover:ring-slate-900/[0.05]"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                    <div
                      className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-t from-slate-900/25 via-transparent to-slate-900/10"
                      aria-hidden
                    />
                    <span className="absolute left-3 top-3 z-10 max-w-[min(100%-1.5rem,14rem)] truncate rounded-full border border-white/20 bg-white/92 px-3 py-1 text-[11px] font-semibold text-slate-800 shadow-sm backdrop-blur-md">
                      {industryBadge}
                    </span>
                    {company.main_image_url ? (
                      <Image
                        src={company.main_image_url}
                        alt=""
                        fill
                        className="object-cover transition duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-slate-200/80 text-xs font-medium text-slate-400">
                        이미지 준비 중
                      </div>
                    )}
                  </div>

                  <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                    <div className="flex flex-wrap items-start justify-between gap-2 gap-y-1">
                      <h2 className="text-lg font-bold leading-snug tracking-tight text-slate-900">{company.name}</h2>
                      {company.business_verified ? (
                        <span className="shrink-0 rounded-full border border-emerald-200/80 bg-emerald-50/95 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-800">
                          사업자 확인
                        </span>
                      ) : null}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">활동 지역</span>
                      {regionLabels.length > 0 ? (
                        regionLabels.map((r) => (
                          <span
                            key={r}
                            className="rounded-full bg-slate-100/95 px-2.5 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200/80"
                          >
                            {r}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400">미등록</span>
                      )}
                    </div>

                    {topPrices.length > 0 ? (
                      <div className="mt-5 rounded-xl bg-gradient-to-b from-slate-50 to-slate-50/40 p-3.5 ring-1 ring-inset ring-slate-200/70">
                        <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                          대표 가격
                        </p>
                        <ul className="space-y-0">
                          {topPrices.map((p, idx) => {
                            const amount = Number(p.base_price);
                            const u = p.unit?.trim();
                            return (
                              <li
                                key={p.id}
                                className={`flex items-baseline justify-between gap-3 py-2.5 ${
                                  idx < topPrices.length - 1 ? "border-b border-slate-200/70" : ""
                                }`}
                              >
                                <span className="min-w-0 text-sm text-slate-600">{p.item_name}</span>
                                <span className="shrink-0 text-right">
                                  <span className="text-sm font-semibold tabular-nums text-slate-900">
                                    {formatWon(amount)}
                                  </span>
                                  {u ? (
                                    <span className="ml-0.5 text-xs font-normal text-slate-500">/{u}</span>
                                  ) : null}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}

                    <div className="mt-auto pt-5">
                      <Link
                        href={`/partners/${company.id}`}
                        className="flex min-h-[44px] w-full items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-800 active:scale-[0.99]"
                      >
                        업체 상세 보기
                        <span className="ml-1.5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-white">
                          →
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
