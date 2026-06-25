import Link from "next/link";
import { redirect } from "next/navigation";

import { MagamPageHeader, MagamSectionCard } from "@/components/magam/ui/MagamUi";
import { MAGAM_LISTING_TYPE_LABEL } from "@/lib/magam/copy";
import { formatMagamWhen } from "@/lib/format/kr-datetime";
import {
  MAGAM_REPORT_REASON_LABEL,
  MAGAM_REPORT_STATUS_LABEL,
  type MagamReportReasonType,
} from "@/lib/magam/report-reasons";
import { magamPublicListingHref } from "@/lib/magam/back-href";
import { getMagamSession } from "@/lib/magam/session";
import type { MagamListingPublic } from "@/lib/magam/types";
import { createClient, createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

export const metadata = { title: "내 신고 내역" };
export const dynamic = "force-dynamic";

type ReportRow = {
  id: string;
  listing_id: string;
  reason_type: string;
  reason_text: string | null;
  status: "pending" | "dismissed" | "actioned";
  admin_note: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type Props = {
  searchParams: Promise<{ claim?: string }>;
};

export default async function MagamReportsPage({ searchParams }: Props) {
  const { claim } = await searchParams;
  const { user } = await getMagamSession();
  const reportsPath = claim ? `/magam/reports?claim=${encodeURIComponent(claim)}` : "/magam/reports";
  if (!user) redirect(`/login?from=magam&next=${encodeURIComponent(reportsPath)}`);

  const supabase = await createServerSupabase();
  let claimedCount = 0;

  const claimToken = claim?.trim();
  if (claimToken && claimToken.length >= 32) {
    const { data: claimedReports } = await createServiceSupabase()
      .from("magam_listing_reports")
      .update({
        reporter_id: user.id,
        claimed_at: new Date().toISOString(),
      })
      .eq("claim_token", claimToken)
      .is("reporter_id", null)
      .select("id");
    claimedCount = claimedReports?.length ?? 0;
  }

  const { data: reports } = await supabase
    .from("magam_listing_reports")
    .select("id, listing_id, reason_type, reason_text, status, admin_note, reviewed_at, created_at")
    .eq("reporter_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const reportRows = ((reports as ReportRow[] | null) ?? []);
  const listingIds = [...new Set(reportRows.map((report) => report.listing_id))];
  const publicSupabase = createClient();
  const { data: listings } = listingIds.length
    ? await publicSupabase
        .from("magam_listings_public")
        .select("id, listing_type, region_gu, body_text, status, share_slug, created_at")
        .in("id", listingIds)
    : { data: [] };

  const listingById = new Map(
    ((listings as Pick<
      MagamListingPublic,
      "id" | "listing_type" | "region_gu" | "body_text" | "status" | "share_slug" | "created_at"
    >[] | null) ?? []).map((listing) => [listing.id, listing])
  );

  return (
    <>
      <MagamPageHeader title="내 신고 내역" />
      <p className="mb-4 text-[13px] leading-relaxed text-[#5B6472]">
        내가 접수한 공고 신고와 운영자 처리 상태를 확인할 수 있습니다.
      </p>
      {claimedCount > 0 ? (
        <MagamSectionCard>
          <p className="text-sm font-semibold text-[#141824]">신고가 내 계정에 연결되었습니다.</p>
          <p className="mt-1 text-xs text-[#5B6472]">이제 이 페이지에서 처리 상태를 확인할 수 있습니다.</p>
        </MagamSectionCard>
      ) : null}

      {reportRows.length === 0 ? (
        <MagamSectionCard>
          <p className="text-sm text-[#5B6472]">접수한 신고가 없습니다.</p>
        </MagamSectionCard>
      ) : (
        <ul className="space-y-3">
          {reportRows.map((report) => {
            const listing = listingById.get(report.listing_id);
            const reasonLabel =
              MAGAM_REPORT_REASON_LABEL[report.reason_type as MagamReportReasonType] ??
              report.reason_type;
            return (
              <li key={report.id}>
                <MagamSectionCard>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                      {MAGAM_REPORT_STATUS_LABEL[report.status]}
                    </span>
                    <span className="text-xs text-[#8B93A1]">
                      신고 {formatMagamWhen(report.created_at)}
                    </span>
                  </div>

                  {listing ? (
                    <>
                      <p className="mt-3 text-[15px] font-semibold text-[#141824]">
                        {MAGAM_LISTING_TYPE_LABEL[listing.listing_type]} · {listing.region_gu}
                      </p>
                      <p className="mt-1 line-clamp-2 text-sm text-[#5B6472]">
                        {listing.body_text}
                      </p>
                      <Link
                        href={magamPublicListingHref(listing.share_slug, { from: "settings" })}
                        className="mt-3 inline-flex rounded-lg border border-[#E3E6EC] px-3 py-1.5 text-xs font-semibold text-[#141824]"
                      >
                        공고 보기
                      </Link>
                    </>
                  ) : (
                    <p className="mt-3 text-sm text-[#5B6472]">삭제되었거나 확인할 수 없는 공고입니다.</p>
                  )}

                  <div className="mt-3 rounded-xl bg-[#F2F3F6] px-3 py-2 text-xs leading-relaxed text-[#5B6472]">
                    <p>신고 사유: {reasonLabel}</p>
                    {report.reason_text ? <p className="mt-1">내 설명: {report.reason_text}</p> : null}
                    {report.status === "pending" ? (
                      <p className="mt-1">운영자가 검토 중입니다.</p>
                    ) : report.status === "actioned" ? (
                      <p className="mt-1">신고 검토 후 운영자 조치가 완료되었습니다.</p>
                    ) : (
                      <p className="mt-1">검토 결과 조치하지 않기로 처리되었습니다.</p>
                    )}
                    {report.admin_note ? <p className="mt-1">처리 메모: {report.admin_note}</p> : null}
                    {report.reviewed_at ? (
                      <p className="mt-1">처리 일시: {formatMagamWhen(report.reviewed_at)}</p>
                    ) : null}
                  </div>
                </MagamSectionCard>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
