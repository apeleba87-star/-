import Link from "next/link";

import ModerationSectionTabs from "@/components/admin/ModerationSectionTabs";
import { MAGAM_LISTING_TYPE_LABEL, MAGAM_STATUS_LABEL } from "@/lib/magam/copy";
import {
  MAGAM_REPORT_REASON_LABEL,
  type MagamReportReasonType,
} from "@/lib/magam/report-reasons";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import {
  MagamListingAdminActions,
  MagamReportAdminActions,
} from "./MagamListingAdminActions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ status?: string }>;

const LISTING_SELECT =
  "id, user_id, listing_type, region_gu, body_text, contact_phone, status, share_slug, created_at, admin_closed_at, admin_close_reason";

export default async function AdminMagamListingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const statusFilter = params.status === "closed" ? "closed" : "open";

  const sessionSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await sessionSupabase.auth.getUser();
  const { data: profile } = user
    ? await sessionSupabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  const isAdmin = profile?.role === "admin" || profile?.role === "editor";
  if (!isAdmin) {
    return <p className="text-red-600">관리자만 접근할 수 있습니다.</p>;
  }

  let service;
  try {
    service = createServiceSupabase();
  } catch {
    return (
      <div>
        <ModerationSectionTabs />
        <p className="text-red-600">SUPABASE_SERVICE_ROLE_KEY가 필요합니다.</p>
      </div>
    );
  }

  const [{ data: reports }, { data: listings }] = await Promise.all([
    service
      .from("magam_listing_reports")
      .select(
        `id, listing_id, reason_type, reason_text, status, created_at,
         listing:magam_listings!inner (${LISTING_SELECT})`
      )
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(50),
    service
      .from("magam_listings")
      .select(LISTING_SELECT)
      .eq("status", statusFilter)
      .order("created_at", { ascending: false })
      .limit(80),
  ]);

  const userIds = [
    ...new Set(
      (listings ?? []).map((l) => l.user_id).filter(Boolean)
    ),
  ];
  const { data: suspendedProfiles } = userIds.length
    ? await service.from("profiles").select("id, magam_suspended_at").in("id", userIds)
    : { data: [] as { id: string; magam_suspended_at: string | null }[] };

  const suspendedAtByUser = new Map(
    (suspendedProfiles ?? []).map((p) => [p.id, p.magam_suspended_at as string | null])
  );

  return (
    <div className="space-y-8">
      <ModerationSectionTabs />
      <div>
        <h1 className="text-2xl font-bold text-slate-900">마감링크 공고 관리</h1>
        <p className="mt-1 text-sm text-slate-600">
          신고 검토, 강제 마감·삭제, 이용 정지·해제를 처리합니다.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">
          대기 중 신고 ({reports?.length ?? 0})
        </h2>
        {!reports?.length ? (
          <div className="card">
            <p className="text-sm text-slate-500">대기 중인 신고가 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {reports.map((report) => {
              const listing = Array.isArray(report.listing)
                ? report.listing[0]
                : report.listing;
              const reasonLabel =
                MAGAM_REPORT_REASON_LABEL[report.reason_type as MagamReportReasonType] ??
                report.reason_type;
              return (
                <li key={report.id} className="card flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        {reasonLabel}
                      </span>
                      <span className="text-xs text-slate-500">
                        {new Date(report.created_at).toLocaleString("ko-KR")}
                      </span>
                    </div>
                    {listing ? (
                      <>
                        <p className="mt-2 text-sm font-medium text-slate-900">
                          {MAGAM_LISTING_TYPE_LABEL[listing.listing_type as keyof typeof MAGAM_LISTING_TYPE_LABEL] ?? listing.listing_type}
                          {" · "}
                          {listing.region_gu}
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{listing.body_text}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          연락처 {listing.contact_phone} · slug {listing.share_slug}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">삭제된 공고 (ID: {report.listing_id})</p>
                    )}
                    {report.reason_text ? (
                      <p className="mt-2 text-sm text-slate-700">{report.reason_text}</p>
                    ) : null}
                  </div>
                  <MagamReportAdminActions report={{ ...report, listing }} />
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            {statusFilter === "open" ? "모집 중 공고" : "마감된 공고"}
          </h2>
          <div className="flex gap-2 text-sm">
            <Link
              href="/admin/magam-listings"
              className={`rounded-lg px-3 py-1.5 font-medium ${
                statusFilter === "open"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              모집 중
            </Link>
            <Link
              href="/admin/magam-listings?status=closed"
              className={`rounded-lg px-3 py-1.5 font-medium ${
                statusFilter === "closed"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              마감됨
            </Link>
          </div>
        </div>

        {!listings?.length ? (
          <div className="card">
            <p className="text-sm text-slate-500">표시할 공고가 없습니다.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {listings.map((listing) => {
              const magamSuspendedAt = suspendedAtByUser.get(listing.user_id) ?? null;
              return (
              <li key={listing.id} className="card flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-slate-900 px-2 py-0.5 text-xs font-semibold text-white">
                      {MAGAM_LISTING_TYPE_LABEL[listing.listing_type as keyof typeof MAGAM_LISTING_TYPE_LABEL] ?? listing.listing_type}
                    </span>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {MAGAM_STATUS_LABEL[listing.status as keyof typeof MAGAM_STATUS_LABEL] ?? listing.status}
                    </span>
                    {magamSuspendedAt ? (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                        이용 정지
                      </span>
                    ) : null}
                    <span className="text-xs text-slate-500">
                      {new Date(listing.created_at).toLocaleString("ko-KR")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-medium text-slate-900">{listing.region_gu}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">{listing.body_text}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    연락처 {listing.contact_phone} · user {listing.user_id.slice(0, 8)}…
                    {magamSuspendedAt
                      ? ` · 정지 ${new Date(magamSuspendedAt).toLocaleString("ko-KR")}`
                      : null}
                  </p>
                  {listing.admin_close_reason ? (
                    <p className="mt-2 text-xs text-amber-800">
                      운영자 사유: {listing.admin_close_reason}
                    </p>
                  ) : null}
                </div>
                <MagamListingAdminActions
                  listing={listing}
                  magamSuspendedAt={magamSuspendedAt}
                />
              </li>
            );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
