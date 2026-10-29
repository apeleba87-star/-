"use client";

import Link from "next/link";
import CancelAiBlogSubscriptionButton from "@/app/ai-blog/subscribe/CancelAiBlogSubscriptionButton";
import type { AccessState } from "@/lib/ai-blog/types";
import { glassCard } from "@/lib/ui-styles";

type Props = {
  accessState: AccessState;
  expiresOn: string | null;
  subscriptionStatus: string | null;
  nextBillingAt: string | null;
};

function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString("ko-KR");
  } catch {
    return iso;
  }
}

export default function MyPageAiBlogCard({
  accessState,
  expiresOn,
  subscriptionStatus,
  nextBillingAt,
}: Props) {
  const nextDate = formatDate(nextBillingAt);
  const isSubActive = subscriptionStatus === "active";
  const isSubCancelled = subscriptionStatus === "cancelled";

  const accessLine =
    accessState === "none"
      ? "사용 권한 없음 · 구독 또는 관리자 문의"
      : !expiresOn
        ? "관리자 계정 · 기간 제한 없음"
        : `${accessState === "suspended" ? "사용 정지" : accessState === "expired" ? "이용 기간 만료" : "이용 기간"} ~ ${expiresOn}`;

  return (
    <section className={`${glassCard} mb-6 p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">AI 블로그</p>
          <p className="mt-1 text-sm text-slate-600">
            현장 사진으로 네이버 블로그 초안을 만듭니다. 크롬 PC 권장.
          </p>
        </div>
        <Link
          href="/ai-blog"
          className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          바로가기
        </Link>
      </div>

      <p className={`mt-3 text-xs ${accessState === "active" ? "text-slate-500" : "font-medium text-rose-600"}`}>
        {accessLine}
      </p>

      <div className="mt-4 border-t border-slate-100 pt-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">구독</p>

        {isSubActive && (
          <div className="mt-2 space-y-3">
            <p className="text-sm text-slate-800">
              구독 중
              {nextDate ? <span className="text-slate-600"> · 다음 결제일 {nextDate}</span> : null}
            </p>
            <CancelAiBlogSubscriptionButton />
          </div>
        )}

        {isSubCancelled && (
          <p className="mt-2 text-sm text-slate-700">
            해지 예정
            {nextDate ? ` · ${nextDate}까지 이용 가능` : null}
          </p>
        )}

        {!isSubActive && !isSubCancelled && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <p className="text-sm text-slate-600">구독 중이 아닙니다.</p>
            <Link
              href="/ai-blog/subscribe"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              구독하기
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
