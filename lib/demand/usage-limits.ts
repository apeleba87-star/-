/** 로그인 사용자 — KST 하루 지역 full view 횟수 (동일 지역 재조회는 1회) */
export const DEMAND_DAILY_REGION_VIEW_LIMIT = 5;

export type DemandAccessTier = "guest" | "member" | "admin";

export type DemandUsageAccess = {
  tier: DemandAccessTier;
  dailyLimit: number;
  usedCount: number;
  remaining: number;
  unlockedRegionKeys: string[];
  /** 숫자·차트 등 실데이터 열람 가능 */
  canViewData: boolean;
};

export const DEMAND_USAGE_GUEST_MESSAGE =
  "로그인하면 하루 5개 지역의 입주·거래·검색 데이터를 확인할 수 있습니다.";

export const DEMAND_USAGE_QUOTA_MESSAGE =
  "오늘 확인 가능한 지역(5곳)을 모두 사용했습니다. 내일 0시(KST)에 다시 열립니다.";

export const DEMAND_USAGE_REGION_BLIND_HINT = "지역별 수치는 로그인 후 확인 · 하루 5곳";

export const DEMAND_USAGE_SHARE_TEASER_HINT =
  "공유 링크 미리보기 — 입주 예상 점수·거래 건수만 표시됩니다. 로그인하면 검색·그래프까지 전체 데이터를 볼 수 있습니다.";

export const DEMAND_USAGE_REGION_QUOTA_HINT = "오늘 확인 횟수를 초과한 지역입니다.";

export function isDemandRegionKeyUnlocked(access: DemandUsageAccess, regionKey: string): boolean {
  if (access.tier === "admin") return true;
  if (access.tier === "guest") return false;
  return access.unlockedRegionKeys.includes(regionKey);
}

function memberAccessWithKeys(unlockedRegionKeys: string[]): DemandUsageAccess {
  const usedCount = unlockedRegionKeys.length;
  return {
    tier: "member",
    dailyLimit: DEMAND_DAILY_REGION_VIEW_LIMIT,
    usedCount,
    remaining: Math.max(0, DEMAND_DAILY_REGION_VIEW_LIMIT - usedCount),
    unlockedRegionKeys,
    canViewData: true,
  };
}

/** 회원 새 지역 선택 직후 blur 플래시 방지 — remaining > 0 일 때만 */
export function optimisticallyUnlockDemandRegion(
  access: DemandUsageAccess,
  regionKey: string
): DemandUsageAccess | null {
  if (access.tier !== "member") return null;
  if (isDemandRegionKeyUnlocked(access, regionKey)) return null;
  if (access.remaining <= 0) return null;
  return memberAccessWithKeys([...access.unlockedRegionKeys, regionKey]);
}

/** API 거부·실패 시 낙관 unlock 롤백 */
export function removeDemandRegionUnlock(
  access: DemandUsageAccess,
  regionKey: string
): DemandUsageAccess {
  if (access.tier !== "member") return access;
  if (!access.unlockedRegionKeys.includes(regionKey)) return access;
  return memberAccessWithKeys(access.unlockedRegionKeys.filter((k) => k !== regionKey));
}

/** region-scope API 응답 병합 — quotaBlockedKeys는 unlock 목록에서 제외 */
export function applyDemandRegionScopeAccess(
  prev: DemandUsageAccess,
  response: { access: DemandUsageAccess; quotaBlockedKeys: string[] }
): DemandUsageAccess {
  let next = mergeDemandAccess(prev, response.access);
  for (const key of response.quotaBlockedKeys) {
    next = removeDemandRegionUnlock(next, key);
  }
  return next;
}

const ACCESS_TIER_RANK: Record<DemandAccessTier, number> = {
  guest: 0,
  member: 1,
  admin: 2,
};

/** API·SSR 응답 병합 — tier 하향·unlock 목록 유실 방지 */
export function mergeDemandAccess(
  prev: DemandUsageAccess,
  next: DemandUsageAccess
): DemandUsageAccess {
  const prevRank = ACCESS_TIER_RANK[prev.tier];
  const nextRank = ACCESS_TIER_RANK[next.tier];
  if (nextRank > prevRank) return next;
  if (nextRank < prevRank) return prev;

  if (next.tier === "member") {
    const unlockedRegionKeys = [
      ...new Set([...prev.unlockedRegionKeys, ...next.unlockedRegionKeys]),
    ];
    const usedCount = unlockedRegionKeys.length;
    return {
      tier: "member",
      dailyLimit: DEMAND_DAILY_REGION_VIEW_LIMIT,
      usedCount,
      remaining: Math.max(0, DEMAND_DAILY_REGION_VIEW_LIMIT - usedCount),
      unlockedRegionKeys,
      canViewData: true,
    };
  }

  return next;
}