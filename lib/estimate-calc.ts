/**
 * 견적 계산 로직 (면적·인건비) — 클라이언트에서도 사용 가능 (supabase 미참조)
 */

export const WEEKS_PER_MONTH = 4.3;
export const DAILY_UNLOCK_LIMIT = 5;
export const SQM_PER_PYEONG = 3.3;

export type EstimateConfig = {
  office_avg_unit_by_visits: number[];
  stairs_base_monthly: number;
  stairs_extra_per_floor: number;
  stairs_visit_multiplier: number[];
  office_restroom_per_unit: number;
  office_recycle_monthly: number;
  office_elevator_monthly: number;
  stairs_restroom_unit: number;
  stairs_elevator_monthly: number;
  stairs_parking_monthly: number;
  stairs_window_monthly: number;
  stairs_recycle_monthly: number;
};

export type AreaSubType = "office" | "stairs";

// ----- 정기 청소 (office) -----
export type OfficeInput = {
  pyeong: number;
  wonPerPyeong: number;
  visitsPerWeek: number;
  discountRate: number;
  restroomCount: number;
  restroomWon: number;
  recycle: boolean;
  recycleWon: number;
  elevator: boolean;
  elevatorWon: number;
  extraItems: { name: string; monthlyWon: number }[];
};

export type OfficeResult = {
  monthlyVisits: number;
  baseMonthly: number;
  restroomMonthly: number;
  recycleMonthly: number;
  elevatorMonthly: number;
  extraMonthly: number;
  subtotal: number;
  discountRate: number;
  monthlyTotal: number;
  breakdown: { label: string; amount: number }[];
};

export function calcOffice(input: OfficeInput, config: EstimateConfig): OfficeResult {
  const monthlyVisits = input.visitsPerWeek * WEEKS_PER_MONTH;
  const baseMonthly = input.pyeong * input.wonPerPyeong * monthlyVisits;
  const restroomMonthly = input.restroomCount * (input.restroomWon || config.office_restroom_per_unit);
  const recycleMonthly = input.recycle ? (input.recycleWon || config.office_recycle_monthly) : 0;
  const elevatorMonthly = input.elevator ? (input.elevatorWon || config.office_elevator_monthly) : 0;
  const extraMonthly = input.extraItems.reduce((s, i) => s + (i.monthlyWon || 0), 0);
  const subtotal = baseMonthly + restroomMonthly + recycleMonthly + elevatorMonthly + extraMonthly;
  const monthlyTotal = Math.round(subtotal * (1 - input.discountRate / 100));

  const breakdown: { label: string; amount: number }[] = [
    { label: "기본 (면적×평당×방문)", amount: Math.round(baseMonthly) },
    { label: "화장실", amount: Math.round(restroomMonthly) },
    { label: "분리수거", amount: Math.round(recycleMonthly) },
    { label: "엘리베이터", amount: Math.round(elevatorMonthly) },
  ];
  input.extraItems.forEach((i) => {
    if (i.monthlyWon) breakdown.push({ label: i.name || "추가", amount: i.monthlyWon });
  });
  breakdown.push({ label: "소계", amount: Math.round(subtotal) });
  if (input.discountRate > 0) {
    breakdown.push({ label: `할인 ${input.discountRate}%`, amount: -Math.round(subtotal - monthlyTotal) });
  }
  breakdown.push({ label: "결과", amount: monthlyTotal });

  return {
    monthlyVisits,
    baseMonthly,
    restroomMonthly,
    recycleMonthly,
    elevatorMonthly,
    extraMonthly,
    subtotal,
    discountRate: input.discountRate,
    monthlyTotal,
    breakdown,
  };
}

// ----- 계단 청소 (stairs) -----
export type StairsInput = {
  floors: number;
  visitsPerWeek: number;
  discountRate: number;
  restroomCount: number;
  restroomWon: number;
  elevator: boolean;
  elevatorWon: number;
  parking: boolean;
  parkingWon: number;
  window: boolean;
  windowWon: number;
  recycle: boolean;
  recycleWon: number;
  extraItems: { name: string; monthlyWon: number }[];
};

export type StairsResult = {
  base1Visit: number;
  baseMonthly: number;
  optionsMonthly: number;
  subtotal: number;
  monthlyTotal: number;
  breakdown: { label: string; amount: number }[];
};

export function calcStairs(input: StairsInput, config: EstimateConfig): StairsResult {
  const base1Visit = config.stairs_base_monthly + Math.max(0, (input.floors || 4) - 4) * config.stairs_extra_per_floor;
  const baseMonthly = base1Visit * (input.visitsPerWeek || 1);
  const restroom = input.restroomCount * (input.restroomWon || config.stairs_restroom_unit);
  const elevator = input.elevator ? (input.elevatorWon || config.stairs_elevator_monthly) : 0;
  const parking = input.parking ? (input.parkingWon || config.stairs_parking_monthly) : 0;
  const window = input.window ? (input.windowWon || config.stairs_window_monthly) : 0;
  const recycle = input.recycle ? (input.recycleWon || config.stairs_recycle_monthly) : 0;
  const extra = input.extraItems.reduce((s, i) => s + (i.monthlyWon || 0), 0);
  const optionsMonthly = restroom + elevator + parking + window + recycle + extra;
  const subtotal = baseMonthly + optionsMonthly;
  const monthlyTotal = Math.round(subtotal * (1 - input.discountRate / 100));

  const breakdown: { label: string; amount: number }[] = [
    { label: "기본 (계단)", amount: Math.round(baseMonthly) },
    { label: "화장실", amount: Math.round(restroom) },
    { label: "엘리베이터", amount: Math.round(elevator) },
    { label: "주차장", amount: Math.round(parking) },
    { label: "창틀", amount: Math.round(window) },
    { label: "분리수거", amount: Math.round(recycle) },
  ];
  input.extraItems.forEach((i) => {
    if (i.monthlyWon) breakdown.push({ label: i.name || "추가", amount: i.monthlyWon });
  });
  breakdown.push({ label: "소계", amount: Math.round(subtotal) });
  if (input.discountRate > 0) {
    breakdown.push({ label: `할인 ${input.discountRate}%`, amount: -Math.round(subtotal - monthlyTotal) });
  }
  breakdown.push({ label: "결과", amount: monthlyTotal });

  return { base1Visit, baseMonthly, optionsMonthly, subtotal, monthlyTotal, breakdown };
}

// ----- 인건비 -----
export type LaborInput = {
  fullTimeHourly: number;
  fullTimeCount: number;
  partTimeHourly: number;
  partTimeCount: number;
  workHours: number;
  workMinutes: number;
  visitsPerWeek: number;
  marginRate: number;
};

export type LaborResult = {
  costPerVisit: number;
  monthlyVisits: number;
  fullTimeMonthly: number;
  partTimeMonthly: number;
  laborMonthly: number;
  recommendedTotal: number;
  breakdown: { label: string; amount: number }[];
};

export function calcLabor(input: LaborInput): LaborResult {
  const workTimeHours = (input.workHours || 0) + (input.workMinutes || 0) / 60;
  const costPerVisit =
    (input.fullTimeHourly * (input.fullTimeCount || 0) + input.partTimeHourly * (input.partTimeCount || 0)) * workTimeHours;
  const monthlyVisits = (input.visitsPerWeek || 1) * WEEKS_PER_MONTH;
  const fullTimeMonthly =
    (input.fullTimeHourly * (input.fullTimeCount || 0) * workTimeHours * monthlyVisits) || 0;
  const partTimeMonthly =
    (input.partTimeHourly * (input.partTimeCount || 0) * workTimeHours * monthlyVisits) || 0;
  const laborMonthly = costPerVisit * monthlyVisits;
  const recommendedTotal = Math.round(laborMonthly * (1 + (input.marginRate || 0) / 100));

  const breakdown: { label: string; amount: number }[] = [
    { label: "정직원 월 인건비", amount: Math.round(fullTimeMonthly) },
    { label: "알바 월 인건비", amount: Math.round(partTimeMonthly) },
    { label: "소계", amount: Math.round(laborMonthly) },
    { label: `마진 ${input.marginRate}%`, amount: Math.round(recommendedTotal - laborMonthly) },
    { label: "권장 견적", amount: recommendedTotal },
  ];

  return {
    costPerVisit,
    monthlyVisits,
    fullTimeMonthly,
    partTimeMonthly,
    laborMonthly,
    recommendedTotal,
    breakdown,
  };
}

// ----- 업계 대비 판정 -----
export type VerdictType = "low" | "slightlyLow" | "avg" | "slightlyHigh" | "high";

export function getVerdict(diffRate: number): { type: VerdictType; isExtreme: boolean } {
  const isExtreme = diffRate <= -0.7 || diffRate >= 2.0;
  if (diffRate <= -0.15) return { type: "low", isExtreme };
  if (diffRate < -0.05) return { type: "slightlyLow", isExtreme };
  if (diffRate <= 0.05) return { type: "avg", isExtreme };
  if (diffRate <= 0.15) return { type: "slightlyHigh", isExtreme };
  return { type: "high", isExtreme };
}

export function calcOfficeComparison(
  monthlyTotal: number,
  monthlyVisits: number,
  pyeong: number,
  visitsPerWeek: number,
  config: EstimateConfig
): { avgUnit: number; userUnit: number; avgAmount: number; diffRate: number; verdict: VerdictType; isExtreme: boolean } {
  const arr = config.office_avg_unit_by_visits;
  const idx = Math.min(Math.max(visitsPerWeek - 1, 0), (arr?.length ?? 1) - 1);
  const avgUnit = arr?.[idx] ?? 2000;
  const userUnit = pyeong && monthlyVisits ? monthlyTotal / monthlyVisits / pyeong : 0;
  const avgAmount = pyeong && monthlyVisits ? avgUnit * monthlyVisits * pyeong : 0;
  const diffRate = avgAmount ? (userUnit - avgUnit) / avgUnit : 0;
  const { type: verdict, isExtreme } = getVerdict(diffRate);
  return { avgUnit, userUnit, avgAmount, diffRate, verdict, isExtreme };
}

export function calcStairsComparison(
  monthlyTotal: number,
  floors: number,
  visitsPerWeek: number,
  optionsSum: number,
  config: EstimateConfig
): { avgAmount: number; diffRate: number; verdict: VerdictType; isExtreme: boolean } {
  const base1 = config.stairs_base_monthly + Math.max(0, (floors || 4) - 4) * config.stairs_extra_per_floor;
  const basePerWeek = base1 + optionsSum;
  const mult = config.stairs_visit_multiplier;
  const idx = Math.min(Math.max(visitsPerWeek - 1, 0), (mult?.length ?? 1) - 1);
  const avgAmount = Math.round(basePerWeek * (mult?.[idx] ?? 1));
  const diffRate = avgAmount ? (monthlyTotal - avgAmount) / avgAmount : 0;
  const { type: verdict, isExtreme } = getVerdict(diffRate);
  return { avgAmount, diffRate, verdict, isExtreme };
}

export const JUDGE_LABELS: Record<VerdictType, string> = {
  low: "업계 평균보다 낮은 견적입니다. 인건비·품질을 한 번 더 확인해 보세요.",
  slightlyLow: "업계 평균보다 다소 낮은 수준입니다. 마진이 충분한지 확인해 보세요.",
  avg: "업계 평균 수준의 견적입니다.",
  slightlyHigh: "업계 평균보다 다소 높은 수준입니다. 서비스·품질로 설득할 수 있는 구간입니다.",
  high: "업계 평균보다 높은 견적입니다. 단가 근거(서비스 범위·품질)를 명확히 하는 것이 좋습니다.",
};

export const JUDGE_TITLES: Record<VerdictType, string> = {
  low: "돌격 수주형",
  slightlyLow: "공격적 확장형",
  avg: "표준 운영형",
  slightlyHigh: "전략적 수익형",
  high: "프리미엄 운영형",
};

export type JudgeBlock = { title: string; items?: string[]; body?: string };

export const JUDGE_TYPES: Record<
  VerdictType,
  { emoji: string; title: string; tagline: string; tagline2?: string; blocks: JudgeBlock[] }
> = {
  low: {
    emoji: "💪",
    title: "돌격 수주형",
    tagline: "일단 계약부터 따내자.",
    tagline2: "당신은 현장에서 승부를 보는 대표입니다.",
    blocks: [
      { title: "이런 특징이 있습니다", items: ["가격 경쟁에서 밀리지 않음", "수주 성사율이 높은 편", "빠르게 거래처를 확보하는 스타일"] },
      { title: "하지만 한 가지 질문이 있습니다.", body: "이 구조로 1년을 버틸 수 있습니까?" },
      { title: "장기적으로 생길 수 있는 문제", items: ["인건비가 조금만 올라가도 압박", "직원 이탈 시 바로 흔들림", "대표의 체력에 의존하는 구조"] },
      { title: "지금 필요한 것", body: "감(感)이 아니라\n최소 유지 가능한 단가를 정확히 아는 것입니다." },
    ],
  },
  slightlyLow: {
    emoji: "⚡",
    title: "공격적 확장형",
    tagline: "지금은 시장을 넓히는 시기입니다.",
    tagline2: "당신은 확장을 선택한 대표입니다.",
    blocks: [
      { title: "이런 운영 스타일입니다", items: ["시장 점유를 우선하는 단가", "신규 수주에 강점", "규모 확대 단계"] },
      { title: "하지만 확장이 커질수록", body: "관리도 커집니다." },
      { title: "놓치기 쉬운 부분", items: ["고정비·간접비 반영", "품질 유지 비용", "재계약 시 단가 협상력"] },
      { title: "지금 필요한 것", body: "수주보다 중요한 건 구조 점검입니다." },
    ],
  },
  avg: {
    emoji: "🧱",
    title: "표준 운영형",
    tagline: "시장 흐름에 맞춰 안정적으로 운영 중입니다.",
    blocks: [
      { title: "이런 특징이 있습니다", items: ["업계 수준과 비슷한 단가", "수주·마진 균형", "예측 가능한 수익 구조"] },
      { title: "현재는 균형 상태입니다.", body: "유지하면서 점진적 개선을 노려보세요." },
      { title: "기회 요소", items: ["옵션·부가 서비스로 단가 상향", "장기 계약 시 할인 폭 조정", "지역/업종 특화"] },
      { title: "같은 구조라도", body: "서비스 품질과 신뢰로 차별화할 수 있습니다." },
    ],
  },
  slightlyHigh: {
    emoji: "🎯",
    title: "전략적 수익형",
    tagline: "단가를 방어할 줄 아는 대표입니다.",
    blocks: [
      { title: "이런 운영을 하고 있습니다", items: ["평균 이상 단가 유지", "품질·관리 수준 대비 가격", "선택적 수주"] },
      { title: "좋은 구간입니다.", body: "서비스 범위와 근거를 명확히 하면 설득력이 올라갑니다." },
      { title: "유지 조건", items: ["범위·품질 문서화", "실적·리뷰 활용", "재계약 시 가치 재설명"] },
      { title: "단가는 설득으로 만들고,", body: "유지하려면 증명이 필요합니다." },
    ],
  },
  high: {
    emoji: "👑",
    title: "프리미엄 운영형",
    tagline: "가격이 아니라 관리 체계로 계약하는 구조입니다.",
    blocks: [
      { title: "이런 특징이 있습니다", items: ["업계 상위 단가", "품질·신뢰 기반 수주", "프리미엄 포지셔닝"] },
      { title: "이 단계는", body: '"설명"이 아니라 "증명"이 필요합니다.' },
      { title: "반드시 필요한 것", items: ["체계적 품질 관리", "데이터·실적 정리", "고객 만족도 유지"] },
      { title: "프리미엄 단가는", body: "지속적인 서비스 증명으로만 유지됩니다." },
    ],
  },
};

export const JUDGE_STYLES: Record<VerdictType, { bg: string; border: string; borderL: string; icon: string; text: string }> = {
  low: { bg: "bg-red-50", border: "border-red-200", borderL: "border-l-red-500", icon: "text-red-600", text: "text-red-800" },
  slightlyLow: { bg: "bg-orange-50", border: "border-orange-200", borderL: "border-l-orange-500", icon: "text-orange-600", text: "text-orange-800" },
  avg: { bg: "bg-green-50", border: "border-green-200", borderL: "border-l-green-500", icon: "text-green-600", text: "text-green-800" },
  slightlyHigh: { bg: "bg-blue-50", border: "border-blue-200", borderL: "border-l-blue-500", icon: "text-blue-600", text: "text-blue-800" },
  high: { bg: "bg-purple-50", border: "border-purple-200", borderL: "border-l-purple-500", icon: "text-purple-600", text: "text-purple-800" },
};

export function formatWon(n: number): string {
  return `${Math.round(n).toLocaleString()} 원`;
}
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString();
}
