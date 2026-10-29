import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import CancelAiBlogSubscriptionButton from "@/app/ai-blog/subscribe/CancelAiBlogSubscriptionButton";
import { computeAccess, SITE_ADMIN_ACCESS, type AccessRow } from "@/lib/ai-blog/access";
import { glassCard } from "@/lib/ui-styles";

export const dynamic = "force-dynamic";

type AiBlogSubRow = {
  status: string | null;
  next_billing_at: string | null;
  amount_cents: number | null;
  promo_remaining_months: number | null;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default async function MyPageAiBlogPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/mypage/ai-blog");

  const [{ data: aiAccessRow }, { data: siteProfile }, { data: aiSub }] = await Promise.all([
    supabase
      .schema("cleanidex")
      .from("ai_blog_access")
      .select("plan_code, status, expires_on")
      .eq("user_id", user.id)
      .maybeSingle<AccessRow>(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string | null }>(),
    supabase
      .from("ai_blog_subscriptions")
      .select("status, next_billing_at, amount_cents, promo_remaining_months")
      .eq("user_id", user.id)
      .maybeSingle<AiBlogSubRow>(),
  ]);

  const aiAccess = siteProfile?.role === "admin" ? SITE_ADMIN_ACCESS : computeAccess(aiAccessRow ?? null);
  const nextDate = formatDate(aiSub?.next_billing_at ?? null);
  const isSubActive = aiSub?.status === "active";
  const isSubCancelled = aiSub?.status === "cancelled";
  const isPastDue = aiSub?.status === "past_due";

  const accessLine =
    aiAccess.state === "none"
      ? "사용 권한 없음"
      : !aiAccess.expires_on
        ? "관리자 계정 · 기간 제한 없음"
        : `${aiAccess.state === "suspended" ? "사용 정지" : aiAccess.state === "expired" ? "이용 기간 만료" : "이용 기간"} ~ ${aiAccess.expires_on}`;

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/mypage" className="hover:underline">
          마이페이지
        </Link>
        <span className="mx-1.5">/</span>
        AI 블로그
      </p>
      <h1 className="text-2xl font-bold text-slate-900">AI 블로그</h1>
      <p className="mt-1 mb-6 text-sm text-slate-600">
        이용 상태와 구독을 관리합니다. 구독 해지는 이 화면에서만 할 수 있습니다.
      </p>

      <section className={`${glassCard} mb-5 p-5`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900">이용</p>
            <p className={`mt-1 text-sm ${aiAccess.state === "active" ? "text-slate-600" : "font-medium text-rose-600"}`}>
              {accessLine}
            </p>
          </div>
          <Link
            href="/ai-blog"
            className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            바로가기
          </Link>
        </div>
      </section>

      <section className={`${glassCard} p-5`}>
        <p className="text-sm font-semibold text-slate-900">구독</p>

        {isSubActive && (
          <div className="mt-3 space-y-4">
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">상태</dt>
                <dd className="font-medium text-slate-900">구독 중</dd>
              </div>
              {nextDate ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">다음 결제일</dt>
                  <dd className="font-medium text-slate-900">{nextDate}</dd>
                </div>
              ) : null}
              {aiSub?.promo_remaining_months != null && aiSub.promo_remaining_months > 0 ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">특가 잔여</dt>
                  <dd className="font-medium text-slate-900">{aiSub.promo_remaining_months}개월</dd>
                </div>
              ) : null}
              {aiSub?.amount_cents != null ? (
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">이후 월 금액</dt>
                  <dd className="font-medium text-slate-900">
                    {aiSub.amount_cents.toLocaleString("ko-KR")}원
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="mb-2 text-xs text-slate-600">
                해지해도 이미 결제한 기간까지는 이용되며, 환불은 되지 않습니다. 다음 결제일부터 청구가
                중단됩니다.
              </p>
              <CancelAiBlogSubscriptionButton />
            </div>
            <Link href="/ai-blog/subscribe" className="text-sm font-medium text-emerald-800 hover:underline">
              구독 상세 보기
            </Link>
          </div>
        )}

        {isSubCancelled && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-800">
              해지 예정
              {nextDate ? ` · ${nextDate}까지 이용 가능` : null}
            </p>
            <Link
              href="/ai-blog/subscribe?resume=1"
              className="inline-flex rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              다시 구독하기
            </Link>
          </div>
        )}

        {isPastDue && (
          <div className="mt-3 space-y-3">
            <p className="text-sm font-medium text-amber-800">결제에 실패했습니다. 카드를 다시 등록해 주세요.</p>
            <Link
              href="/ai-blog/subscribe"
              className="inline-flex rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
            >
              다시 결제하기
            </Link>
          </div>
        )}

        {!isSubActive && !isSubCancelled && !isPastDue && (
          <div className="mt-3 space-y-3">
            <p className="text-sm text-slate-600">구독 중이 아닙니다.</p>
            <Link
              href="/ai-blog/subscribe"
              className="inline-flex rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              구독하기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
