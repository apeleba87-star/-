/**
 * 희석비율 표시 통일.
 * 원액만 쓰는 제품은 전부 "원액 사용"으로 맞춘다.
 * 문장형 설명에 비율만 있으면 비율로 축약한다.
 */
export function normalizeDilutionLabel(
  raw: string | null | undefined
): string | undefined {
  if (raw == null) return undefined;
  const t = raw.trim();
  if (!t) return undefined;

  // 긴 문장에서 희석비만 뽑기 (에코나 등 파서 오탐 방지)
  if (t.length > 40) {
    const range = t.match(/1\s*:\s*\d+\s*[~～\-–]\s*1\s*:\s*\d+/);
    if (range) return range[0].replace(/\s+/g, "");
    const single = t.match(/1\s*:\s*\d+/);
    if (single) return single[0].replace(/\s+/g, "");
  }

  // 비율이 있으면(희석 가능) 원문 유지 (공백 정리)
  if (/1\s*:\s*\d/.test(t)) return t.replace(/\s+/g, " ").trim();
  if (/또는\s*희석|희석\s*사용\s*가능|희석\s*가능/.test(t) && /원액/.test(t)) return t;

  // 원액 전용 표현 → 통일
  if (
    t === "원액" ||
    t === "원액 사용" ||
    /희석하지\s*않|원액\s*그대로|원액형|원액을?\s*직접|반드시\s*원액|원액으로\s*사용/.test(t)
  ) {
    return "원액 사용";
  }

  // 짧은 "원액…" 만 (비율·범위 없음)
  if (/^원액/.test(t) && t.length <= 24 && !/[~～-]/.test(t)) {
    return "원액 사용";
  }

  return t;
}

/**
 * 정렬용 희석 키 — 작을수록 진함(원액=0). 없으면 Infinity.
 * 범위(1:10~1:200)는 앞쪽 숫자를 사용.
 */
export function dilutionSortKey(raw: string | null | undefined): number {
  const label = normalizeDilutionLabel(raw);
  if (!label) return Number.POSITIVE_INFINITY;
  if (label === "원액 사용" || /^원액/.test(label)) return 0;
  const m = label.match(/1\s*:\s*(\d+(?:\.\d+)?)/);
  if (m) return Number(m[1]);
  return Number.POSITIVE_INFINITY;
}
