/**
 * 입찰 리포트: 공유 해금 시 심화 프리미엄 패널 중 무작위로 3개 노출 (고정 공개 제외).
 */

export const SHARED_RANDOM_PANEL_KEYS = [
  "week_compare",
  "drilldown",
  "agencies",
  "budget_bands",
  "anomalies",
] as const;

export type SharedRandomPanelKey = (typeof SHARED_RANDOM_PANEL_KEYS)[number];

const KEY_SET = new Set<string>(SHARED_RANDOM_PANEL_KEYS);

export function isSharedRandomPanelKey(k: string): k is SharedRandomPanelKey {
  return KEY_SET.has(k);
}

export const SHARED_RANDOM_PANEL_COUNT = 3;

function seedToUint32(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** KST 달력 YYYY-MM-DD 에서 days 만큼 이전 날짜 */
export function kstCalendarMinusDays(dateKst: string, days: number): string {
  const [y, mo, da] = dateKst.split("-").map((x) => parseInt(x, 10));
  const t = new Date(Date.UTC(y, mo - 1, da));
  t.setUTCDate(t.getUTCDate() - days);
  const yy = t.getUTCFullYear();
  const mm = String(t.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(t.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * 최근 7일(오늘 제외)에 노출된 패널 키를 피해, 시드 기준으로 3개 선택.
 * 피할 후보가 부족하면 전체 풀에서 채움.
 */
export function pickSharedRandomPanels(params: {
  userId: string;
  postId: string;
  grantDateKst: string;
  recentUnionKeys: Set<string>;
  take?: number;
}): SharedRandomPanelKey[] {
  const take = params.take ?? SHARED_RANDOM_PANEL_COUNT;
  const poolAll = [...SHARED_RANDOM_PANEL_KEYS];
  let preferred = poolAll.filter((k) => !params.recentUnionKeys.has(k));
  if (preferred.length < take) preferred = [...poolAll];

  const seedStr = `${params.userId}|${params.postId}|${params.grantDateKst}|shared-panels-v1`;
  const rng = mulberry32(seedToUint32(seedStr));
  const out: SharedRandomPanelKey[] = [];
  const bag = [...preferred];
  for (let i = 0; i < take && bag.length > 0; i++) {
    const idx = Math.floor(rng() * bag.length);
    const next = bag.splice(idx, 1)[0];
    if (next) out.push(next);
  }
  return out;
}

/** DB에 키가 없는 기존 행용: 최근 이력 없이 동일 시드로 3개 고정 */
export function legacySharedPanelsFromSeed(
  userId: string,
  postId: string,
  grantDateKst: string
): SharedRandomPanelKey[] {
  return pickSharedRandomPanels({
    userId,
    postId,
    grantDateKst,
    recentUnionKeys: new Set(),
    take: SHARED_RANDOM_PANEL_COUNT,
  });
}

export function sanitizeStoredPanelKeys(raw: string[] | null | undefined): SharedRandomPanelKey[] {
  if (!raw?.length) return [];
  const out: SharedRandomPanelKey[] = [];
  for (const k of raw) {
    if (isSharedRandomPanelKey(k) && !out.includes(k)) out.push(k);
  }
  return out;
}

/** DB에 저장된 키가 비었거나 부족할 때 시드로 3개를 맞춤 */
export function ensureSharedRevealKeys(
  userId: string,
  postId: string,
  grantDateKst: string,
  stored: string[] | null | undefined
): SharedRandomPanelKey[] {
  const s = sanitizeStoredPanelKeys(stored);
  if (s.length >= SHARED_RANDOM_PANEL_COUNT) return s.slice(0, SHARED_RANDOM_PANEL_COUNT);
  const leg = legacySharedPanelsFromSeed(userId, postId, grantDateKst);
  const merged: SharedRandomPanelKey[] = [...s];
  for (const k of leg) {
    if (!merged.includes(k)) merged.push(k);
    if (merged.length >= SHARED_RANDOM_PANEL_COUNT) break;
  }
  return merged.slice(0, SHARED_RANDOM_PANEL_COUNT);
}
