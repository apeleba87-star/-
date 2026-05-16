"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COUPANG_CATEGORY_PRESETS, COUPANG_KEYWORD_PRESETS } from "@/lib/coupang-partners/presets";
import type { CoupangSlotConfig, CoupangSourceType } from "@/lib/coupang-partners/types";
import { refreshCoupangSlotNow, updateSlotCoupangConfig } from "./actions";

type CacheInfo = {
  fetched_at: string | null;
  fetch_error: string | null;
  product_count: number;
};

type Props = {
  slotId: string;
  slotKey: string;
  initialConfig: CoupangSlotConfig | null;
  cache: CacheInfo | null;
  apiConfigured: boolean;
};

function configFromForm(
  sourceType: CoupangSourceType,
  keyword: string,
  categoryId: number,
  limit: number,
  slotKey: string
): CoupangSlotConfig {
  if (sourceType === "search") {
    return { source: { type: "search", keyword: keyword.trim() }, limit, subId: slotKey };
  }
  if (sourceType === "bestcategory") {
    return { source: { type: "bestcategory", categoryId }, limit, subId: slotKey };
  }
  return { source: { type: "goldbox" }, limit, subId: slotKey };
}

export default function CoupangApiSlotPanel({ slotId, slotKey, initialConfig, cache, apiConfigured }: Props) {
  const router = useRouter();
  const [sourceType, setSourceType] = useState<CoupangSourceType>(
    initialConfig?.source.type ?? "bestcategory"
  );
  const [keyword, setKeyword] = useState(initialConfig?.source.keyword ?? "청소용품");
  const [categoryId, setCategoryId] = useState(
    initialConfig?.source.categoryId ?? COUPANG_CATEGORY_PRESETS[0].id
  );
  const [limit, setLimit] = useState(initialConfig?.limit ?? 3);
  const [busy, setBusy] = useState<"save" | "refresh" | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSave() {
    setBusy("save");
    setMessage(null);
    const config = configFromForm(sourceType, keyword, categoryId, limit, slotKey);
    const res = await updateSlotCoupangConfig(slotId, config);
    setBusy(null);
    setMessage(res.ok ? { ok: true, text: "설정이 저장되었습니다." } : { ok: false, text: res.error ?? "저장 실패" });
    if (res.ok) router.refresh();
  }

  async function handleRefresh() {
    setBusy("refresh");
    setMessage(null);
    const saveRes = await updateSlotCoupangConfig(
      slotId,
      configFromForm(sourceType, keyword, categoryId, limit, slotKey)
    );
    if (!saveRes.ok) {
      setBusy(null);
      setMessage({ ok: false, text: saveRes.error ?? "저장 실패" });
      return;
    }
    const res = await refreshCoupangSlotNow(slotKey);
    setBusy(null);
    setMessage(
      res.ok
        ? { ok: true, text: `상품 ${res.productCount}건 갱신 완료` }
        : { ok: false, text: res.error ?? "갱신 실패" }
    );
    router.refresh();
  }

  return (
    <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50/50 p-4">
      <p className="mb-1 text-sm font-medium text-slate-800">쿠팡 파트너스 API</p>
      <p className="mb-3 text-xs text-slate-500">
        슬롯별 상품 소스를 설정합니다. 저장 후 「지금 갱신」 또는 크론(30~60분)으로 캐시가 채워집니다.
        {!apiConfigured ? " · 서버에 COUPANG_PARTNERS_ACCESS_KEY/SECRET_KEY를 설정하세요." : ""}
      </p>

      {cache?.fetched_at ? (
        <p className="mb-3 text-xs text-slate-600">
          마지막 갱신: {new Date(cache.fetched_at).toLocaleString("ko-KR")} · 캐시 상품 {cache.product_count}건
          {cache.fetch_error ? ` · ${cache.fetch_error}` : ""}
        </p>
      ) : (
        <p className="mb-3 text-xs text-amber-700">아직 캐시된 상품이 없습니다. 설정 저장 후 갱신하세요.</p>
      )}

      <div className="mb-3 flex flex-wrap gap-2">
        {(
          [
            ["bestcategory", "카테고리 베스트"],
            ["search", "키워드 검색"],
            ["goldbox", "골드박스"],
          ] as const
        ).map(([t, label]) => (
          <button
            key={t}
            type="button"
            onClick={() => setSourceType(t)}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              sourceType === t
                ? "border-orange-600 bg-orange-600 text-white"
                : "border-slate-300 bg-white text-slate-600"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {sourceType === "search" ? (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-700">검색어</label>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
            placeholder="예: 청소용품"
          />
          <div className="flex flex-wrap gap-1">
            {COUPANG_KEYWORD_PRESETS.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKeyword(k)}
                className="rounded bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200 hover:bg-orange-50"
              >
                {k}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {sourceType === "bestcategory" ? (
        <div className="mb-3">
          <label className="mb-1 block text-xs font-medium text-slate-700">카테고리</label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(Number(e.target.value))}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
          >
            {COUPANG_CATEGORY_PRESETS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label} ({c.id})
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-slate-700">노출 상품 수 (1~5)</span>
        <input
          type="number"
          min={1}
          max={5}
          value={limit}
          onChange={(e) => setLimit(Math.min(5, Math.max(1, Number(e.target.value) || 3)))}
          className="w-24 rounded border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!!busy || !apiConfigured}
          onClick={handleSave}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {busy === "save" ? "저장 중…" : "설정 저장"}
        </button>
        <button
          type="button"
          disabled={!!busy || !apiConfigured}
          onClick={handleRefresh}
          className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {busy === "refresh" ? "갱신 중…" : "지금 갱신"}
        </button>
      </div>

      {message ? (
        <p className={`mt-3 text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
      ) : null}
    </div>
  );
}
