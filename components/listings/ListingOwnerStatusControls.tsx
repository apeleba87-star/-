"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { softDeleteListing, updateListingExpiry, updateListingVisibility } from "@/app/listings/[id]/actions";

type Props = {
  listingId: string;
  initialPrivate: boolean;
  initialExpiresAt: string | null;
};

export default function ListingOwnerStatusControls({ listingId, initialPrivate, initialExpiresAt }: Props) {
  const router = useRouter();
  const [isPrivate, setIsPrivate] = useState(initialPrivate);
  const [expiresAt, setExpiresAt] = useState(initialExpiresAt ? initialExpiresAt.slice(0, 10) : "");
  const [loading, setLoading] = useState<"private" | "expiry" | "delete" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onTogglePrivate() {
    setLoading("private");
    setError(null);
    setMessage(null);
    const next = !isPrivate;
    const result = await updateListingVisibility(listingId, next);
    setLoading(null);
    if (!result.ok) {
      setError(result.error ?? "변경 실패");
      return;
    }
    setIsPrivate(next);
    setMessage(next ? "비공개로 전환했습니다." : "공개로 전환했습니다.");
    router.refresh();
  }

  async function onSaveExpiry() {
    setLoading("expiry");
    setError(null);
    setMessage(null);
    const result = await updateListingExpiry(listingId, expiresAt.trim() || null);
    setLoading(null);
    if (!result.ok) {
      setError(result.error ?? "저장 실패");
      return;
    }
    setMessage(expiresAt ? "만료일을 저장했습니다." : "만료일을 해제했습니다.");
    router.refresh();
  }

  async function onDelete() {
    if (!confirm("이 글을 삭제 상태로 전환할까요? 공유 링크 접근 시 삭제 안내가 표시됩니다.")) return;
    setLoading("delete");
    setError(null);
    setMessage(null);
    const result = await softDeleteListing(listingId);
    setLoading(null);
    if (!result.ok) {
      setError(result.error ?? "삭제 실패");
      return;
    }
    router.push("/listings");
    router.refresh();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-semibold text-slate-800">운영 상태 관리</h3>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <button
          type="button"
          onClick={onTogglePrivate}
          disabled={loading != null}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            isPrivate
              ? "border-amber-300 bg-amber-50 text-amber-800"
              : "border-emerald-300 bg-emerald-50 text-emerald-800"
          } disabled:opacity-60`}
        >
          {loading === "private" ? "처리 중…" : isPrivate ? "비공개" : "공개"}
        </button>
        <div>
          <label className="block text-xs text-slate-600">만료일</label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="mt-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={onSaveExpiry}
          disabled={loading != null}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-60"
        >
          {loading === "expiry" ? "저장 중…" : "만료일 저장"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={loading != null}
          className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          {loading === "delete" ? "삭제 중…" : "삭제 처리"}
        </button>
      </div>
      {message && <p className="mt-2 text-xs text-emerald-700">{message}</p>}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </section>
  );
}
