import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { createServerSupabase } from "@/lib/supabase-server";
import { isBootpayConfigured } from "@/lib/bootpay-server";
import {
  getAiBlogAmountCents,
  getAiBlogPromoConfig,
  isAiBlogPromoActive,
} from "@/lib/ai-blog/billing-settings";
import { computeAccess, SITE_ADMIN_ACCESS, type AccessRow } from "@/lib/ai-blog/access";
import AiBlogSubscribeCheckout from "./AiBlogSubscribeCheckout";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type SubRow = {
  status: string;
  next_billing_at: string | null;
  amount_cents: number | null;
  promo_remaining_months: number | null;
  promo_months: number | null;
};

function first(v: string | string[] | undefined): string | null {
  if (Array.isArray(v)) return v[0] ?? null;
  return v ?? null;
}

function formatBillingDate(iso: string | null): string {
  if (!iso) return "—";
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

export default async function AiBlogSubscribePage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ai-blog/subscribe");

  const applicationId = process.env.NEXT_PUBLIC_BOOTPAY_APPLICATION_ID ?? "";
  const bootpayOk = isBootpayConfigured() && Boolean(applicationId);

  const [amountCents, promo, { data: sub }, { data: accessRow }, { data: siteProfile }] = await Promise.all([
    getAiBlogAmountCents(supabase),
    getAiBlogPromoConfig(supabase),
    supabase
      .from("ai_blog_subscriptions")
      .select("status, next_billing_at, amount_cents, promo_remaining_months, promo_months")
      .eq("user_id", user.id)
      .maybeSingle<SubRow>(),
    supabase
      .schema("cleanidex")
      .from("ai_blog_access")
      .select("plan_code, status, expires_on")
      .eq("user_id", user.id)
      .maybeSingle<AccessRow>(),
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle<{ role: string | null }>(),
  ]);
  const promoActive = isAiBlogPromoActive(promo);
  const access = siteProfile?.role === "admin" ? SITE_ADMIN_ACCESS : computeAccess(accessRow ?? null);

  const redirectReceiptId = first(sp.receipt_id);
  const redirectBillingKey = first(sp.billing_key);
  const redirectEvent = first(sp.event);
  const redirectStatus = first(sp.status);
  const promoMonthsRaw = first(sp.promo_months);
  const redirectPromoMonths = promoMonthsRaw ? Number(promoMonthsRaw) : null;
  const returnNextRaw = first(sp.next);
  const returnNext =
    returnNextRaw && returnNextRaw.startsWith("/ai-blog") && !returnNextRaw.startsWith("//")
      ? returnNextRaw
      : null;

  const subStatus = sub?.status ?? null;
  const isActiveSub = subStatus === "active";
  const isCancelledSub = subStatus === "cancelled";
  const isPastDue = subStatus === "past_due";
  const showCheckout = !isActiveSub && !isCancelledSub;
  const heroPrice = promoActive ? promo.amount_cents : amountCents;
  const nextBillingLabel = formatBillingDate(sub?.next_billing_at ?? null);

  return (
    <div className="relative min-h-[min(100vh,920px)] overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(16,185,129,0.22),transparent),linear-gradient(180deg,#ecfdf5_0%,#f8fafc_42%,#ffffff_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 top-20 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl"
      />

      <div className="relative mx-auto max-w-lg px-4 py-10 sm:py-14">
        {isActiveSub || isCancelledSub ? (
          <>
            <div className="text-center">
              <p className="text-[11px] font-bold tracking-[0.18em] text-emerald-700 uppercase">
                Cleanidex · AI 블로그
              </p>
              <h1 className="mt-3 text-[1.75rem] font-bold tracking-tight text-slate-900 sm:text-3xl">
                {isCancelledSub ? "구독 해지 예정" : "구독 이용 중"}
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                {isCancelledSub
                  ? "다음 결제부터는 청구되지 않습니다. 이미 결제된 기간까지는 그대로 이용할 수 있습니다."
                  : "결제가 완료된 계정입니다. 아래에서 이용 기간과 다음 결제일을 확인할 수 있습니다."}
              </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-emerald-200/70 bg-white/95 shadow-[0_20px_50px_-24px_rgba(6,95,70,0.45)]">
              <div className="border-b border-emerald-100 bg-gradient-to-br from-emerald-600 to-teal-700 px-6 py-6 text-white">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-7 w-7 shrink-0 text-emerald-100" aria-hidden />
                  <div>
                    <p className="text-lg font-bold">
                      {isCancelledSub ? "해지 신청 완료" : "유료 구독 활성"}
                    </p>
                    <p className="mt-1 text-sm text-emerald-50/95">
                      {isCancelledSub
                        ? `${nextBillingLabel}까지 이용 · 이후 자동결제 없음`
                        : `다음 결제일 ${nextBillingLabel}`}
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 px-5 py-5 sm:px-6">
                <dl className="grid gap-3 text-sm">
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <dt className="text-slate-500">상태</dt>
                    <dd className="font-semibold text-slate-900">
                      {isCancelledSub ? "해지 예정" : "구독 중"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                    <dt className="text-slate-500">{isCancelledSub ? "이용 가능일" : "다음 결제일"}</dt>
                    <dd className="font-medium text-slate-900">{nextBillingLabel}</dd>
                  </div>
                  {access.expires_on ? (
                    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                      <dt className="text-slate-500">이용 기간</dt>
                      <dd className="font-medium text-slate-900">~ {access.expires_on}</dd>
                    </div>
                  ) : null}
                  {isActiveSub &&
                  sub?.promo_remaining_months != null &&
                  sub.promo_remaining_months > 0 ? (
                    <div className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                      <dt className="text-slate-500">특가 잔여</dt>
                      <dd className="font-medium text-slate-900">{sub.promo_remaining_months}개월</dd>
                    </div>
                  ) : null}
                  {isActiveSub && sub?.amount_cents != null ? (
                    <div className="flex justify-between gap-4">
                      <dt className="text-slate-500">이후 월 금액</dt>
                      <dd className="font-medium text-slate-900">
                        {(sub.amount_cents || amountCents).toLocaleString("ko-KR")}원
                      </dd>
                    </div>
                  ) : null}
                </dl>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href="/ai-blog"
                    className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white hover:bg-slate-800"
                  >
                    AI 블로그 쓰러 가기
                  </Link>
                  {isCancelledSub ? (
                    <Link
                      href="/ai-blog/subscribe?resume=1"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-emerald-300 bg-emerald-50 px-4 py-3.5 text-sm font-semibold text-emerald-900 hover:bg-emerald-100"
                    >
                      다시 구독하기
                    </Link>
                  ) : (
                    <Link
                      href="/mypage/ai-blog"
                      className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 hover:bg-slate-50"
                    >
                      구독 관리 · 해지
                    </Link>
                  )}
                </div>
                {isActiveSub ? (
                  <p className="text-center text-xs text-slate-500">
                    구독 해지는{" "}
                    <Link href="/mypage/ai-blog" className="font-medium text-emerald-800 underline">
                      마이페이지 → AI 블로그
                    </Link>
                    에서만 가능합니다.
                  </p>
                ) : null}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="text-center">
              <p className="text-[11px] font-bold tracking-[0.18em] text-emerald-700 uppercase">
                Cleanidex · AI 블로그
              </p>
              <h1 className="mt-3 text-[1.75rem] font-bold tracking-tight text-slate-900 sm:text-3xl">
                지금 시작하면
                <br />
                <span className="bg-gradient-to-r from-emerald-700 to-teal-600 bg-clip-text text-transparent">
                  현장 글이 바로 나옵니다
                </span>
              </h1>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-slate-600">
                사진만 맞추면 AI가 네이버용 초안을 씁니다. 카드 등록 한 번이면 바로 이용할 수 있습니다.
              </p>
            </div>

            <div className="mt-8 overflow-hidden rounded-[1.75rem] border border-emerald-200/70 bg-white/90 shadow-[0_20px_50px_-24px_rgba(6,95,70,0.45)] backdrop-blur-sm">
              <div className="relative border-b border-emerald-100 bg-gradient-to-br from-emerald-600 via-emerald-600 to-teal-700 px-6 py-7 text-white">
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 20% 20%, rgba(255,255,255,0.35), transparent 45%), radial-gradient(circle at 80% 0%, rgba(255,255,255,0.2), transparent 40%)",
                  }}
                />
                <div className="relative">
                  {isPastDue ? (
                    <p className="inline-flex items-center rounded-full bg-amber-400/90 px-2.5 py-0.5 text-[11px] font-semibold text-amber-950">
                      결제 실패 · 다시 등록해 주세요
                    </p>
                  ) : promoActive ? (
                    <p className="inline-flex items-center rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold tracking-wide backdrop-blur-sm">
                      기간 한정 특가
                    </p>
                  ) : null}
                  <div className="mt-3 flex items-end gap-2">
                    <span className="text-5xl font-black tracking-tight tabular-nums sm:text-6xl">
                      {heroPrice.toLocaleString("ko-KR")}
                    </span>
                    <span className="mb-1.5 text-lg font-semibold text-emerald-50">원</span>
                    {promoActive ? (
                      <span className="mb-2 ml-1 text-sm text-emerald-100/90 line-through">
                        월 {amountCents.toLocaleString("ko-KR")}원
                      </span>
                    ) : (
                      <span className="mb-2 text-sm font-medium text-emerald-100">/ 월</span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-emerald-50/95">
                    {promoActive
                      ? `특가 기간 후 월 ${amountCents.toLocaleString("ko-KR")}원 자동결제 · 해지 전까지`
                      : "해지하지 않으면 매월 자동결제"}
                  </p>
                </div>
              </div>

              <div className="px-5 py-5 sm:px-6">
                {!bootpayOk ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                    결제 설정이 아직 완료되지 않았습니다. 관리자에게 문의해 주세요.
                  </div>
                ) : showCheckout ? (
                  <AiBlogSubscribeCheckout
                    applicationId={applicationId}
                    userEmail={user.email ?? undefined}
                    normalAmountCents={amountCents}
                    promoEnabled={promoActive}
                    promoAmountCents={promo.amount_cents}
                    monthOptions={promo.month_options}
                    redirectReceiptId={redirectReceiptId}
                    redirectBillingKey={redirectBillingKey}
                    redirectEvent={redirectEvent}
                    redirectStatus={redirectStatus}
                    redirectPromoMonths={
                      redirectPromoMonths != null && Number.isFinite(redirectPromoMonths)
                        ? redirectPromoMonths
                        : null
                    }
                    returnNext={returnNext}
                  />
                ) : null}
              </div>
            </div>
          </>
        )}

        {/* 해지 후 「다시 구독하기」: resume=1 이면 결제 UI 강제 노출 */}
        {isCancelledSub && first(sp.resume) === "1" && bootpayOk ? (
          <div className="mt-6 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="mb-4 text-sm font-semibold text-slate-900">다시 구독하기</p>
            <AiBlogSubscribeCheckout
              applicationId={applicationId}
              userEmail={user.email ?? undefined}
              normalAmountCents={amountCents}
              promoEnabled={promoActive}
              promoAmountCents={promo.amount_cents}
              monthOptions={promo.month_options}
              redirectReceiptId={redirectReceiptId}
              redirectBillingKey={redirectBillingKey}
              redirectEvent={redirectEvent}
              redirectStatus={redirectStatus}
              redirectPromoMonths={
                redirectPromoMonths != null && Number.isFinite(redirectPromoMonths)
                  ? redirectPromoMonths
                  : null
              }
              returnNext={returnNext}
            />
          </div>
        ) : null}

        <p className="mt-8 text-center text-xs text-slate-400">
          <Link href="/subscribe/terms" className="underline hover:text-slate-600">
            유료구독 약관
          </Link>
          <span className="mx-2">·</span>
          <Link href="/ai-blog" className="underline hover:text-slate-600">
            AI 블로그로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  );
}
