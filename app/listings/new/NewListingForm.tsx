"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createListing, getListingBenchmarks, type ListingBenchmarkRow } from "./actions";
import { REGION_SIDO_LIST, REGION_GUGUN, formatRegionForDb } from "@/lib/listings/regions";
import {
  LISTING_CATEGORY_GROUPS,
  LISTING_CATEGORY_OTHER,
  type ListingCategoryGroupId,
} from "@/lib/listings/listing-category-presets";

/** 접기/펼치기 가능한 Step 블록. 기본은 접힘. */
function CollapsibleStepSection({
  step,
  title,
  open,
  onToggle,
  summary,
  children,
}: {
  step: number;
  title: string;
  open: boolean;
  onToggle: () => void;
  summary?: string | null;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-5 text-left hover:bg-slate-50/80 transition-colors"
        aria-expanded={open}
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-800 text-sm font-bold text-white">
          {step}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
          {summary && !open && (
            <p className="mt-0.5 truncate text-sm text-slate-500">{summary}</p>
          )}
        </div>
        {open ? (
          <ChevronDown className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        ) : (
          <ChevronRight className="h-5 w-5 shrink-0 text-slate-500" aria-hidden />
        )}
      </button>
      {open && <div className="border-t border-slate-100 p-5 pt-4">{children}</div>}
    </section>
  );
}

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}

/** 금액 입력: 표시용 190,000 형식 */
function formatAmountDisplay(value: string): string {
  const num = value.replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("ko-KR");
}

/** 금액 입력: 입력값에서 숫자만 추출 */
function parseAmountInput(value: string): string {
  return value.replace(/\D/g, "");
}

/** 금액 표기: 190,000원 형식 */
function formatAmountWon(n: number): string {
  return `${Number(n).toLocaleString("ko-KR")}원`;
}

/** 현장 거래 유형: 소개 / 매매 / 도급 (3가지). 업무 종류(정기·일회성)와 조합해 listing_type 결정 */
const TRANSACTION_TYPES = [
  { value: "referral" as const, label: "소개" },
  { value: "sale" as const, label: "매매" },
  { value: "subcontract" as const, label: "도급" },
];

type TransactionType = (typeof TRANSACTION_TYPES)[number]["value"];

const PAY_UNITS = [
  { value: "day", label: "일당" },
  { value: "half_day", label: "반당" },
  { value: "hour", label: "시급" },
] as const;

type Props = {
  mainCategories: { id: string }[];
  subCategories?: unknown[];
};

/** transactionType + categoryGroup → DB에 저장되는 listing_type */
function deriveListingType(
  transactionType: TransactionType,
  categoryGroup: ListingCategoryGroupId
): string {
  if (transactionType === "subcontract") return "subcontract";
  if (transactionType === "referral") return categoryGroup === "regular" ? "referral_regular" : "referral_one_time";
  return categoryGroup === "regular" ? "sale_regular" : "sale_one_time";
}

export default function NewListingForm({ mainCategories }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<TransactionType>("referral");
  const [title, setTitle] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [body, setBody] = useState("");
  const [regionSido, setRegionSido] = useState<(typeof REGION_SIDO_LIST)[number]>("서울");
  const gugunOptions = useMemo(() => REGION_GUGUN[regionSido] ?? [], [regionSido]);
  const [regionGugun, setRegionGugun] = useState("");
  const effectiveGugun =
    regionGugun && gugunOptions.includes(regionGugun) ? regionGugun : (gugunOptions[0] ?? "");
  const [categoryGroup, setCategoryGroup] = useState<ListingCategoryGroupId>("regular");
  const currentGroup = LISTING_CATEGORY_GROUPS.find((g) => g.id === categoryGroup);
  const [categoryPresetKey, setCategoryPresetKey] = useState<string>(
    currentGroup?.options.find((o) => o.key !== LISTING_CATEGORY_OTHER)?.key ?? "office"
  );
  const [categoryCustomText, setCategoryCustomText] = useState("");

  const listingType = deriveListingType(transactionType, categoryGroup);
  const isSubcontractOnly = transactionType === "subcontract";
  const isSaleOnly = transactionType === "sale";
  const regularOnly = isSubcontractOnly || isSaleOnly;
  const [payAmount, setPayAmount] = useState("");
  const [payUnit, setPayUnit] = useState("day");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [saleMultiplier, setSaleMultiplier] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [amountUndecided, setAmountUndecided] = useState(false);
  const [feeRatePercent, setFeeRatePercent] = useState("");
  const [areaPyeong, setAreaPyeong] = useState("");
  const [areaUnit, setAreaUnit] = useState<"pyeong" | "sqm">("pyeong");
  const [visitsPerWeek, setVisitsPerWeek] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard" | "">("");
  const [estimateCheckRequired, setEstimateCheckRequired] = useState(false);
  const [stairsFloors, setStairsFloors] = useState("");
  const [stairsRestroomCount, setStairsRestroomCount] = useState(0);
  const [stairsHasRecycle, setStairsHasRecycle] = useState(false);
  const [stairsHasCorridor, setStairsHasCorridor] = useState(false);
  const [stairsElevator, setStairsElevator] = useState(false);
  const [stairsParking, setStairsParking] = useState(false);
  const [stairsWindow, setStairsWindow] = useState(false);
  const [contactPhone, setContactPhone] = useState("");
  const [benchmarks, setBenchmarks] = useState<ListingBenchmarkRow[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const [openStep1, setOpenStep1] = useState(false);
  const [openStep2, setOpenStep2] = useState(false);
  const [openStep3, setOpenStep3] = useState(false);
  const [openStep4, setOpenStep4] = useState(false);
  const [openStep5, setOpenStep5] = useState(false);


  const isReferral = listingType === "referral_regular" || listingType === "referral_one_time";
  const isSale = listingType === "sale_regular" || listingType === "sale_one_time";
  const isSaleRegular = listingType === "sale_regular";
  const isSaleOneTime = listingType === "sale_one_time";
  const isSubcontract = listingType === "subcontract";
  const isStairs = categoryPresetKey === "stairs";

  const expectedNum = expectedAmount.trim() ? parseFloat(parseAmountInput(expectedAmount)) : null;
  const feeRateNum = feeRatePercent.trim() ? parseFloat(feeRatePercent.replace(/[^\d.]/g, "")) : null;
  const expectedFeeAmount =
    expectedNum != null && feeRateNum != null && feeRateNum >= 0 && feeRateNum <= 100
      ? Math.round((expectedNum * feeRateNum) / 100)
      : null;

  useEffect(() => {
    const regionValue = formatRegionForDb(regionSido, effectiveGugun);
    if (!regionValue || !listingType) return;
    getListingBenchmarks(regionValue, listingType, categoryGroup, categoryPresetKey).then(
      setBenchmarks
    );
  }, [regionSido, effectiveGugun, listingType, categoryGroup, categoryPresetKey]);
  const isOtherCategory = categoryPresetKey === LISTING_CATEGORY_OTHER;
  const options = currentGroup?.options ?? [];

  const categoryLabel =
    currentGroup && categoryPresetKey !== LISTING_CATEGORY_OTHER
      ? (options.find((o) => o.key === categoryPresetKey)?.label ?? (categoryCustomText || "소개"))
      : (categoryCustomText || "현장");
  const typeLabel = TRANSACTION_TYPES.find((t) => t.value === transactionType)?.label ?? "소개";

  const suggestedTitle = useMemo(() => {
    const parts: string[] = [];
    if (regionSido && effectiveGugun) parts.push(`${regionSido} ${effectiveGugun}`);
    parts.push(categoryLabel);
    if (isStairs && stairsFloors.trim()) parts.push(`${stairsFloors.trim()}층`);
    else if (!isStairs && areaPyeong.trim()) parts.push(`${areaPyeong.trim()}평`);
    if (visitsPerWeek && visitsPerWeek !== "") parts.push(`주${visitsPerWeek}회`);
    parts.push(typeLabel);
    return parts.join(" ");
  }, [regionSido, effectiveGugun, categoryLabel, isStairs, stairsFloors, areaPyeong, visitsPerWeek, typeLabel]);

  const lastSuggestedTitleRef = useRef(suggestedTitle);
  useEffect(() => {
    if (title === "" || title === lastSuggestedTitleRef.current) {
      setTitle(suggestedTitle);
    }
    lastSuggestedTitleRef.current = suggestedTitle;
  }, [suggestedTitle]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const amount = parseFloat(parseAmountInput(payAmount));
    const monthly = monthlyAmount.trim() ? parseFloat(parseAmountInput(monthlyAmount)) : null;
    const deal = dealAmount.trim() ? parseFloat(parseAmountInput(dealAmount)) : null;
    const mult = saleMultiplier.trim() ? parseFloat(saleMultiplier) : null;
    const areaRaw = areaPyeong.trim() ? parseFloat(parseAmountInput(areaPyeong)) : null;
    const area =
      areaRaw != null && !Number.isNaN(areaRaw) && areaRaw > 0
        ? areaUnit === "sqm"
          ? Math.round((areaRaw / 3.3058) * 10) / 10
          : areaRaw
        : null;
    const visits = visitsPerWeek.trim() ? parseInt(visitsPerWeek, 10) : null;
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
    if (isOtherCategory && !categoryCustomText.trim()) {
      setError("업무 종류에서 '기타'를 선택한 경우 직접 입력해 주세요.");
      setLoading(false);
      return;
    }
    if (isSubcontract) {
      if (monthly == null || Number.isNaN(monthly) || monthly <= 0) {
        setError("월 도급금을 입력하세요.");
        setLoading(false);
        return;
      }
    } else if (isSaleRegular) {
      if (monthly == null || Number.isNaN(monthly) || monthly <= 0) {
        setError("월 수금을 입력하세요.");
        setLoading(false);
        return;
      }
      const hasDeal = deal != null && !Number.isNaN(deal) && deal > 0;
      const hasMult = mult != null && !Number.isNaN(mult) && mult > 0;
      if (!hasDeal && !hasMult) {
        setError("매매가 또는 배수를 입력하세요.");
        setLoading(false);
        return;
      }
    } else if (isSaleOneTime) {
      if (deal == null || Number.isNaN(deal) || deal <= 0) {
        setError("예상매매가를 입력하세요.");
        setLoading(false);
        return;
      }
    } else if (isReferral) {
      const rate = feeRateNum ?? 0;
      if (rate < 0 || rate > 100 || Number.isNaN(rate)) {
        setError("소개비 수수료율(0~100%)을 입력하세요.");
        setLoading(false);
        return;
      }
      if (!amountUndecided && !estimateCheckRequired && (expectedNum == null || expectedNum <= 0)) {
        setError("예상금액을 입력하거나, '금액 미정(직접 견적)'을 선택해 주세요.");
        setLoading(false);
        return;
      }
    } else if (Number.isNaN(amount) || amount <= 0) {
      setError("지급 금액을 입력하세요.");
      setLoading(false);
      return;
    }
    if (!contactPhone.trim()) {
      setError("연락처를 입력하세요.");
      setLoading(false);
      return;
    }
    if (isStairs) {
      if (!(isReferral && estimateCheckRequired)) {
        const floorsNum = stairsFloors.trim() ? parseInt(stairsFloors.replace(/\D/g, ""), 10) : null;
        if (floorsNum == null || Number.isNaN(floorsNum) || floorsNum < 1 || floorsNum > 99) {
          setError("계단 청소는 층수(1~99)를 입력하세요.");
          setLoading(false);
          return;
        }
        const visits = visitsPerWeek.trim() ? parseInt(visitsPerWeek, 10) : null;
        if (visits == null || visits < 1 || visits > 7) {
          setError("주 횟수를 선택하세요.");
          setLoading(false);
          return;
        }
      }
    } else if (!isReferral) {
      const areaVal = areaPyeong.trim() ? parseFloat(areaPyeong.replace(/\D/g, "")) : null;
      if (areaVal == null || Number.isNaN(areaVal) || areaVal <= 0) {
        setError("현장 규모(평수 또는 제곱미터)를 입력하세요.");
        setLoading(false);
        return;
      }
      const visits = visitsPerWeek.trim() ? parseInt(visitsPerWeek, 10) : null;
      if (visits == null || visits < 1 || visits > 7) {
        setError("주 횟수를 선택하세요.");
        setLoading(false);
        return;
      }
    }
    const saleRegularDeal =
      isSaleRegular && monthly != null && monthly > 0 && (deal == null || deal <= 0) && mult != null && mult > 0
        ? Math.round(monthly * mult)
        : deal;
    const saleRegularMult =
      isSaleRegular && monthly != null && monthly > 0
        ? saleRegularDeal != null && saleRegularDeal > 0
          ? Math.round((saleRegularDeal / monthly) * 10) / 10
          : mult != null && mult > 0
            ? Math.round(mult * 10) / 10
            : undefined
        : undefined;
    const result = await createListing({
      listing_type: listingType,
      title: title.trim(),
      work_date: workDate.trim() || null,
      body: body.trim() || null,
      region: regionValue.trim(),
      category_group: categoryGroup,
      category_preset_key: categoryPresetKey,
      category_custom_text: isOtherCategory ? categoryCustomText.trim() || null : null,
      pay_amount: isSubcontract
        ? (monthly ?? 0)
        : isSaleOneTime
          ? (deal ?? 0)
          : isReferral
            ? (amountUndecided ? 0 : (expectedFeeAmount ?? 0))
            : isSaleRegular
              ? (monthly ?? saleRegularDeal ?? amount)
              : amount,
      pay_unit: payUnit,
      contact_phone: contactPhone.trim(),
      monthly_amount: isSaleOneTime ? undefined : monthly ?? undefined,
      deal_amount: isSaleRegular ? (saleRegularDeal ?? undefined) : deal ?? undefined,
      sale_multiplier: saleRegularMult,
      expected_amount: isReferral && !amountUndecided && !estimateCheckRequired ? (expectedNum ?? undefined) : undefined,
      fee_rate_percent: isReferral ? (feeRateNum ?? undefined) : undefined,
      area_pyeong: !isStairs && area != null && !Number.isNaN(area) && area > 0 ? area : undefined,
      visits_per_week:
        visits != null && !Number.isNaN(visits) && visits >= 1 && visits <= 7 ? visits : undefined,
      difficulty:
        !isStairs && (difficulty === "easy" || difficulty === "normal" || difficulty === "hard")
          ? difficulty
          : undefined,
      estimate_check_required: isReferral ? estimateCheckRequired : undefined,
      stairs_floors: isStairs && stairsFloors.trim() ? (parseInt(stairsFloors.replace(/\D/g, ""), 10) || undefined) : undefined,
      stairs_restroom_count: isStairs ? (stairsRestroomCount > 0 ? stairsRestroomCount : undefined) : undefined,
      stairs_has_recycle: isStairs ? stairsHasRecycle : undefined,
      stairs_has_corridor: isStairs ? stairsHasCorridor : undefined,
      stairs_elevator: isStairs ? stairsElevator : undefined,
      stairs_parking: isStairs ? stairsParking : undefined,
      stairs_window: isStairs ? stairsWindow : undefined,
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
        ← 현장 거래 목록
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">현장 거래</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</p>
        )}

        {/* STEP 1: 어떤 현장인가 — 유형 선택 시 업무 종류 펼침 */}
        <CollapsibleStepSection
          step={1}
          title="어떤 현장인가?"
          open={openStep1}
          onToggle={() => setOpenStep1((o) => !o)}
          summary={openStep1 ? null : [typeLabel, categoryGroup === "regular" ? "정기 청소" : categoryGroup === "one_time" ? "일회성 청소" : "", currentGroup ? (options.find((o) => o.key === categoryPresetKey)?.label ?? "") : ""].filter(Boolean).join(" · ") || undefined}
        >
          <p className="mb-3 text-sm text-slate-600">현장 거래 유형을 선택한 뒤, 업무 종류를 선택하세요.</p>
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700">현장 거래 유형</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRANSACTION_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                onClick={() => {
                  setTransactionType(t.value);
                  if (t.value === "subcontract" || t.value === "sale") setCategoryGroup("regular");
                }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    transactionType === t.value
                      ? "bg-blue-600 text-white"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          {transactionType && (
          <div className="mt-6 pt-4 border-t border-slate-100">
            <label className="block text-sm font-medium text-slate-700">업무 종류 *</label>
            <p className="mt-0.5 text-xs text-slate-500">
              정기 청소 / 일회성 청소 중 하나를 고른 뒤, 해당 업무(사무실청소, 계단청소 등)를 선택하세요.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => {
                  setCategoryGroup("regular");
                  const g = LISTING_CATEGORY_GROUPS.find((x) => x.id === "regular");
                  const first = g?.options.find((o) => o.key !== LISTING_CATEGORY_OTHER);
                  setCategoryPresetKey(first?.key ?? LISTING_CATEGORY_OTHER);
                  setCategoryCustomText("");
                  setOpenStep2(true);
                }}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  categoryGroup === "regular"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                정기 청소
              </button>
              <button
                type="button"
                disabled={regularOnly}
                title={regularOnly ? (isSaleOnly ? "매매는 정기 청소만 선택 가능합니다" : "도급은 정기 청소만 선택 가능합니다") : undefined}
                onClick={() => {
                  if (regularOnly) return;
                  setCategoryGroup("one_time");
                  const g = LISTING_CATEGORY_GROUPS.find((x) => x.id === "one_time");
                  const first = g?.options.find((o) => o.key !== LISTING_CATEGORY_OTHER);
                  setCategoryPresetKey(first?.key ?? LISTING_CATEGORY_OTHER);
                  setCategoryCustomText("");
                  setOpenStep2(true);
                }}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  categoryGroup === "one_time"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                } ${regularOnly ? "cursor-not-allowed opacity-50" : ""}`}
              >
                일회성 청소
              </button>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {options.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                  setCategoryPresetKey(opt.key);
                  setOpenStep2(true);
                }}
                  className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                    categoryPresetKey === opt.key
                      ? "bg-slate-700 text-white"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            {isOtherCategory && (
              <input
                type="text"
                value={categoryCustomText}
                onChange={(e) => setCategoryCustomText(e.target.value)}
                className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                placeholder="예: 간판청소, 태양광청소"
              />
            )}
          </div>
          )}
        </CollapsibleStepSection>

        {/* STEP 2: 어디 현장인가 — 업무 종류 선택 시 펼침 */}
        <CollapsibleStepSection
          step={2}
          title="어디 현장인가?"
          open={openStep2}
          onToggle={() => setOpenStep2((o) => !o)}
          summary={openStep2 ? null : (regionSido && effectiveGugun ? `${regionSido} ${effectiveGugun}` : undefined)}
        >
          <p className="mb-3 text-sm text-slate-600">지역(시·구)을 선택하세요.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700">시·도 *</label>
              <select
                value={regionSido}
                onChange={(e) => {
                  const nextSido = e.target.value as (typeof REGION_SIDO_LIST)[number];
                  setRegionSido(nextSido);
                  const nextGugunList = REGION_GUGUN[nextSido];
                  setRegionGugun(nextGugunList?.[0] ?? "");
                  setOpenStep3(true);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                required
              >
                {REGION_SIDO_LIST.map((sido) => (
                  <option key={sido} value={sido}>{sido}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">구·군 *</label>
              <select
                value={effectiveGugun}
                onChange={(e) => {
                  setRegionGugun(e.target.value);
                  setOpenStep3(true);
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                required
              >
                {gugunOptions.map((gu) => (
                  <option key={gu} value={gu}>{gu}</option>
                ))}
              </select>
            </div>
          </div>
        </CollapsibleStepSection>

        {/* STEP 3: 현장 규모 (견적 정보) — 계단 청소는 층수·옵션, 그 외는 평수·주회수·난이도 */}
        <CollapsibleStepSection
          step={3}
          title="현장 규모"
          open={openStep3}
          onToggle={() => setOpenStep3((o) => !o)}
          summary={openStep3 ? null : (areaPyeong || visitsPerWeek || stairsFloors ? [areaPyeong && `${areaPyeong}평`, visitsPerWeek && `주${visitsPerWeek}회`, stairsFloors && `${stairsFloors}층`].filter(Boolean).join(" · ") : undefined)}
        >
          {isStairs ? (
            <>
              <p className="mb-3 text-sm text-slate-600">계단 청소는 평수 대신 층수·주 회수·옵션으로 안내합니다. 견적계산기와 동일한 기준입니다.</p>
              {isReferral && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-2">견적 확인</label>
                  <button
                    type="button"
                    onClick={() => {
                      setEstimateCheckRequired((v) => !v);
                      if (!estimateCheckRequired) {
                        setAmountUndecided(true);
                        setExpectedAmount("");
                      }
                    }}
                    className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                      estimateCheckRequired
                        ? "bg-amber-500 text-white"
                        : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {estimateCheckRequired ? "견적 확인 필요 ✓" : "견적 확인 필요"}
                  </button>
                  <p className="mt-1 text-xs text-slate-500">선택 시 층수·주 회수·옵션은 입력하지 않고, 소개비 수수료율만 정합니다.</p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-700">층수 *</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={stairsFloors}
                    onChange={(e) => setStairsFloors(parseAmountInput(e.target.value))}
                    disabled={isReferral && estimateCheckRequired}
                    className="mt-1 w-full max-w-[8rem] rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    placeholder="예: 4"
                  />
                  <p className="mt-0.5 text-xs text-slate-500">4층 기준, 그 이상은 층당 추가 단가 적용</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">주 회수 *</label>
                  <select
                    value={visitsPerWeek}
                    onChange={(e) => setVisitsPerWeek(e.target.value)}
                    disabled={isReferral && estimateCheckRequired}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">선택</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>{n}회</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700">화장실 청소</label>
                  <input
                    type="number"
                    min={0}
                    value={stairsRestroomCount}
                    onChange={(e) => setStairsRestroomCount(Math.max(0, parseInt(e.target.value, 10) || 0))}
                    disabled={isReferral && estimateCheckRequired}
                    className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  />
                  <span className="ml-2 text-sm text-slate-600">개</span>
                </div>
                <div className="flex flex-wrap gap-4">
                  {[
                    { state: stairsHasRecycle, set: setStairsHasRecycle, label: "분리수거" },
                    { state: stairsHasCorridor, set: setStairsHasCorridor, label: "복도" },
                    { state: stairsElevator, set: setStairsElevator, label: "엘리베이터" },
                    { state: stairsParking, set: setStairsParking, label: "주차장" },
                    { state: stairsWindow, set: setStairsWindow, label: "창틀 먼지" },
                  ].map(({ state, set, label }) => (
                    <label key={label} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={state}
                        onChange={(e) => set(e.target.checked)}
                        disabled={isReferral && estimateCheckRequired}
                        className="rounded border-slate-300 disabled:opacity-50"
                      />
                      <span className="text-sm text-slate-700">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : isReferral ? (
            <>
              <p className="mb-3 text-sm text-slate-600">소개 현장은 구매자가 직접 현장을 확인할 수 있으므로, 견적 확인이 필요하면 아래 버튼을 선택하세요.</p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">견적 확인</label>
                <button
                  type="button"
                  onClick={() => {
                    setEstimateCheckRequired((v) => !v);
                    if (!estimateCheckRequired) {
                      setAmountUndecided(true);
                      setExpectedAmount("");
                    }
                  }}
                  className={`rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                    estimateCheckRequired
                      ? "bg-amber-500 text-white"
                      : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {estimateCheckRequired ? "견적 확인 필요 ✓" : "견적 확인 필요"}
                </button>
                <p className="mt-1 text-xs text-slate-500">선택 시 평수·주 회수·난이도·예상금액은 입력하지 않고, 소개비 수수료율만 정합니다.</p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">평수 / 제곱미터 (선택)</label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={areaUnit}
                      onChange={(e) => setAreaUnit(e.target.value as "pyeong" | "sqm")}
                      disabled={estimateCheckRequired}
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-slate-900 disabled:bg-slate-100 disabled:cursor-not-allowed"
                    >
                      <option value="pyeong">평수</option>
                      <option value="sqm">제곱미터(㎡)</option>
                    </select>
                    <input
                      type="text"
                      value={areaPyeong}
                      onChange={(e) => setAreaPyeong(parseAmountInput(e.target.value))}
                      disabled={estimateCheckRequired}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                      placeholder={areaUnit === "pyeong" ? "예: 50" : "예: 165"}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">주 회수 (선택)</label>
                  <select
                    value={visitsPerWeek}
                    onChange={(e) => setVisitsPerWeek(e.target.value)}
                    disabled={estimateCheckRequired}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">선택 안 함</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>{n}회</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">난이도 (선택)</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "easy" | "normal" | "hard" | "")}
                    disabled={estimateCheckRequired}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="">선택 안 함</option>
                    <option value="easy">쉬움</option>
                    <option value="normal">보통</option>
                    <option value="hard">어려움</option>
                  </select>
                </div>
              </div>
            </>
          ) : (
            <>
              <p className="mb-3 text-sm text-slate-600">매매/도급은 평수 또는 제곱미터, 주 횟수를 필수로 입력합니다.</p>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-700">평수 / 제곱미터 *</label>
                  <div className="mt-1 flex gap-2">
                    <select
                      value={areaUnit}
                      onChange={(e) => setAreaUnit(e.target.value as "pyeong" | "sqm")}
                      className="w-28 rounded-lg border border-slate-200 px-3 py-2 text-slate-900"
                    >
                      <option value="pyeong">평수</option>
                      <option value="sqm">제곱미터(㎡)</option>
                    </select>
                    <input
                      type="text"
                      value={areaPyeong}
                      onChange={(e) => setAreaPyeong(parseAmountInput(e.target.value))}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2"
                      placeholder={areaUnit === "pyeong" ? "예: 50" : "예: 165"}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700">주 횟수 *</label>
                  <select
                    value={visitsPerWeek}
                    onChange={(e) => setVisitsPerWeek(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    required
                  >
                    <option value="">선택</option>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <option key={n} value={n}>{n}회</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-sm font-medium text-slate-700">난이도 (선택)</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as "easy" | "normal" | "hard" | "")}
                    className="mt-1 w-full max-w-xs rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="">선택 안 함</option>
                    <option value="easy">쉬움</option>
                    <option value="normal">보통</option>
                    <option value="hard">어려움</option>
                  </select>
                </div>
              </div>
            </>
          )}
        </CollapsibleStepSection>

        {/* STEP 4: 금액 조건 (유형별) */}
        <CollapsibleStepSection
          step={4}
          title="금액 조건"
          open={openStep4}
          onToggle={() => setOpenStep4((o) => !o)}
          summary={openStep4 ? null : (monthlyAmount || dealAmount || expectedAmount || feeRatePercent ? "입력함" : undefined)}
        >
        {isSubcontract && (
          <div>
            <label className="block text-sm font-medium text-slate-700">월 도급금 *</label>
            <input
              type="text"
              value={formatAmountDisplay(monthlyAmount)}
              onChange={(e) => setMonthlyAmount(parseAmountInput(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="예: 800,000"
            />
            {monthlyAmount && <p className="mt-0.5 text-xs text-slate-500">{formatAmountDisplay(monthlyAmount)}원</p>}
            {(() => {
              const b = benchmarks.find((x) => x.metric_type === "monthly");
              return b && b.median_value != null ? (
                <p className="mt-1 text-xs text-slate-500">
                  참고: 중앙값 {formatAmountWon(Number(b.median_value))} (최근 {b.sample_count}건)
                  {b.fallback_level && b.fallback_level !== "exact" && (
                    <span className="ml-1 text-slate-400">
                      ({b.fallback_level === "main_category" ? "업종 기준" : "이 지역 기준"})
                    </span>
                  )}
                </p>
              ) : null;
            })()}
          </div>
        )}
        {isSaleOneTime && (
          <div>
            <label className="block text-sm font-medium text-slate-700">예상매매가 *</label>
            <input
              type="text"
              value={formatAmountDisplay(dealAmount)}
              onChange={(e) => setDealAmount(parseAmountInput(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="예: 3,000,000"
            />
            {dealAmount && <p className="mt-0.5 text-xs text-slate-500">{formatAmountDisplay(dealAmount)}원</p>}
            {(() => {
              const b = benchmarks.find((x) => x.metric_type === "deal");
              return b && b.median_value != null ? (
                <p className="mt-1 text-xs text-slate-500">
                  참고: 중앙값 {formatAmountWon(Number(b.median_value))} ({b.sample_count}건)
                  {b.fallback_level && b.fallback_level !== "exact" && (
                    <span className="ml-1 text-slate-400">
                      ({b.fallback_level === "main_category" ? "업종 기준" : "이 지역 기준"})
                    </span>
                  )}
                </p>
              ) : null;
            })()}
          </div>
        )}
        {isSaleRegular && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">월 수금 *</label>
              <input
                type="text"
                value={formatAmountDisplay(monthlyAmount)}
                onChange={(e) => {
                  const next = parseAmountInput(e.target.value);
                  setMonthlyAmount(next);
                  const monthlyNum = next.trim() ? parseFloat(next) : null;
                  const dealNum = dealAmount.trim() ? parseFloat(dealAmount) : null;
                  if (monthlyNum != null && monthlyNum > 0 && dealNum != null && dealNum > 0) {
                    setSaleMultiplier((dealNum / monthlyNum).toFixed(1));
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="예: 500,000"
              />
              {monthlyAmount && <p className="mt-0.5 text-xs text-slate-500">{formatAmountDisplay(monthlyAmount)}원</p>}
              {(() => {
                const monthlyNum = monthlyAmount.trim() ? parseFloat(parseAmountInput(monthlyAmount)) : null;
                const areaNum = areaPyeong.trim() ? parseFloat(parseAmountInput(areaPyeong)) : null;
                const perPyeong = monthlyNum != null && areaNum != null && areaNum > 0 ? Math.round(monthlyNum / areaNum) : null;
                return perPyeong != null ? (
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    평당 월 수금: 약 {formatMoney(perPyeong)}원
                  </p>
                ) : null;
              })()}
              {(() => {
                const b = benchmarks.find((x) => x.metric_type === "monthly");
                return b && b.median_value != null ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    참고: 중앙값 {formatAmountWon(Number(b.median_value))} ({b.sample_count}건)
                    {b.fallback_level && b.fallback_level !== "exact" && (
                      <span className="ml-1 text-slate-400">
                        ({b.fallback_level === "main_category" ? "업종 기준" : "이 지역 기준"})
                      </span>
                    )}
                  </p>
                ) : null;
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">매매가 (선택)</label>
              <input
                type="text"
                value={formatAmountDisplay(dealAmount)}
                onChange={(e) => {
                  const next = parseAmountInput(e.target.value);
                  setDealAmount(next);
                  const monthlyNum = monthlyAmount.trim() ? parseFloat(monthlyAmount) : null;
                  const dealNum = next.trim() ? parseFloat(next) : null;
                  if (monthlyNum != null && monthlyNum > 0 && dealNum != null && dealNum > 0) {
                    setSaleMultiplier((dealNum / monthlyNum).toFixed(1));
                  }
                }}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="예: 3,000,000"
              />
              {dealAmount && <p className="mt-0.5 text-xs text-slate-500">{formatAmountDisplay(dealAmount)}원</p>}
              {(() => {
                const monthlyNum = monthlyAmount.trim() ? parseFloat(parseAmountInput(monthlyAmount)) : null;
                const dealNum = dealAmount.trim() ? parseFloat(parseAmountInput(dealAmount)) : null;
                const autoMult = monthlyNum != null && monthlyNum > 0 && dealNum != null && dealNum > 0
                  ? (dealNum / monthlyNum).toFixed(1)
                  : null;
                return autoMult != null ? (
                  <p className="mt-1 text-sm font-medium text-slate-600">
                    시스템 자동 계산: {autoMult}배
                  </p>
                ) : null;
              })()}
              {(() => {
                const b = benchmarks.find((x) => x.metric_type === "deal");
                return b && b.median_value != null ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    참고: 중앙값 {formatAmountWon(Number(b.median_value))} ({b.sample_count}건)
                  </p>
                ) : null;
              })()}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">배수 (직접 입력 시 매매가 자동 계산)</label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.1}
                value={saleMultiplier}
                onChange={(e) => {
                  const next = e.target.value;
                  setSaleMultiplier(next);
                  const mult = next.trim() ? parseFloat(next) : null;
                  const monthlyNum = monthlyAmount.trim() ? parseFloat(parseAmountInput(monthlyAmount)) : null;
                  if (monthlyNum != null && monthlyNum > 0 && mult != null && mult > 0) {
                    setDealAmount(String(Math.round(monthlyNum * mult)));
                  }
                }}
                className="mt-1 w-24 rounded-lg border border-slate-200 px-3 py-2"
                placeholder="예: 2.5"
              />
              <span className="ml-2 text-sm text-slate-600">배</span>
              {(() => {
                const b = benchmarks.find((x) => x.metric_type === "multiplier");
                return b && b.median_value != null ? (
                  <p className="mt-1 text-xs text-slate-500">
                    참고: 중앙값 {Number(b.median_value).toFixed(1)}배 ({b.sample_count}건)
                    {b.fallback_level && b.fallback_level !== "exact" && (
                      <span className="ml-1 text-slate-400">
                        ({b.fallback_level === "main_category" ? "업종 기준" : "이 지역 기준"})
                      </span>
                    )}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        )}
        {isReferral && (
          <div className="space-y-4">
            {estimateCheckRequired ? (
              <p className="text-sm text-slate-600">견적 확인 필요를 선택했으므로 소개비 수수료율만 입력하세요.</p>
            ) : null}
            <div>
              <label className="block text-sm font-medium text-slate-700">예상금액 (성사 시 예상 금액) *</label>
              <input
                type="text"
                value={formatAmountDisplay(expectedAmount)}
                onChange={(e) => setExpectedAmount(parseAmountInput(e.target.value))}
                disabled={amountUndecided || estimateCheckRequired}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100 disabled:cursor-not-allowed"
                placeholder="예: 1,600,000"
              />
              {expectedAmount && !amountUndecided && !estimateCheckRequired && (
                <p className="mt-0.5 text-xs text-slate-500">{formatAmountDisplay(expectedAmount)}원</p>
              )}
              <label className={`mt-2 flex items-center gap-2 ${estimateCheckRequired ? "opacity-60 pointer-events-none" : ""}`}>
                <input
                  type="checkbox"
                  checked={amountUndecided}
                  onChange={(e) => setAmountUndecided(e.target.checked)}
                  disabled={estimateCheckRequired}
                  className="rounded border-slate-300"
                />
                <span className="text-sm text-slate-700">금액 미정(직접 견적)</span>
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">소개비 수수료율(0~100%) *</label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={feeRatePercent}
                  onChange={(e) => setFeeRatePercent(e.target.value)}
                  className="w-24 rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="10"
                />
                <button
                  type="button"
                  onClick={() => {
                    const n = feeRatePercent.trim() ? parseFloat(feeRatePercent.replace(/[^\d.]/g, "")) : 0;
                    setFeeRatePercent(String(Math.min(100, n + 5)));
                  }}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-300"
                >
                  +5%
                </button>
              </div>
              {feeRateNum != null && feeRateNum >= 0 && (
                <p className="mt-1 text-sm font-medium text-slate-700">
                  예상 수수료율 {feeRateNum}%
                  {expectedFeeAmount != null ? `, 약 ${formatMoney(expectedFeeAmount)}원` : amountUndecided ? " (금액 미정)" : ""}
                </p>
              )}
              {(() => {
                const b = benchmarks.find((x) => x.metric_type === "fee");
                return b && b.median_value != null ? (
                  <p className="mt-0.5 text-xs text-slate-500">
                    참고: 중앙값 {formatAmountWon(Number(b.median_value))} (표본 {b.sample_count}건)
                    {b.fallback_level && b.fallback_level !== "exact" && (
                      <span className="ml-1 text-slate-400">
                        ({b.fallback_level === "main_category" ? "업종 기준" : "이 지역 기준"})
                      </span>
                    )}
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        )}
        </CollapsibleStepSection>

        {/* STEP 5: 글 설명 — 제목(자동 제안) · 상세 · 연락처 · 일정 */}
        <CollapsibleStepSection
          step={5}
          title="글 설명"
          open={openStep5}
          onToggle={() => setOpenStep5((o) => !o)}
          summary={openStep5 ? null : (title ? `${title.slice(0, 30)}${title.length > 30 ? "…" : ""}` : undefined)}
        >
          <p className="mb-3 text-sm text-slate-600">현장을 정리했으니 제목과 설명을 적어 주세요. 제목은 입력 내용으로 자동 생성되며 수정할 수 있습니다.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder={suggestedTitle || "예: 강남 40평 사무실 정기청소 소개"}
                required
              />
              {suggestedTitle && title === suggestedTitle && (
                <p className="mt-1 text-xs text-slate-500">자동 생성된 제목입니다. 필요하면 수정하세요.</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">기타 상세 내용 (선택)</label>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="작업 조건, 시간, 장소 등"
              />
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
              <label className="block text-sm font-medium text-slate-700">일정 (작업 예정일) (선택)</label>
              <input
                type="date"
                value={workDate}
                onChange={(e) => setWorkDate(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              />
            </div>
          </div>
        </CollapsibleStepSection>
        {showSummary && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-700">입력 내용 요약</p>
            <p className="mt-1 text-slate-600">
              {TRANSACTION_TYPES.find((t) => t.value === transactionType)?.label} · {categoryGroup === "regular" ? "정기 청소" : "일회성 청소"}
              {currentGroup && ` · ${options.find((o) => o.key === categoryPresetKey)?.label ?? "기타"}`}
            </p>
            <p className="mt-1 text-slate-600">
              {regionSido} {effectiveGugun} · {title || "(제목 없음)"}
              {isReferral && (
                <>
                  {" · "}
                  {amountUndecided ? "금액 미정" : expectedFeeAmount != null ? `예상 수수료율 ${feeRateNum ?? "-"}%, 약 ${formatMoney(expectedFeeAmount)}원` : "수수료 입력 중"}
                </>
              )}
              {isSaleRegular && monthlyAmount && (
                <>
                  {" · "}
                  월 수금 {formatMoney(parseFloat(parseAmountInput(monthlyAmount)) || 0)}원
                  {dealAmount.trim() && (
                    <> · 매매가 {formatMoney(parseFloat(parseAmountInput(dealAmount)) || 0)}원</>
                  )}
                  {saleMultiplier.trim() && (
                    <> · 배수 {saleMultiplier}배</>
                  )}
                </>
              )}
              {isSaleOneTime && dealAmount && (
                <> · 예상매매가 {formatMoney(parseFloat(parseAmountInput(dealAmount)) || 0)}원</>
              )}
              {isSubcontract && monthlyAmount && (
                <> · 월 도급금 {formatMoney(parseFloat(parseAmountInput(monthlyAmount)) || 0)}원</>
              )}
            </p>
          </div>
        )}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setShowSummary((s) => !s)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {showSummary ? "요약 숨기기" : "입력 내용 확인"}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-900 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "등록 중…" : "등록하기"}
          </button>
        </div>
      </form>
    </div>
  );
}
