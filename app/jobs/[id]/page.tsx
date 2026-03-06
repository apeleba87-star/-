import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { PayUnit } from "@/lib/jobs/types";
import { POSITION_STATUS_LABELS } from "@/lib/jobs/types";
import MarketComparisonBox from "@/components/listings/MarketComparisonBox";
import ContactButtons from "@/components/listings/ContactButtons";
import JobPostOwnerActions from "@/components/jobs/JobPostOwnerActions";

export const revalidate = 60;

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
  const isOwner = user != null && post.user_id === user.id;

  const { data: positions } = await supabase
    .from("job_post_positions")
    .select("*")
    .eq("job_post_id", id)
    .order("sort_order", { ascending: true });

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
        .eq("pay_unit", pos.pay_unit);
      q = pos.category_sub_id ? q.eq("category_sub_id", pos.category_sub_id) : q.is("category_sub_id", null);
      const { data } = await q.maybeSingle();
      return { positionId: pos.id, data };
    })
  );

  const benchmarkByPosId = new Map(benchmarks.map((b) => [b.positionId, b.data]));

  const displayTitle = post.status === "closed" ? `마감)) ${post.title}` : post.title;
  const regionDisplay = post.district ? `${post.region} ${post.district}` : post.region;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/jobs" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 목록
      </Link>

      <article className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-slate-900">{displayTitle}</h1>
          <p className="mt-1 text-sm text-slate-500">
            {regionDisplay}
            {post.work_date && (
              <span className="ml-2">
                · {new Date(post.work_date).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" })}
              </span>
            )}
            {post.start_time != null && post.end_time != null && (
              <span className="ml-2">
                · {String(post.start_time).slice(0, 5)} ~ {String(post.end_time).slice(0, 5)}
              </span>
            )}
          </p>
        </header>

        <ContactButtons phone={post.contact_phone} />

        {isOwner && (
          <JobPostOwnerActions
            jobPostId={id}
            positions={(positions ?? []).map((p) => ({
              id: p.id,
              filled_count: p.filled_count,
              required_count: p.required_count,
              status: p.status,
            }))}
          />
        )}

        {post.description && (
          <section className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-800">현장 설명</h2>
            <div className="mt-3 whitespace-pre-wrap text-sm text-slate-700">{post.description}</div>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold text-slate-800">모집 포지션</h2>
          <ul className="space-y-6">
            {(positions ?? []).map((pos) => {
              const bench = benchmarkByPosId.get(pos.id);
              const categorySubName = pos.category_sub_id ? categoryMap.get(pos.category_sub_id) : null;
              const categoryMainName = categoryMap.get(pos.category_main_id);
              const posCategoryDisplay =
                pos.custom_subcategory_text?.trim() ||
                categorySubName ||
                categoryMainName ||
                "—";
              const normalizedDaily =
                pos.normalized_daily_wage != null
                  ? Number(pos.normalized_daily_wage)
                  : pos.pay_unit === "day"
                  ? Number(pos.pay_amount)
                  : pos.pay_unit === "half_day"
                  ? Number(pos.pay_amount) * 2
                  : Number(pos.pay_amount) * 8;
              const payUnitLabel = PAY_UNIT_LABELS[pos.pay_unit as PayUnit];

              return (
                <li
                  key={pos.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-900">
                      {posCategoryDisplay} · {pos.required_count}명 모집
                      {pos.filled_count > 0 && (
                        <span className="ml-2 text-slate-500">
                          (충원 {pos.filled_count}명)
                        </span>
                      )}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-sm font-medium ${
                        pos.status === "closed"
                          ? "bg-slate-200 text-slate-600"
                          : pos.status === "partial"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {POSITION_STATUS_LABELS[pos.status]}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600">
                    {payUnitLabel} {Number(pos.pay_amount).toLocaleString("ko-KR")}원
                    {pos.work_scope && ` · ${pos.work_scope}`}
                  </p>
                  {pos.notes && (
                    <p className="mt-1 text-sm text-slate-500">{pos.notes}</p>
                  )}
                  <div className="mt-4">
                    <MarketComparisonBox
                      currentPay={normalizedDaily}
                      averagePay={bench?.average_normalized_daily_wage ?? null}
                      sampleCount={bench?.sample_count ?? 0}
                      payUnitLabel={payUnitLabel}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </article>
    </div>
  );
}
