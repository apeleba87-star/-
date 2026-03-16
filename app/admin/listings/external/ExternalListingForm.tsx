"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExternalListing } from "./actions";
import { REGION_SIDO_LIST, REGION_GUGUN, formatRegionForDb } from "@/lib/listings/regions";

type ListingTypeOption = { value: string; label: string };
type CategoryRow = { id: string; name: string };

export default function ExternalListingForm({
  listingTypes,
  categories,
}: {
  listingTypes: readonly ListingTypeOption[];
  categories: CategoryRow[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [regionSido, setRegionSido] = useState<(typeof REGION_SIDO_LIST)[number]>("서울");
  const [regionGugun, setRegionGugun] = useState("");
  const [listingType, setListingType] = useState(listingTypes[0]?.value ?? "referral_one_time");
  const [categoryMainId, setCategoryMainId] = useState(categories[0]?.id ?? "");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [saleMultiplier, setSaleMultiplier] = useState("");
  const [areaPyeong, setAreaPyeong] = useState("");
  const [visitsPerWeek, setVisitsPerWeek] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");

  const gugunOptions = REGION_GUGUN[regionSido] ?? [];
  const effectiveGugun = regionGugun && gugunOptions.includes(regionGugun) ? regionGugun : (gugunOptions[0] ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const region = formatRegionForDb(regionSido, effectiveGugun);
    const monthly = monthlyAmount.trim() ? Number(monthlyAmount) : null;
    const deal = dealAmount.trim() ? Number(dealAmount) : null;
    const mult = saleMultiplier.trim() ? Number(saleMultiplier) : null;
    const area = areaPyeong.trim() ? Number(areaPyeong) : null;
    const visits = visitsPerWeek.trim() ? Number(visitsPerWeek) : null;
    const result = await createExternalListing({
      title,
      body: body || null,
      region,
      listing_type: listingType,
      category_main_id: categoryMainId,
      monthly_amount: (listingType === "sale_regular" || listingType === "subcontract") ? (monthly ?? undefined) : undefined,
      deal_amount: listingType === "sale_regular" ? (deal ?? undefined) : (listingType === "referral_regular" || listingType === "referral_one_time" ? (deal ?? undefined) : undefined),
      sale_multiplier: listingType === "sale_regular" && (mult != null || (monthly != null && deal != null)) ? (mult ?? (monthly != null && deal != null && monthly > 0 ? deal / monthly : undefined)) : undefined,
      area_pyeong: area ?? undefined,
      visits_per_week: visits ?? undefined,
      contact_phone: contactPhone,
      source_url: sourceUrl || null,
    });
    setLoading(false);
    if (result.ok) {
      router.push("/listings");
      router.refresh();
    } else {
      setError(result.error ?? "저장 실패");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">제목 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">본문</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">시/도 *</label>
          <select
            value={regionSido}
            onChange={(e) => {
              setRegionSido(e.target.value as (typeof REGION_SIDO_LIST)[number]);
              setRegionGugun("");
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {REGION_SIDO_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">구/군 *</label>
          <select
            value={effectiveGugun}
            onChange={(e) => setRegionGugun(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {gugunOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">유형 *</label>
          <select
            value={listingType}
            onChange={(e) => setListingType(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {listingTypes.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">카테고리 *</label>
          <select
            value={categoryMainId}
            onChange={(e) => setCategoryMainId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 현장거래: 일당 없음. 유형별 월 수금 / 매매가 / 성사 금액 */}
      {listingType === "sale_regular" && (
        <div className="space-y-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">월 수금 (원) *</label>
              <input
                type="number"
                min={1}
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="예: 1500000"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">매매가 (원)</label>
              <input
                type="number"
                min={0}
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="선택"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">배수</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={saleMultiplier}
                onChange={(e) => setSaleMultiplier(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="매매가÷월수금"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">평수 (평)</label>
              <input
                type="number"
                min={0}
                step={0.1}
                value={areaPyeong}
                onChange={(e) => setAreaPyeong(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="선택"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">주 회수</label>
              <input
                type="number"
                min={1}
                max={7}
                value={visitsPerWeek}
                onChange={(e) => setVisitsPerWeek(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
                placeholder="1~7"
              />
            </div>
          </div>
        </div>
      )}
      {listingType === "subcontract" && (
        <div>
          <label className="block text-sm font-medium text-slate-700">월 도급금 (원) *</label>
          <input
            type="number"
            min={1}
            value={monthlyAmount}
            onChange={(e) => setMonthlyAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="예: 2000000"
          />
        </div>
      )}
      {(listingType === "referral_regular" || listingType === "referral_one_time") && (
        <div>
          <label className="block text-sm font-medium text-slate-700">성사 예상 금액 (원) *</label>
          <input
            type="number"
            min={1}
            value={dealAmount}
            onChange={(e) => setDealAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="예: 500000"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">연락처 *</label>
        <input
          type="text"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="010-0000-0000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">출처 URL (선택)</label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="https://..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "저장 중…" : "등록"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
