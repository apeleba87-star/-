"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createListing, getListingBenchmarks, type ListingBenchmarkRow } from "./actions";
import { REGION_SIDO_LIST, REGION_GUGUN, formatRegionForDb } from "@/lib/listings/regions";
import {
  LISTING_CATEGORY_GROUPS,
  LISTING_CATEGORY_OTHER,
  type ListingCategoryGroupId,
} from "@/lib/listings/listing-category-presets";

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}만`;
  return n.toLocaleString();
}

/** 현장 거래 전용 (인력 구인은 /jobs/new에서 작성) */

/** 현장거래 하위 유형 */
const FIELD_DEAL_TYPES = [
  { value: "referral_regular", label: "정기청소 소개" },
  { value: "referral_one_time", label: "일회성 소개" },
  { value: "sale_regular", label: "정기청소 매매" },
  { value: "sale_one_time", label: "일회성 매매" },
  { value: "subcontract", label: "현장 도급" },
] as const;

const PAY_UNITS = [
  { value: "day", label: "일당" },
  { value: "half_day", label: "반당" },
  { value: "hour", label: "시급" },
] as const;

type Props = {
  mainCategories: { id: string }[];
  subCategories?: unknown[];
};

export default function NewListingForm({ mainCategories }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
  const [categoryGroup, setCategoryGroup] = useState<ListingCategoryGroupId>("regular");
  const currentGroup = LISTING_CATEGORY_GROUPS.find((g) => g.id === categoryGroup);
  const [categoryPresetKey, setCategoryPresetKey] = useState<string>(
    currentGroup?.options.find((o) => o.key !== LISTING_CATEGORY_OTHER)?.key ?? "office"
  );
  const [categoryCustomText, setCategoryCustomText] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payUnit, setPayUnit] = useState("day");
  const [monthlyAmount, setMonthlyAmount] = useState("");
  const [dealAmount, setDealAmount] = useState("");
  const [expectedAmount, setExpectedAmount] = useState("");
  const [amountUndecided, setAmountUndecided] = useState(false);
  const [feeRatePercent, setFeeRatePercent] = useState("");
  const [areaPyeong, setAreaPyeong] = useState("");
  const [visitsPerWeek, setVisitsPerWeek] = useState("");
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard" | "">("");
  const [contactPhone, setContactPhone] = useState("");
  const [benchmarks, setBenchmarks] = useState<ListingBenchmarkRow[]>([]);
  const [showSummary, setShowSummary] = useState(false);

  const listingType = fieldDealType;
  const isReferral = listingType === "referral_regular" || listingType === "referral_one_time";
  const isSale = listingType === "sale_regular" || listingType === "sale_one_time";
  const isSaleRegular = listingType === "sale_regular";
  const isSaleOneTime = listingType === "sale_one_time";
  const isSubcontract = listingType === "subcontract";

  const expectedNum = expectedAmount.trim() ? parseFloat(expectedAmount.replace(/[^\d.]/g, "")) : null;
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const amount = parseFloat(payAmount.replace(/[^\d.]/g, ""));
    const monthly = monthlyAmount.trim() ? parseFloat(monthlyAmount.replace(/[^\d.]/g, "")) : null;
    const deal = dealAmount.trim() ? parseFloat(dealAmount.replace(/[^\d.]/g, "")) : null;
    const area = areaPyeong.trim() ? parseFloat(areaPyeong.replace(/[^\d.]/g, "")) : null;
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
      if ((monthly == null || Number.isNaN(monthly) || monthly <= 0) && (deal == null || Number.isNaN(deal) || deal <= 0)) {
        setError("월 수금 또는 매매가 중 하나 이상 입력하세요.");
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
      if (!amountUndecided && (expectedNum == null || expectedNum <= 0)) {
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
              ? (monthly ?? deal ?? amount)
              : amount,
      pay_unit: payUnit,
      contact_phone: contactPhone.trim(),
      monthly_amount: isSaleOneTime ? undefined : monthly ?? undefined,
      deal_amount: deal ?? undefined,
      expected_amount: isReferral && !amountUndecided ? (expectedNum ?? undefined) : undefined,
      fee_rate_percent: isReferral ? (feeRateNum ?? undefined) : undefined,
      area_pyeong: area != null && !Number.isNaN(area) && area > 0 ? area : undefined,
      visits_per_week:
        visits != null && !Number.isNaN(visits) && visits >= 1 && visits <= 7 ? visits : undefined,
      difficulty:
        difficulty === "easy" || difficulty === "normal" || difficulty === "hard"
          ? difficulty
          : undefined,
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
      <h1 className="mb-6 text-2xl font-bold text-slate-900">글쓰기 · 현장 거래</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        {error && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
        )}

        <section className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <label className="block text-sm font-medium text-slate-700">현장 거래 유형</label>
          <select
            value={fieldDealType}
            onChange={(e) => setFieldDealType(e.target.value as typeof fieldDealType)}
            className="mt-2 w-full max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-900"
          >
            {FIELD_DEAL_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </section>

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
          <label className="block text-sm font-medium text-slate-700">일정 (작업 예정일) (선택)</label>
          <input
            type="date"
            value={workDate}
            onChange={(e) => setWorkDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </div>
        <section className="rounded-lg border border-slate-200 bg-slate-50/50 p-4">
          <label className="block text-sm font-medium text-slate-700">업무 종류 *</label>
          <p className="mt-0.5 text-xs text-slate-500">
            정기청소 / 일회성 청소 중 하나를 고른 뒤, 해당 업무를 선택하세요.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {LISTING_CATEGORY_GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setCategoryGroup(g.id);
                  const first = g.options.find((o) => o.key !== LISTING_CATEGORY_OTHER);
                  setCategoryPresetKey(first?.key ?? LISTING_CATEGORY_OTHER);
                  setCategoryCustomText("");
                }}
                className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                  categoryGroup === g.id
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {options.map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => setCategoryPresetKey(opt.key)}
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
        </section>
        {/* 유형별 금액 입력 + 시장 참고값 */}
        {isSubcontract && (
          <div>
            <label className="block text-sm font-medium text-slate-700">월 도급금 *</label>
            <input
              type="text"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="예: 800000"
            />
            {(() => {
              const b = benchmarks.find((x) => x.metric_type === "monthly");
              return b && b.median_value != null ? (
                <p className="mt-1 text-xs text-slate-500">
                  참고: 중앙값 {formatMoney(Number(b.median_value))}원 (최근 {b.sample_count}건)
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
              value={dealAmount}
              onChange={(e) => setDealAmount(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="예: 3000000"
            />
            {(() => {
              const b = benchmarks.find((x) => x.metric_type === "deal");
              return b && b.median_value != null ? (
                <p className="mt-1 text-xs text-slate-500">
                  참고: 중앙값 {formatMoney(Number(b.median_value))}원 ({b.sample_count}건)
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
                value={monthlyAmount}
                onChange={(e) => setMonthlyAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="예: 500000"
              />
              {(() => {
                const monthlyNum = monthlyAmount.trim() ? parseFloat(monthlyAmount.replace(/[^\d.]/g, "")) : null;
                const areaNum = areaPyeong.trim() ? parseFloat(areaPyeong.replace(/[^\d.]/g, "")) : null;
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
                    참고: 중앙값 {formatMoney(Number(b.median_value))}원 ({b.sample_count}건)
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
                value={dealAmount}
                onChange={(e) => setDealAmount(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="예: 3000000"
              />
              {(() => {
                const b = benchmarks.find((x) => x.metric_type === "deal");
                return b && b.median_value != null ? (
                  <p className="mt-1 text-xs text-slate-500">
                    참고: 중앙값 {formatMoney(Number(b.median_value))}원 ({b.sample_count}건)
                  </p>
                ) : null;
              })()}
            </div>
          </div>
        )}
        {isReferral && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">예상금액 (성사 시 예상 금액) *</label>
              <input
                type="text"
                value={expectedAmount}
                onChange={(e) => setExpectedAmount(e.target.value)}
                disabled={amountUndecided}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-100"
                placeholder="예: 1600000"
              />
              <label className="mt-2 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={amountUndecided}
                  onChange={(e) => setAmountUndecided(e.target.checked)}
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
                    참고: 중앙값 {formatMoney(Number(b.median_value))}원 ({b.sample_count}건)
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

        {/* 선택: 평수, 주 회수, 난이도 */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-700">평수 (선택)</label>
            <input
              type="text"
              value={areaPyeong}
              onChange={(e) => setAreaPyeong(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
              placeholder="예: 50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">주 회수 (선택)</label>
            <select
              value={visitsPerWeek}
              onChange={(e) => setVisitsPerWeek(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
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
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            >
              <option value="">선택 안 함</option>
              <option value="easy">쉬움</option>
              <option value="normal">보통</option>
              <option value="hard">어려움</option>
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
          <label className="block text-sm font-medium text-slate-700">기타 상세 내용 (선택)</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
            placeholder="작업 조건, 시간, 장소 등"
          />
        </div>
        {showSummary && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
            <p className="font-medium text-slate-700">입력 내용 요약</p>
            <p className="mt-1 text-slate-600">
              {regionSido} {effectiveGugun} · {title || "(제목 없음)"}
              {isReferral && (
                <>
                  {" · "}
                  {amountUndecided ? "금액 미정" : expectedFeeAmount != null ? `예상 수수료율 ${feeRateNum ?? "-"}%, 약 ${formatMoney(expectedFeeAmount)}원` : "수수료 입력 중"}
                </>
              )}
              {isSaleRegular && monthlyAmount && (
                <> · 월 수금 {formatMoney(parseFloat(monthlyAmount.replace(/[^\d.]/g, "")) || 0)}원</>
              )}
              {isSaleOneTime && dealAmount && (
                <> · 예상매매가 {formatMoney(parseFloat(dealAmount.replace(/[^\d.]/g, "")) || 0)}원</>
              )}
              {isSubcontract && monthlyAmount && (
                <> · 월 도급금 {formatMoney(parseFloat(monthlyAmount.replace(/[^\d.]/g, "")) || 0)}원</>
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
