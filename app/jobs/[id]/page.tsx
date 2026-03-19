import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { PayUnit, PositionStatus } from "@/lib/jobs/types";
import { POSITION_STATUS_LABELS } from "@/lib/jobs/types";
import { glassCard } from "@/lib/ui-styles";
import MarketComparisonBox from "@/components/listings/MarketComparisonBox";
import ContactButtons from "@/components/listings/ContactButtons";
import ApplicationList, { type ApplicantRow } from "@/components/jobs/ApplicationList";
import { getKstTodayString } from "@/lib/jobs/kst-date";
import ApplySection from "@/components/jobs/ApplySection";
import JobPostPrivateDetails from "@/components/jobs/JobPostPrivateDetails";
import JobPostOwnerActions from "@/components/jobs/JobPostOwnerActions";
import NoShowAppealBlock from "@/components/jobs/NoShowAppealBlock";

export const revalidate = 60;

const REPORT_PERIOD_DAYS = 30;

export default async function JobPostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = createClient();
  const { data: post, error: postError } = await supabase
    .from("job_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (postError || !post) notFound();

  const authSupabase = await createServerSupabase();
  const { data: { user } } = await authSupabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/jobs/${id}`)}`);
  }
  const isOwner = post.user_id === user.id;

  const { data: positions } = await supabase
    .from("job_post_positions")
    .select("*")
    .eq("job_post_id", id)
    .order("sort_order", { ascending: true });

  const positionIds = (positions ?? []).map((p) => p.id);

  const { data: applications } = await authSupabase
    .from("job_applications")
    .select("id, position_id, user_id, status")
    .in("position_id", positionIds.length ? positionIds : ["00000000-0000-0000-0000-000000000000"]);

  const applicantUserIds = [...new Set((applications ?? []).map((a) => a.user_id))];
  const { data: workerProfiles } = await supabase
    .from("worker_profiles")
    .select("user_id, nickname, birth_date, gender, bio, contact_phone")
    .in("user_id", applicantUserIds.length ? applicantUserIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileByUser = new Map((workerProfiles ?? []).map((p) => [p.user_id, p]));

  // 확정된 지원자의 연락처·이메일: 구인자만 조회 가능(RLS). authSupabase로 요청해야 함.
  let applicantContactByUser = new Map<string, { email: string | null; phone: string | null }>();
  if (isOwner && applicantUserIds.length > 0) {
    const { data: applicantProfiles } = await authSupabase
      .from("profiles")
      .select("id, email, phone")
      .in("id", applicantUserIds);
    applicantContactByUser = new Map(
      (applicantProfiles ?? []).map((p) => [
        p.id,
        { email: p.email ?? null, phone: p.phone ?? null },
      ])
    );
  }

  const since = new Date();
  since.setDate(since.getDate() - REPORT_PERIOD_DAYS);
  const sinceIso = since.toISOString();
  const applicantIdsForReport = applicantUserIds.length ? applicantUserIds : ["00000000-0000-0000-0000-000000000000"];

  const { data: reports } = await supabase
    .from("job_reports")
    .select("reported_user_id")
    .in("reported_user_id", applicantIdsForReport)
    .gte("created_at", sinceIso)
    .neq("status", "rescinded");

  const reportCountByUser = new Map<string, number>();
  for (const r of reports ?? []) {
    reportCountByUser.set(r.reported_user_id, (reportCountByUser.get(r.reported_user_id) ?? 0) + 1);
  }

  const { data: noShowReports } = await supabase
    .from("job_reports")
    .select("reported_user_id")
    .eq("reason_type", "no_show")
    .in("reported_user_id", applicantIdsForReport)
    .gte("created_at", sinceIso)
    .neq("status", "rescinded");

  const noShowCountByUser = new Map<string, number>();
  for (const r of noShowReports ?? []) {
    noShowCountByUser.set(r.reported_user_id, (noShowCountByUser.get(r.reported_user_id) ?? 0) + 1);
  }

  const applicationsByPosition = new Map<string, typeof applications>();
  for (const a of applications ?? []) {
    const list = applicationsByPosition.get(a.position_id) ?? [];
    list.push(a);
    applicationsByPosition.set(a.position_id, list);
  }

  const myApplicationByPosition = user
    ? new Map(
        (applications ?? []).filter((a) => a.user_id === user.id).map((a) => [a.position_id, a])
      )
    : new Map();

  const myNoShowAppIds =
    user && applications
      ? applications.filter((a) => a.user_id === user.id && a.status === "no_show_reported").map((a) => a.id)
      : [];
  const { data: myNoShowReports } =
    myNoShowAppIds.length > 0
      ? await authSupabase
          .from("job_reports")
          .select("id, job_application_id, appealed_at")
          .eq("reason_type", "no_show")
          .eq("status", "open")
          .in("job_application_id", myNoShowAppIds)
      : { data: [] };
  const reportByApplicationId = new Map<string, { reportId: string; appealedAt: string | null }>();
  for (const r of myNoShowReports ?? []) {
    reportByApplicationId.set(r.job_application_id, {
      reportId: r.id,
      appealedAt: r.appealed_at ?? null,
    });
  }

  const isAcceptedForThisPost =
    user &&
    (applications ?? []).some((a) => a.user_id === user.id && a.status === "accepted");

  const { data: myWorker } =
    user && !isOwner
      ? await authSupabase
          .from("worker_profiles")
          .select("nickname, birth_date, gender, contact_phone")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
  const workerProfileComplete =
    (myWorker?.nickname ?? "").trim() !== "" &&
    myWorker?.birth_date != null &&
    String(myWorker.birth_date).trim() !== "" &&
    myWorker?.gender != null &&
    (myWorker.gender === "M" || myWorker.gender === "F") &&
    (myWorker?.contact_phone ?? "").trim() !== "";

  const { data: privateDetails } = await authSupabase
    .from("job_post_private_details")
    .select("full_address, contact_phone, access_instructions, parking_info, notes")
    .eq("job_post_id", id)
    .maybeSingle();
  const { data: categories } = await supabase.from("categories").select("id, name").in("usage", ["job", "default"]);
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const regionFull = [post.region, post.district].filter(Boolean).join(" ").trim() || post.region;

  const { data: benchmarkRows } =
    (positions ?? []).length > 0
      ? await supabase
          .from("market_benchmarks")
          .select("category_main_id, category_sub_id, pay_unit, skill_level, sample_count, average_pay, average_normalized_daily_wage")
          .eq("region", regionFull)
      : { data: [] };

  const benchmarkKey = (mainId: string, subId: string | null, unit: string, level: string) =>
    `${mainId}|${subId ?? ""}|${unit}|${level ?? ""}`;
  const benchmarkByKey = new Map(
    (benchmarkRows ?? []).map((r) => [
      benchmarkKey(r.category_main_id, r.category_sub_id ?? null, r.pay_unit, r.skill_level ?? ""),
      {
        sample_count: r.sample_count,
        average_pay: r.average_pay,
        average_normalized_daily_wage: r.average_normalized_daily_wage,
      },
    ])
  );
  const benchmarkByPosId = new Map(
    (positions ?? []).map((pos) => [
      pos.id,
      benchmarkByKey.get(
        benchmarkKey(
          pos.category_main_id,
          pos.category_sub_id ?? null,
          pos.pay_unit,
          pos.skill_level ?? ""
        )
      ) ?? null,
    ])
  );

  const displayTitle = post.status === "closed" ? `(마감) ${post.title}` : post.title;
  const regionDisplay = post.district ? `${post.region} ${post.district}` : post.region;

  type AppRow = NonNullable<typeof applications>[number];
  function toApplicantRow(a: AppRow): ApplicantRow {
    const profile = profileByUser.get(a.user_id);
    const contact = applicantContactByUser.get(a.user_id);
    return {
      applicationId: a.id,
      userId: a.user_id,
      status: a.status as ApplicantRow["status"],
      nickname: profile?.nickname ?? "",
      birthYear: profile?.birth_date
        ? new Date(profile.birth_date + "T12:00:00").getFullYear()
        : null,
      gender: profile?.gender ?? null,
      bio: profile?.bio ?? null,
      reportCountInPeriod: reportCountByUser.get(a.user_id) ?? 0,
      noShowCountInPeriod: noShowCountByUser.get(a.user_id) ?? 0,
      // 확정된 지원자만 구인자에게 노출(RLS로 accepted만 조회됨)
      contactPhone: contact?.phone ?? profile?.contact_phone ?? null,
      contactEmail: contact?.email ?? null,
    };
  }

  const workDateFormatted = post.work_date
    ? new Date(post.work_date + "T12:00:00").toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <span aria-hidden>←</span> 목록
      </Link>

      <article className="space-y-6">
        <header className={`${glassCard} p-6`}>
          <h1 className="text-xl font-bold leading-tight text-slate-900 sm:text-2xl">{displayTitle}</h1>
          <dl className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div className="flex items-baseline gap-1.5">
              <dt className="text-slate-500">지역</dt>
              <dd className="font-medium text-slate-800">{regionDisplay}</dd>
            </div>
            {post.address?.trim() && (
              <div className="w-full flex gap-1.5 sm:w-auto">
                <dt className="text-slate-500 shrink-0">현장 주소</dt>
                <dd className="font-medium text-slate-800">{post.address.trim()}</dd>
              </div>
            )}
            {workDateFormatted && (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-slate-500">작업일</dt>
                <dd className="font-medium text-slate-800">{workDateFormatted}</dd>
              </div>
            )}
            {post.start_time != null && post.end_time != null && (
              <div className="flex items-baseline gap-1.5">
                <dt className="text-slate-500">시간</dt>
                <dd className="font-medium text-slate-800">
                  {String(post.start_time).slice(0, 5)} ~ {String(post.end_time).slice(0, 5)}
                </dd>
              </div>
            )}
          </dl>
          {!isOwner && (
            <div className="mt-5">
              <ContactButtons
                phone={post.contact_phone}
                disabled={!isAcceptedForThisPost}
              />
            </div>
          )}
        </header>

        {(post as { is_external?: boolean }).is_external && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800" role="alert">
            이 글은 외부 커뮤니티에서 가져온 정보입니다. 참여 전 반드시 <strong>직접 연락하여</strong> 내용을 확인하세요.
          </div>
        )}

        {isOwner && (
          <JobPostOwnerActions jobPostId={id} isClosed={post.status === "closed"} />
        )}

        {isAcceptedForThisPost && privateDetails && (
          <JobPostPrivateDetails
            fullAddress={privateDetails.full_address}
            contactPhone={privateDetails.contact_phone}
            accessInstructions={privateDetails.access_instructions}
            parkingInfo={privateDetails.parking_info}
            notes={privateDetails.notes}
          />
        )}

        {post.description && (
          <section className={`${glassCard} p-5`}>
            <h2 className="text-base font-semibold text-slate-800">현장 설명</h2>
            <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{post.description}</div>
          </section>
        )}

        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-800">모집 포지션</h2>
          <ul className="space-y-4">
            {(positions ?? []).map((pos) => {
              const bench = benchmarkByPosId.get(pos.id);
              const categorySubName = pos.category_sub_id ? categoryMap.get(pos.category_sub_id) : null;
              const categoryMainName = categoryMap.get(pos.category_main_id);
              const jobLabel =
                (pos.job_type_input && pos.job_type_input.trim()) ||
                pos.custom_subcategory_text?.trim() ||
                categorySubName ||
                categoryMainName ||
                "—";
              const skillLabel = pos.skill_level === "expert" ? "숙련자(기공)" : pos.skill_level === "general" ? "일반(보조)" : "";
              const posCategoryDisplay = skillLabel ? `${jobLabel} / ${skillLabel}` : jobLabel;
              const normalizedDaily =
                pos.normalized_daily_wage != null
                  ? Number(pos.normalized_daily_wage)
                  : pos.pay_unit === "day"
                  ? Number(pos.pay_amount)
                  : pos.pay_unit === "half_day"
                  ? Number(pos.pay_amount) * 2
                  : Number(pos.pay_amount) * 8;
              const payUnitLabel = PAY_UNIT_LABELS[pos.pay_unit as PayUnit];
              const posApps = applicationsByPosition.get(pos.id) ?? [];
              const applicantRows = posApps.map(toApplicantRow);
              const myApp = myApplicationByPosition.get(pos.id);
              const alreadyApplied = !!myApp && myApp.status !== "cancelled" && myApp.status !== "rejected";

              return (
                <li key={pos.id} className={`${glassCard} p-5`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-base font-semibold text-slate-900">
                      {posCategoryDisplay}
                      <span className="ml-1.5 font-medium text-slate-600">· {pos.required_count}명 모집</span>
                      {pos.filled_count > 0 && (
                        <span className="ml-1.5 text-slate-500">(충원 {pos.filled_count}명)</span>
                      )}
                      <span className="ml-1.5 text-slate-500">· {posApps.length}명 지원</span>
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        pos.status === "closed"
                          ? "bg-slate-200 text-slate-600"
                          : pos.status === "partial"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {POSITION_STATUS_LABELS[(pos.status ?? "open") as PositionStatus]}
                    </span>
                  </div>
                  <dl className="mt-3 space-y-0.5 text-sm">
                    <div className="flex flex-wrap items-baseline gap-1.5">
                      <dt className="text-slate-500">급여</dt>
                      <dd className="font-semibold text-slate-900">
                        {payUnitLabel} {Number(pos.pay_amount).toLocaleString("ko-KR")}원
                        {pos.work_scope && <span className="font-normal text-slate-600"> · {pos.work_scope}</span>}
                      </dd>
                    </div>
                    {pos.notes && (
                      <div className="flex gap-1.5 pt-1">
                        <dt className="text-slate-500 shrink-0">비고</dt>
                        <dd className="text-slate-600">{pos.notes}</dd>
                      </div>
                    )}
                  </dl>
                  <div className="mt-4 rounded-xl border border-slate-200/80 bg-white/50 p-4">
                    <MarketComparisonBox
                      currentPay={normalizedDaily}
                      averagePay={bench?.average_normalized_daily_wage ?? null}
                      sampleCount={bench?.sample_count ?? 0}
                      payUnitLabel={payUnitLabel}
                    />
                  </div>

                  {isOwner && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <ApplicationList
                        jobPostId={id}
                        positionId={pos.id}
                        positionLabel={posCategoryDisplay}
                        requiredCount={pos.required_count}
                        applicants={applicantRows}
                        allowCancelConfirm={!post.work_date || post.work_date >= getKstTodayString()}
                      />
                    </div>
                  )}

                  {!isOwner && user && pos.status !== "closed" && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {(() => {
                        const myApp = myApplicationByPosition.get(pos.id);
                        const appealData = myApp ? reportByApplicationId.get(myApp.id) : null;
                        const showAppeal = myApp?.status === "no_show_reported" && appealData;
                        return (
                          <>
                            {showAppeal && (
                              <NoShowAppealBlock
                                reportId={appealData.reportId}
                                appealedAt={appealData.appealedAt}
                              />
                            )}
                            <ApplySection
                              positionId={pos.id}
                              jobPostId={id}
                              disabled={post.status === "closed"}
                              alreadyApplied={alreadyApplied}
                              workerProfileComplete={workerProfileComplete}
                              initialWorker={{
                                nickname: myWorker?.nickname ?? "",
                                birth_date: myWorker?.birth_date ?? null,
                                gender: myWorker?.gender ?? null,
                                contact_phone: myWorker?.contact_phone ?? null,
                              }}
                            />
                          </>
                        );
                      })()}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      </article>
    </div>
  );
}
