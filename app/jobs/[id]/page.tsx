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
import ApplyButton from "@/components/jobs/ApplyButton";
import JobPostPrivateDetails from "@/components/jobs/JobPostPrivateDetails";
import JobPostOwnerActions from "@/components/jobs/JobPostOwnerActions";

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
    .select("user_id, nickname, birth_year, gender, bio")
    .in("user_id", applicantUserIds.length ? applicantUserIds : ["00000000-0000-0000-0000-000000000000"]);

  const profileByUser = new Map((workerProfiles ?? []).map((p) => [p.user_id, p]));

  const since = new Date();
  since.setDate(since.getDate() - REPORT_PERIOD_DAYS);
  const sinceIso = since.toISOString();
  const { data: reports } = await supabase
    .from("job_reports")
    .select("reported_user_id")
    .in("reported_user_id", applicantUserIds.length ? applicantUserIds : ["00000000-0000-0000-0000-000000000000"])
    .gte("created_at", sinceIso)
    .neq("status", "rescinded");

  const reportCountByUser = new Map<string, number>();
  for (const r of reports ?? []) {
    reportCountByUser.set(r.reported_user_id, (reportCountByUser.get(r.reported_user_id) ?? 0) + 1);
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

  const isAcceptedForThisPost =
    user &&
    (applications ?? []).some((a) => a.user_id === user.id && a.status === "accepted");

  const { data: myWorker } =
    user && !isOwner
      ? await authSupabase
          .from("worker_profiles")
          .select("birth_year, gender")
          .eq("user_id", user.id)
          .maybeSingle()
      : { data: null };
  const workerProfileComplete =
    myWorker?.birth_year != null &&
    myWorker.birth_year >= 1900 &&
    myWorker.birth_year <= 2100 &&
    myWorker.gender != null &&
    String(myWorker.gender).trim() !== "";

  const { data: privateDetails } = await supabase
    .from("job_post_private_details")
    .select("full_address, contact_phone, access_instructions, parking_info, notes")
    .eq("job_post_id", id)
    .maybeSingle();
  const { data: categories } = await supabase.from("categories").select("id, name");
  const categoryMap = new Map((categories ?? []).map((c) => [c.id, c.name]));

  const regionFull = [post.region, post.district].filter(Boolean).join(" ").trim() || post.region;

  const benchmarks = await Promise.all(
    (positions ?? []).map(async (pos) => {
      let q = supabase
        .from("market_benchmarks")
        .select("sample_count, average_pay, average_normalized_daily_wage")
        .eq("region", regionFull)
        .eq("category_main_id", pos.category_main_id)
        .eq("pay_unit", pos.pay_unit)
        .eq("skill_level", pos.skill_level ?? "");
      q = pos.category_sub_id ? q.eq("category_sub_id", pos.category_sub_id) : q.is("category_sub_id", null);
      const { data } = await q.maybeSingle();
      return { positionId: pos.id, data };
    })
  );

  const benchmarkByPosId = new Map(benchmarks.map((b) => [b.positionId, b.data]));

  const displayTitle = post.status === "closed" ? `(마감) ${post.title}` : post.title;
  const regionDisplay = post.district ? `${post.region} ${post.district}` : post.region;

  type AppRow = NonNullable<typeof applications>[number];
  function toApplicantRow(a: AppRow): ApplicantRow {
    const profile = profileByUser.get(a.user_id);
    return {
      applicationId: a.id,
      userId: a.user_id,
      status: a.status as ApplicantRow["status"],
      nickname: profile?.nickname ?? "",
      birthYear: profile?.birth_year ?? null,
      gender: profile?.gender ?? null,
      bio: profile?.bio ?? null,
      reportCountInPeriod: reportCountByUser.get(a.user_id) ?? 0,
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
          <div className="mt-5">
            <ContactButtons
              phone={post.contact_phone}
              disabled={!isOwner && !isAcceptedForThisPost}
            />
          </div>
        </header>

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
                      />
                    </div>
                  )}

                  {!isOwner && user && pos.status !== "closed" && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      {!workerProfileComplete && (
                        <div className="mb-3 rounded-xl border border-amber-200/80 bg-amber-50/80 p-3 text-sm text-amber-900">
                          <p>
                            지원하려면 <Link href="/mypage" className="font-medium underline underline-offset-2">마이페이지</Link>에서 <strong>나이(출생년도)</strong>와 <strong>성별</strong>을 먼저 입력해 주세요.
                          </p>
                          <p className="mt-1 text-xs text-amber-800">
                            잘못 입력된 정보로 인한 피해는 본인이 책임지셔야 합니다.
                          </p>
                        </div>
                      )}
                      <ApplyButton
                        positionId={pos.id}
                        jobPostId={id}
                        disabled={post.status === "closed" || !workerProfileComplete}
                        alreadyApplied={alreadyApplied}
                      />
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
