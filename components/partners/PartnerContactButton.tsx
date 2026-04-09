"use client";

import { useEffect, useState } from "react";
import { telHref } from "@/lib/partners/kst-day";

type Props = {
  companyId: string;
  /** 기본(에메랄드) | 사이드바용 스카이 */
  variant?: "emerald" | "sky";
  fullWidth?: boolean;
};

export default function PartnerContactButton({ companyId, variant = "emerald", fullWidth = false }: Props) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const [statusReady, setStatusReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/partners/contact?company_id=${encodeURIComponent(companyId)}`, {
          credentials: "same-origin",
        });
        const data = (await res.json().catch(() => null)) as {
          alreadyLoggedContactToday?: boolean;
          phone?: string | null;
        } | null;
        if (cancelled || !res.ok || !data) return;
        if (data.alreadyLoggedContactToday && data.phone?.trim()) {
          setRevealedPhone(data.phone.trim());
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setStatusReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  async function onClick() {
    if (isSubmitting || revealedPhone) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/partners/contact", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          company_id: companyId,
          event_type: "contact_click",
        }),
      });
      const data = (await res.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        phone?: string | null;
        skipped_duplicate?: boolean;
      } | null;
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "문의 이벤트 저장에 실패했습니다.");
      }
      const phone = data.phone?.trim() ?? "";
      if (!phone) {
        throw new Error("연락처를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
      setRevealedPhone(phone);
    } catch (e) {
      setError(e instanceof Error ? e.message : "요청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const btnBase =
    variant === "sky"
      ? "bg-sky-600 hover:bg-sky-700 disabled:bg-sky-300"
      : "bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300";

  const tel = revealedPhone ? telHref(revealedPhone) : "#";

  return (
    <div className={`${fullWidth ? "w-full" : ""}`}>
      {!statusReady ? (
        <div className="min-h-[44px] w-full rounded-lg bg-slate-100/80 animate-pulse" aria-hidden />
      ) : revealedPhone ? (
        <a
          href={tel}
          className={`block break-all text-center text-2xl font-bold leading-snug text-emerald-700 underline-offset-2 hover:underline sm:text-left lg:text-3xl ${fullWidth ? "w-full py-1" : ""}`}
        >
          {revealedPhone}
        </a>
      ) : (
        <button
          type="button"
          onClick={() => void onClick()}
          disabled={isSubmitting}
          className={`inline-flex min-h-[44px] items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed ${btnBase} ${fullWidth ? "w-full" : ""}`}
        >
          {isSubmitting ? "연락처 확인 중..." : "연락하기"}
        </button>
      )}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}
