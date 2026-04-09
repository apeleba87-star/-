import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import PartnerChangeRequestForm from "@/components/partners/PartnerChangeRequestForm";
import PartnerPortfolioEditor, { type PortfolioEditorItem } from "@/components/partners/PartnerPortfolioEditor";
import { resolvePortfolioItemUrls } from "@/lib/partners/resolve-portfolio-item-urls";
import {
  calcPartnerPerformanceMetrics,
  partnerInquiryConversionPercent,
  type PartnerPerformanceEventRow,
} from "@/lib/partners/partner-performance-metrics";

export const dynamic = "force-dynamic";

type CompanyRow = { id: string; name: string; status: string };
type PriceRow = { company_id: string; item_name: string; unit: string | null; base_price: number; note: string | null };
type RequestRow = {
  id: string;
  company_id: string;
  requester_user_id: string;
  reviewer_user_id: string | null;
  status: "pending" | "approved" | "rejected";
  reject_reason: string | null;
  created_at: string;
  reviewed_at: string | null;
};
type ProfileRow = { id: string; display_name: string | null };
type PortfolioDbRow = {
  company_id: string;
  id: string;
  title: string;
  caption: string | null;
  sort_order: number;
  image_path_thumb: string | null;
  image_path_display: string | null;
  external_image_url: string | null;
};

export default async function PartnerPerformancePage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/partners/performance");

  const { data: companies } = await supabase
    .from("partner_companies")
    .select("id, name, status")
    .eq("owner_user_id", user.id)
    .in("status", ["active", "paused", "pending"])
    .order("created_at", { ascending: false });

  const companyRows = (companies ?? []) as CompanyRow[];
  const companyIds = companyRows.map((x) => x.id);

  const [{ data: events }, { data: prices }, { data: requests }, { data: companyCurrent }, { data: portfolioRows }] =
    companyIds.length
      ? await Promise.all([
          supabase
            .from("partner_contact_events")
            .select("company_id, event_type, created_at")
            .in("company_id", companyIds)
            .order("created_at", { ascending: false }),
          supabase
            .from("partner_company_prices")
            .select("company_id, item_name, unit, base_price, note")
            .in("company_id", companyIds)
            .order("sort_order", { ascending: true }),
          supabase
            .from("partner_company_change_requests")
            .select("id, company_id, requester_user_id, reviewer_user_id, status, reject_reason, created_at, reviewed_at")
            .in("company_id", companyIds)
            .order("created_at", { ascending: false })
            .limit(200),
          supabase
            .from("partner_companies")
            .select("id, main_image_url")
            .in("id", companyIds),
          supabase
            .from("partner_company_portfolio_items")
            .select("company_id, id, title, caption, sort_order, image_path_thumb, image_path_display, external_image_url")
            .in("company_id", companyIds)
            .order("sort_order", { ascending: true }),
        ])
      : [
          { data: [] as PartnerPerformanceEventRow[] },
          { data: [] as PriceRow[] },
          { data: [] as RequestRow[] },
          { data: [] as { id: string; main_image_url: string | null }[] },
          { data: [] as PortfolioDbRow[] },
        ];

  const rows = (events ?? []) as PartnerPerformanceEventRow[];
  const priceRows = (prices ?? []) as PriceRow[];
  const requestRows = (requests ?? []) as RequestRow[];
  const currentRows = (companyCurrent ?? []) as { id: string; main_image_url: string | null }[];
  const byCompany = new Map<string, PartnerPerformanceEventRow[]>();
  for (const row of rows) {
    const curr = byCompany.get(row.company_id) ?? [];
    curr.push(row);
    byCompany.set(row.company_id, curr);
  }
  const priceByCompany = new Map<string, PriceRow[]>();
  for (const row of priceRows) {
    const curr = priceByCompany.get(row.company_id) ?? [];
    curr.push(row);
    priceByCompany.set(row.company_id, curr);
  }
  const currentImageByCompany = new Map(currentRows.map((x) => [x.id, x.main_image_url]));
  const pendingByCompany = new Set(
    requestRows.filter((r) => r.status === "pending").map((r) => r.company_id)
  );
  const requestByCompany = new Map<string, RequestRow[]>();
  for (const r of requestRows) {
    const curr = requestByCompany.get(r.company_id) ?? [];
    curr.push(r);
    requestByCompany.set(r.company_id, curr);
  }
  const reviewerIds = Array.from(new Set(requestRows.map((r) => r.reviewer_user_id).filter(Boolean) as string[]));
  const { data: profiles } = reviewerIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", reviewerIds)
    : { data: [] as ProfileRow[] };
  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p.display_name?.trim() || p.id.slice(0, 8)]));

  const portfolioByCompany = new Map<string, PortfolioEditorItem[]>();
  for (const r of (portfolioRows ?? []) as PortfolioDbRow[]) {
    const { thumbUrl, displayUrl } = resolvePortfolioItemUrls(r);
    const item: PortfolioEditorItem = {
      id: r.id,
      title: r.title,
      caption: r.caption,
      sort_order: r.sort_order,
      thumbUrl,
      displayUrl,
      isExternal: Boolean(r.external_image_url?.trim()),
    };
    const list = portfolioByCompany.get(r.company_id) ?? [];
    list.push(item);
    portfolioByCompany.set(r.company_id, list);
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">협력센터 광고 성과</h1>
        <p className="text-sm text-slate-600">내 업체의 최근 7일/30일 상세조회와 문의 클릭 성과를 확인할 수 있습니다.</p>
      </header>

      {companyRows.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          연결된 협력업체가 없습니다. 관리자에게 owner 연결을 요청해 주세요.
        </div>
      ) : (
        <div className="space-y-4">
          {companyRows.map((company) => {
            const metrics = calcPartnerPerformanceMetrics(byCompany.get(company.id) ?? []);
            return (
              <section key={company.id} className="rounded-xl border border-slate-200 bg-white p-5">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-slate-900">{company.name}</h2>
                  <span className="rounded bg-slate-100 px-2 py-0.5 text-xs text-slate-600">{company.status}</span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">상세조회(7일)</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.detail7}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">문의클릭(7일)</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.contact7}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">상세조회(30일)</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.detail30}</p>
                  </div>
                  <div className="rounded-lg border border-slate-100 p-3">
                    <p className="text-xs text-slate-500">문의클릭(30일)</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{metrics.contact30}</p>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <p className="text-sm text-slate-600">
                    7일 문의전환율:{" "}
                    <span className="font-semibold text-slate-900">
                      {partnerInquiryConversionPercent(metrics.contact7, metrics.detail7)}
                    </span>
                  </p>
                  <p className="text-sm text-slate-600">
                    30일 문의전환율:{" "}
                    <span className="font-semibold text-slate-900">
                      {partnerInquiryConversionPercent(metrics.contact30, metrics.detail30)}
                    </span>
                  </p>
                </div>
                <PartnerChangeRequestForm
                  companyId={company.id}
                  initialImageUrl={currentImageByCompany.get(company.id) ?? null}
                  initialPrices={priceByCompany.get(company.id) ?? []}
                  hasPendingRequest={pendingByCompany.has(company.id)}
                />
                <PartnerPortfolioEditor companyId={company.id} initialItems={portfolioByCompany.get(company.id) ?? []} />
                <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/70 p-3">
                  <p className="mb-2 text-xs font-semibold text-slate-700">내 요청 상태 상세</p>
                  {(requestByCompany.get(company.id) ?? []).length === 0 ? (
                    <p className="text-xs text-slate-500">요청 이력이 없습니다.</p>
                  ) : (
                    <ul className="space-y-1.5">
                      {(requestByCompany.get(company.id) ?? []).slice(0, 10).map((req) => (
                        <li key={req.id} className="text-xs text-slate-600">
                          <span
                            className={`mr-1.5 rounded px-1.5 py-0.5 font-medium ${
                              req.status === "approved"
                                ? "bg-emerald-100 text-emerald-700"
                                : req.status === "rejected"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-amber-100 text-amber-700"
                            }`}
                          >
                            {req.status === "approved" ? "승인" : req.status === "rejected" ? "반려" : "승인대기"}
                          </span>
                          요청: {new Date(req.created_at).toLocaleString("ko-KR")}
                          {req.reviewed_at ? ` · 검토: ${new Date(req.reviewed_at).toLocaleString("ko-KR")}` : ""}
                          {req.reviewer_user_id ? ` · 검토자: ${profileById.get(req.reviewer_user_id) ?? req.reviewer_user_id.slice(0, 8)}` : ""}
                          {req.reject_reason ? ` · 사유: ${req.reject_reason}` : ""}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
}
