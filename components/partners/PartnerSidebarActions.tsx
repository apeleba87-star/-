"use client";

import { Heart, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import PartnerContactButton from "@/components/partners/PartnerContactButton";

const LS_KEY = "newslett_partner_fav_ids";

type Props = {
  companyId: string;
  companyName: string;
  /** 로그인 시 서버에서 조회한 초기값 */
  initialFavorited: boolean;
  isLoggedIn: boolean;
};

export default function PartnerSidebarActions({ companyId, companyName, initialFavorited, isLoggedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      setFavorited(initialFavorited);
      return;
    }
    try {
      const raw = localStorage.getItem(LS_KEY);
      const ids = JSON.parse(raw || "[]") as unknown;
      if (Array.isArray(ids) && ids.every((x) => typeof x === "string")) {
        setFavorited(ids.includes(companyId));
      }
    } catch {
      /* ignore */
    }
  }, [companyId, initialFavorited, isLoggedIn]);

  async function toggleFavorite() {
    if (busy) return;
    setBusy(true);
    setToast(null);
    try {
      if (isLoggedIn) {
        const res = await fetch("/api/partners/favorite", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ company_id: companyId }),
        });
        const data = (await res.json().catch(() => null)) as { ok?: boolean; favorited?: boolean; error?: string } | null;
        if (!res.ok || !data?.ok) {
          if (data?.error === "login_required") {
            setToast("로그인 후 이용할 수 있습니다.");
          } else {
            setToast(data?.error ?? "처리에 실패했습니다.");
          }
          return;
        }
        setFavorited(Boolean(data.favorited));
        return;
      }

      let ids: string[] = [];
      try {
        const raw = localStorage.getItem(LS_KEY);
        const parsed = JSON.parse(raw || "[]") as unknown;
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) ids = parsed;
      } catch {
        ids = [];
      }
      if (ids.includes(companyId)) {
        ids = ids.filter((id) => id !== companyId);
        setFavorited(false);
      } else {
        ids = [...ids, companyId];
        setFavorited(true);
      }
      localStorage.setItem(LS_KEY, JSON.stringify(ids));
    } finally {
      setBusy(false);
    }
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) {
        await navigator.share({ title: companyName, text: `${companyName} · 협력 센터`, url });
        return;
      }
    } catch {
      /* user cancelled or share failed */
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast("링크를 복사했습니다.");
      setTimeout(() => setToast(null), 2500);
    } catch {
      setToast("복사에 실패했습니다. 주소창의 URL을 직접 복사해 주세요.");
    }
  }

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="hidden lg:block">
        <PartnerContactButton companyId={companyId} variant="sky" fullWidth />
      </div>
      <p className="text-xs font-semibold text-slate-500 lg:hidden">관심 · 공유</p>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => void toggleFavorite()}
          disabled={busy}
          className={`inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border text-xs font-semibold transition disabled:opacity-60 ${
            favorited
              ? "border-rose-200 bg-rose-50 text-rose-700"
              : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Heart className={`h-3.5 w-3.5 ${favorited ? "fill-current" : ""}`} aria-hidden />
          관심 업체
        </button>
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex min-h-[42px] items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          <Share2 className="h-3.5 w-3.5" aria-hidden />
          공유하기
        </button>
      </div>
      {!isLoggedIn ? (
        <p className="text-[11px] leading-snug text-slate-400">비로그인 시 관심 업체는 이 기기에만 저장됩니다.</p>
      ) : null}
      {toast ? <p className="text-[11px] text-rose-600">{toast}</p> : null}
    </div>
  );
}
