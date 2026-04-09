"use client";

import { useState } from "react";
import { submitPartnerChangeRequest } from "@/app/partners/performance/actions";

type PriceRow = {
  item_name: string;
  unit: string | null;
  base_price: number;
  note: string | null;
};

type Props = {
  companyId: string;
  initialImageUrl: string | null;
  initialPrices: PriceRow[];
  hasPendingRequest: boolean;
};

type PriceDraft = { item_name: string; unit: string; base_price: string; note: string };

export default function PartnerChangeRequestForm({
  companyId,
  initialImageUrl,
  initialPrices,
  hasPendingRequest,
}: Props) {
  const [imageUrl, setImageUrl] = useState(initialImageUrl ?? "");
  const [prices, setPrices] = useState<PriceDraft[]>(
    initialPrices.length > 0
      ? initialPrices.map((p) => ({
          item_name: p.item_name,
          unit: p.unit ?? "",
          base_price: String(p.base_price),
          note: p.note ?? "",
        }))
      : [{ item_name: "", unit: "", base_price: "", note: "" }]
  );
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function setPrice(index: number, patch: Partial<PriceDraft>) {
    setPrices((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading || hasPendingRequest) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await submitPartnerChangeRequest({
        company_id: companyId,
        main_image_url: imageUrl || null,
        prices: prices
          .map((p) => ({
            item_name: p.item_name.trim(),
            unit: p.unit.trim() || null,
            base_price: Number(p.base_price),
            note: p.note.trim() || null,
          }))
          .filter((p) => p.item_name && Number.isFinite(p.base_price) && p.base_price >= 0),
      });
      if (!res.ok) throw new Error(res.error);
      setMessage("변경 요청이 접수되었습니다. 관리자 승인 후 반영됩니다.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "변경 요청 저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-3 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
      <p className="text-sm font-medium text-slate-800">썸네일/가격 변경 요청</p>
      <p className="text-xs text-slate-600">
        요청 후 승인 전까지는 기존 데이터가 노출됩니다. 승인되면 즉시 반영되고, 반려되면 기존 데이터가 유지됩니다.
      </p>
      {hasPendingRequest ? (
        <p className="text-xs font-medium text-amber-700">현재 승인 대기중인 요청이 있어 새 요청을 보낼 수 없습니다.</p>
      ) : null}
      <input
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="새 썸네일 이미지 URL"
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        disabled={hasPendingRequest}
      />
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-600">단가는 부가세 포함 금액으로 입력해 주세요.</p>
        {prices.map((row, idx) => (
          <div key={idx} className="grid gap-2 md:grid-cols-4">
            <input value={row.item_name} onChange={(e) => setPrice(idx, { item_name: e.target.value })} placeholder="항목명" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={hasPendingRequest} />
            <input value={row.unit} onChange={(e) => setPrice(idx, { unit: e.target.value })} placeholder="단위" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={hasPendingRequest} />
            <input value={row.base_price} onChange={(e) => setPrice(idx, { base_price: e.target.value })} placeholder="금액(VAT 포함)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={hasPendingRequest} />
            <input value={row.note} onChange={(e) => setPrice(idx, { note: e.target.value })} placeholder="비고" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" disabled={hasPendingRequest} />
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={() => setPrices((prev) => [...prev, { item_name: "", unit: "", base_price: "", note: "" }])} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700" disabled={hasPendingRequest}>
            항목 추가
          </button>
          {prices.length > 1 ? (
            <button type="button" onClick={() => setPrices((prev) => prev.slice(0, -1))} className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700" disabled={hasPendingRequest}>
              마지막 항목 삭제
            </button>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={loading || hasPendingRequest}
          className="rounded bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-amber-300"
        >
          {loading ? "요청 중..." : "변경 요청 제출"}
        </button>
        {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
        {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
