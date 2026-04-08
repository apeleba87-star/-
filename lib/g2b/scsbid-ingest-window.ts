/** 크론·수집 기본 lookback(분). `SCSBID_AWARD_CRON_LOOKBACK_MINUTES` 환경변수 없을 때 사용. */
export const SCSBID_AWARD_DEFAULT_LOOKBACK_MINUTES = 4 * 60 + 10;

/** 관리자 POST `/api/admin/ingest-scsbid-award-raw` 에서 허용하는 lookback 상한(분). 크론 환경변수 상한(14일)과 별개. */
export const SCSBID_AWARD_ADMIN_MAX_LOOKBACK_MINUTES = 60 * 24 * 60;

/** Vercel/로컬 환경변수로 크론 기본 lookback(분) 오버라이드 (상한 14일) */
export function getScsbidAwardDefaultLookbackMinutes(): number {
  const raw = process.env.SCSBID_AWARD_CRON_LOOKBACK_MINUTES?.trim();
  if (!raw) return SCSBID_AWARD_DEFAULT_LOOKBACK_MINUTES;
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return SCSBID_AWARD_DEFAULT_LOOKBACK_MINUTES;
  return Math.min(14 * 24 * 60, n);
}

/** `YYYYMMDDHHmm` (KST로 요청한 구간) → 사용자 안내용 짧은 문장 */
export function formatScsbidInqryRangeKstLabel(inqryBgnDt: string, inqryEndDt: string): string {
  const fmt = (s: string) => {
    const d = s.replace(/\D/g, "");
    if (d.length < 12) return s;
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)} ${d.slice(8, 10)}:${d.slice(10, 12)}`;
  };
  return `${fmt(inqryBgnDt)} ~ ${fmt(inqryEndDt)} (KST, API inqryBgnDt~inqryEndDt)`;
}

/** UI 문단용: lookback 길이를 한글로 */
export function describeScsbidLookbackDuration(lookbackMinutes: number): string {
  const h = Math.floor(lookbackMinutes / 60);
  const m = lookbackMinutes % 60;
  if (h > 0) return m > 0 ? `약 ${h}시간 ${m}분` : `약 ${h}시간`;
  return `약 ${lookbackMinutes}분`;
}
