import Link from "next/link";
import { createServerSupabase } from "@/lib/supabase-server";
import PartnerCompanyForm from "./PartnerCompanyForm";
import AdminPartnerRequestActions from "@/components/partners/AdminPartnerRequestActions";
import PartnerCategoryManager from "./PartnerCategoryManager";
import PartnerRegionManager from "./PartnerRegionManager";
import AdminPartnersTabNav, { type AdminPartnersTab } from "@/components/partners/AdminPartnersTabNav";
import PartnerCompanyManageList from "@/components/partners/PartnerCompanyManageList";
import AdminPartnerPerformancePanel from "@/components/partners/AdminPartnerPerformancePanel";
import type { PartnerPerformanceEventRow } from "@/lib/partners/partner-performance-metrics";

export const revalidate = 60;

type CompanyRow = { id: string; name: string; status: string; created_at: string };
type EventRow = { company_id: string; event_type: string; created_at: string };
type OptionRow = { code: string; label: string };
type CategoryAdminRow = OptionRow & { is_active: boolean; sort_order: number };
type RegionAdminRow = OptionRow & { parent_code: string | null; is_active: boolean; sort_order: number };
type RequestRow = {
  id: string;
  company_id: string;
  requester_user_id: string;
  reviewer_user_id: string | null;
  status: "pending" | "approved" | "rejected";
  payload: {
    main_image_url?: string | null;
    prices?: { item_name: string; unit?: string | null; base_price: number; note?: string | null }[];
  } | null;
  reject_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
};
type ProfileRow = { id: string; display_name: string | null };
type MasterLogRow = {
  id: string;
  actor_user_id: string;
  entity_type: "category" | "region";
  entity_code: string;
  action_type: "create" | "update" | "toggle_active" | "sort_change";
  created_at: string;
};

const PERF_STATUSES = new Set(["active", "paused", "pending"]);

function parseTab(raw: string | string[] | undefined): AdminPartnersTab {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === "register" || v === "performance") return v;
  return "manage";
}

type PageProps = { searchParams: Promise<{ tab?: string | string[] }> };

export default async function AdminPartnersPage({ searchParams }: PageProps) {
  const { tab: tabParam } = await searchParams;
  const tab = parseTab(tabParam);

  const supabase = await createServerSupabase();
  const [{ data: companies }, { data: events }, { data: categories }, { data: regions }, { data: requests }, { data: masterLogs }] =
    await Promise.all([
      supabase
        .from("partner_companies")
        .select("id, name, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("partner_contact_events")
        .select("company_id, event_type, created_at")
        .order("created_at", { ascending: false })
        .limit(12000),
      supabase.from("partner_categories").select("code, label, is_active, sort_order").order("sort_order", { ascending: true }),
      supabase.from("partner_regions").select("code, label, parent_code, is_active, sort_order").order("sort_order", { ascending: true }),
      supabase
        .from("partner_company_change_requests")
        .select("id, company_id, requester_user_id, reviewer_user_id, status, payload, reject_reason, reviewed_at, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("partner_master_change_logs")
        .select("id, actor_user_id, entity_type, entity_code, action_type, created_at")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

  const companyRows = (companies ?? []) as CompanyRow[];
  const eventRows = (events ?? []) as EventRow[];
  const categoryRows = (categories ?? []) as CategoryAdminRow[];
  const regionRows = (regions ?? []) as RegionAdminRow[];
  const activeCategoryRows: OptionRow[] = categoryRows.filter((x) => x.is_active).map((x) => ({ code: x.code, label: x.label }));
  const activeRegionRows: OptionRow[] = regionRows.filter((x) => x.is_active).map((x) => ({ code: x.code, label: x.label }));
  const requestRows = (requests ?? []) as RequestRow[];
  const masterLogRows = (masterLogs ?? []) as MasterLogRow[];
  const pendingRequests = requestRows.filter((r) => r.status === "pending");
  const userIds = Array.from(
    new Set(
      [
        ...requestRows.flatMap((r) => [r.requester_user_id, r.reviewer_user_id].filter(Boolean) as string[]),
        ...masterLogRows.map((x) => x.actor_user_id),
      ]
    )
  );
  const { data: profiles } = userIds.length
    ? await supabase.from("profiles").select("id, display_name").in("id", userIds)
    : { data: [] as ProfileRow[] };
  const profileById = new Map(((profiles ?? []) as ProfileRow[]).map((p) => [p.id, p.display_name?.trim() || p.id.slice(0, 8)]));
  const companyNameById = new Map(companyRows.map((x) => [x.id, x.name]));
  /** 협력 문의 버튼(contact_click)만 집계 — 상세 조회(detail_view)는 제외 */
  const eventCountByCompany = new Map<string, number>();
  for (const e of eventRows) {
    if (e.event_type !== "contact_click") continue;
    eventCountByCompany.set(e.company_id, (eventCountByCompany.get(e.company_id) ?? 0) + 1);
  }
  const eventCountRecord = Object.fromEntries(eventCountByCompany);

  const perfCompanyRows = companyRows.filter((c) => PERF_STATUSES.has(c.status));
  const perfIdSet = new Set(perfCompanyRows.map((c) => c.id));
  const perfEventsByCompany = new Map<string, PartnerPerformanceEventRow[]>();
  for (const e of eventRows) {
    if (e.event_type !== "detail_view" && e.event_type !== "contact_click") continue;
    if (!perfIdSet.has(e.company_id)) continue;
    const list = perfEventsByCompany.get(e.company_id) ?? [];
    list.push({
      company_id: e.company_id,
      event_type: e.event_type,
      created_at: e.created_at,
    });
    perfEventsByCompany.set(e.company_id, list);
  }

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-slate-900">협력센터 관리</h1>
            <p className="text-sm text-slate-600">업체 등록·수정, 업종/지역, 포트폴리오, 문의 이벤트를 한곳에서 관리합니다.</p>
          </div>
          <Link href="/partners" className="text-sm font-medium text-emerald-700 underline">
            공개 협력센터
          </Link>
        </div>
        <AdminPartnersTabNav active={tab} />
      </header>

      {tab === "register" ? (
        <div className="space-y-6">
          <PartnerCompanyForm categories={activeCategoryRows} regions={activeRegionRows} />
          <div className="grid gap-4 lg:grid-cols-2">
            <PartnerCategoryManager rows={categoryRows} />
            <PartnerRegionManager rows={regionRows} />
          </div>
        </div>
      ) : null}

      {tab === "manage" ? (
        <div className="space-y-6">
          <section className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">등록 업체(최대 500건 조회)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{companyRows.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">이벤트 로그(최근 샘플)</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{eventRows.length}</p>
              <p className="mt-1 text-[11px] text-slate-400">업체별 문의 건수는 최근 이벤트 기준입니다.</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <p className="text-xs text-slate-500">승인 대기 요청</p>
              <p className="mt-1 text-2xl font-semibold text-slate-900">{pendingRequests.length}</p>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">변경 요청 승인 대기</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingRequests.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">현재 승인 대기 요청이 없습니다.</p>
              ) : (
                pendingRequests.map((req) => {
                  const prices = req.payload?.prices ?? [];
                  return (
                    <div key={req.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_auto]">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-slate-900">
                          {companyNameById.get(req.company_id) ?? req.company_id}
                        </p>
                        <p className="text-xs text-slate-500">요청일: {new Date(req.created_at).toLocaleString("ko-KR")}</p>
                        <p className="text-xs text-slate-500">
                          요청자: {profileById.get(req.requester_user_id) ?? req.requester_user_id.slice(0, 8)}
                        </p>
                        <p className="text-xs text-slate-600">
                          썸네일: {req.payload?.main_image_url ? "변경 요청 있음" : "변경 없음"} / 단가 항목: {prices.length}개
                        </p>
                      </div>
                      <AdminPartnerRequestActions requestId={req.id} />
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">업종/지역 변경 이력</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {masterLogRows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">변경 로그가 없습니다.</p>
              ) : (
                masterLogRows.map((log) => (
                  <div key={log.id} className="px-4 py-3 text-xs text-slate-600">
                    <p>
                      <span className="font-medium text-slate-800">
                        {profileById.get(log.actor_user_id) ?? log.actor_user_id.slice(0, 8)}
                      </span>{" "}
                      · {log.entity_type === "category" ? "업종" : "지역"} · {log.entity_code} · {log.action_type}
                    </p>
                    <p className="text-slate-500">{new Date(log.created_at).toLocaleString("ko-KR")}</p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-base font-semibold text-slate-900">변경 요청 이력 타임라인</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {requestRows.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500">요청 이력이 없습니다.</p>
              ) : (
                requestRows.map((req) => (
                  <div key={`timeline-${req.id}`} className="space-y-1 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">
                        {companyNameById.get(req.company_id) ?? req.company_id}
                      </p>
                      <span
                        className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                          req.status === "approved"
                            ? "bg-emerald-100 text-emerald-700"
                            : req.status === "rejected"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {req.status === "approved" ? "승인" : req.status === "rejected" ? "반려" : "승인대기"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      요청자: {profileById.get(req.requester_user_id) ?? req.requester_user_id.slice(0, 8)} · 요청일:{" "}
                      {new Date(req.created_at).toLocaleString("ko-KR")}
                    </p>
                    <p className="text-xs text-slate-500">
                      검토자: {req.reviewer_user_id ? (profileById.get(req.reviewer_user_id) ?? req.reviewer_user_id.slice(0, 8)) : "-"} · 검토일:{" "}
                      {req.reviewed_at ? new Date(req.reviewed_at).toLocaleString("ko-KR") : "-"}
                    </p>
                    {req.reject_reason ? <p className="text-xs text-rose-700">사유: {req.reject_reason}</p> : null}
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-base font-semibold text-slate-900">업체 목록 · 수정</h2>
            <PartnerCompanyManageList rows={companyRows} eventCountByCompany={eventCountRecord} />
          </section>
        </div>
      ) : null}

      {tab === "performance" ? (
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            <strong>active / paused / pending</strong> 상태 업체만 집계합니다. 협력사 본인 화면은{" "}
            <Link href="/partners/performance" className="font-medium text-emerald-700 underline">
              협력센터 광고 성과
            </Link>
            에서 확인할 수 있습니다.
          </p>
          <AdminPartnerPerformancePanel companies={perfCompanyRows} eventsByCompanyId={perfEventsByCompany} />
        </div>
      ) : null}
    </div>
  );
}
