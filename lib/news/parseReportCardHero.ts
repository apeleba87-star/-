/**
 * 입찰 리포트 목록 카드 상단(히어로)용: excerpt에서 건수·한 줄 힌트 추출.
 * 일간: "오늘 … 입찰 N건과 예산 상위…" / 주간 등: "입찰은 N건, 추정 규모 …"
 */
export type ReportCardHeroParsed = {
  count: number | null;
  subtitle: string | null;
};

export function parseReportCardHeroFromExcerpt(
  excerpt: string | null | undefined
): ReportCardHeroParsed {
  if (!excerpt?.trim()) return { count: null, subtitle: null };
  const text = excerpt.trim();

  const countMatch = text.match(/입찰(?:은)?\s*([\d,]+)\s*건/);
  let count: number | null = null;
  if (countMatch) {
    const n = parseInt(countMatch[1].replace(/,/g, ""), 10);
    if (!Number.isNaN(n) && n >= 0) count = n;
  }

  let subtitle: string | null = null;
  const budgetM = text.match(/추정\s*규모\s*([^,이으며]+)/);
  if (budgetM) {
    subtitle = `추정 규모 ${budgetM[1].trim()}`;
  } else if (/예산\s*상위/.test(text)) {
    subtitle = "예산 상위 공고 포함";
  }

  return { count, subtitle };
}

/** published_at 또는 id로 카드별 그라데이션 톤 인덱스 (0~4) */
export function reportCardGradientIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return h % 5;
}
