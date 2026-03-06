"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createListing } from "./actions";
import { REGION_SIDO_LIST, REGION_GUGUN, formatRegionForDb } from "@/lib/listings/regions";
import type { CategoryRow } from "@/lib/listings/types";

/** 1차 분기: 인력구인 vs 현장거래 */
const FLOW_TYPES = [
  { value: "job_posting", label: "인력 구인", description: "직원·인력을 구하는 글" },
  {
    value: "field_deal",
    label: "현장 거래",
    description: "정기/일회 소개, 매매, 도급",
  },
] as const;

/** 현장거래 하위 유형 */
const FIELD_DEAL_TYPES = [
  { value: "referral_regular", label: "정기청소 소개" },
  { value: "referral_one_time", label: "일회성 소개" },
  { value: "sale_regular", label: "정기청소 매매" },
  { value: "subcontract", label: "현장 도급" },
] as const;

const PAY_UNITS = [
  { value: "day", label: "일당" },
  { value: "half_day", label: "반당" },
  { value: "hour", label: "시급" },
] as const;

const OTHER_SUB_ID = "__other__";

type Props = {
  mainCategories: CategoryRow[];
  subCategories: CategoryRow[];
};

export default function NewListingForm({ mainCategories, subCategories }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flowType, setFlowType] = useState<"job_posting" | "field_deal">("job_posting");
  const [fieldDealType, setFieldDealType] = useState<(typeof FIELD_DEAL_TYPES)[number]["value"]>(
    "referral_regular"
  );
  const [title, setTitle] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [body, setBody] = useState("");
  const [regionSido, setRegionSido] = useState<(typeof REGION_SIDO_LIST)[number]>("서울");
  const gugunOptions = useMemo(() => REGION_GUGUN[regionSido] ?? [], [regionSido]);
  const [regionGugun, setRegionGugun] = useState("");
  const effectiveGugun =
    regionGugun && gugunOptions.includes(regionGugun) ? regionGugun : (gugunOptions[0] ?? "");
  const [categoryMainId, setCategoryMainId] = useState(mainCategories[0]?.id ?? "");
  const subOptions = useMemo(
    () => subCategories.filter((c) => c.parent_id === categoryMainId),
    [subCategories, categoryMainId]
  );
  const [categorySubId, setCategorySubId] = useState<string>(() => {
    const firstMainId = mainCategories[0]?.id;
    if (!firstMainId) return OTHER_SUB_ID;
    const first = subCategories.find((c) => c.parent_id === firstMainId);
    return first?.id ?? OTHER_SUB_ID;
  });
  const [customSubcategoryText, setCustomSubcategoryText] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payUnit, setPayUnit] = useState("day");
  const [contactPhone, setContactPhone] = useState("");

  const listingType = flowType === "job_posting" ? "job_posting" : fieldDealType;
  const showCustomSubInput = categorySubId === OTHER_SUB_ID;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const amount = parseFloat(payAmount.replace(/[^\d.]/g, ""));
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      setLoading(false);
      return;
    }
    const regionValue = formatRegionForDb(regionSido, effectiveGugun);
    if (!regionValue.trim()) {
      setError("지역을 선택하세요.");
      setLoading(false);
      return;
    }
    if (!categoryMainId) {
      setError("대분류를 선택하세요.");
      setLoading(false);
      return;
    }
    if (showCustomSubInput && !customSubcategoryText.trim()) {
      setError("소분류에서 '기타'를 선택한 경우 직접 입력해 주세요.");
      setLoading(false);
      return;
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setError("지급 금액을 입력하세요.");
      setLoading(false);
      return;
    }
    if (!contactPhone.trim()) {
      setError("연락처를 입력하세요.");
      setLoading(false);
      return;
    }
    const result = await createListing({
      listing_type: listingType,
      title: title.trim(),
      work_date: workDate.trim() || null,
      body: body.trim() || null,
      region: regionValue.trim(),
      category_main_id: categoryMainId,
      category_sub_id: showCustomSubInput ? null : categorySubId || null,
      custom_subcategory_text: showCustomSubInput ? customSubcategoryText.trim() || null : null,
      pay_amount: amount,
      pay_unit: payUnit,
      contact_phone: contactPhone.trim(),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "저장 실패");
      return;
    }
    router.push("/listings");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/listings" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 목록
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">글쓰기 · 현장·구인</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        {/* 1차 분기: 인력구인 vs 현장거래 */}
        <section className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <p className="mb-3 text-sm font-medium text-slate-700">글 유형</p>
          <div className="flex flex-wrap gap-3">
            {FLOW_TYPES.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => setFlowType(f.value)}
                className={`min-w-[140px] rounded-xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${
                  flowType === f.value
                    ? "border-slate-800 bg-slate-800 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                }`}
              >
                <span className="block">{f.label}</span>
                <span className="mt-0.5 block text-xs opacity-80">{f.description}</span>
              </button>
            ))}
          </div>
          {flowType === "field_deal" && (
            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-500">현장 거래 유형</label>
              <select
                value={fieldDealType}
                onChange={(e) => setFieldDealType(e.target.value as typeof fieldDealType)}
                className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
              >
                {FIELD_DEAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <div>
          <label className="block text-sm font-medium text-slate-700">제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="예: 서울 어린이집 청소"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">일정 (작업 예정일)</label>
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">지역 *</label>
            <select
              value={regionSido}
              onChange={(e) => {
                const nextSido = e.target.value as (typeof REGION_SIDO_LIST)[number];
                setRegionSido(nextSido);
                const nextGugunList = REGION_GUGUN[nextSido];
                setRegionGugun(nextGugunList?.[0] ?? "");
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              required
            >
              {REGION_SIDO_LIST.map((sido) => (
                <option key={sido} value={sido}>
                  {sido}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">지역구 *</label>
            <select
              value={effectiveGugun}
              onChange={(e) => setRegionGugun(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              required
            >
              {gugunOptions.map((gu) => (
                <option key={gu} value={gu}>
                  {gu}
                </option>
              ))}
            </select>
            <p className="mt-0.5 text-xs text-slate-500">시·군·구 단위로 선택합니다.</p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">대분류 *</label>
            <select
              value={categoryMainId}
              onChange={(e) => {
                const nextMainId = e.target.value;
                setCategoryMainId(nextMainId);
                const nextSubs = subCategories.filter((c) => c.parent_id === nextMainId);
                setCategorySubId(nextSubs[0]?.id ?? OTHER_SUB_ID);
                setCustomSubcategoryText("");
              }}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              required
            >
              {mainCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">소분류 *</label>
            <select
              value={categorySubId}
              onChange={(e) => setCategorySubId(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
              required
            >
              {subOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
              <option value={OTHER_SUB_ID}>기타 (직접 입력)</option>
            </select>
            <p className="mt-0.5 text-xs text-slate-500">
              선택한 소분류는 시장 평균·등급 통계에 반영됩니다. 없으면 기타를 선택 후 입력하세요.
            </p>
            {showCustomSubInput && (
              <input
                type="text"
                value={customSubcategoryText}
                onChange={(e) => setCustomSubcategoryText(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                placeholder="예: 간판청소, 태양광청소"
              />
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">지급 금액 *</label>
            <input
              type="text"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="예: 160000"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">지급 단위</label>
            <select
              value={payUnit}
              onChange={(e) => setPayUnit(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              {PAY_UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">연락처 (전화/문자용) *</label>
          <input
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="010-0000-0000"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">상세 내용</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="작업 조건, 시간, 장소 등"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "등록 중…" : "등록하기"}
        </button>
      </form>
    </div>
  );
}
