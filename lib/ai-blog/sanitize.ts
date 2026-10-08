const INVISIBLE = /[\u200B-\u200D\u2060\uFEFF\u00AD]/g;
const ODD_SPACES = /[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g;
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu;

/** AI 출력·사용자 입력을 네이버에 붙여넣기 좋은 순수 텍스트로 정리 */
export function toPlainText(input: string): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(ODD_SPACES, " ")
    .replace(EMOJI, "")
    .split("\n")
    .map((line) =>
      line
        .replace(/^\s{0,3}#{1,6}\s+/, "")
        .replace(/^\s{0,3}>\s?/, "")
        .replace(/^\s{0,3}(?:[-*+•·]|\d+[.)])\s+/, "")
        .replace(/\*\*(.+?)\*\*/g, "$1")
        .replace(/__(.+?)__/g, "$1")
        .replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, "$1$2")
        .replace(/`([^`]+)`/g, "$1")
        .replace(/[ \t]+/g, " ")
        .trimEnd(),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 사용자가 직접 고친 문단: 의도한 기호는 두고 보이지 않는 문자만 정리 */
export function normalizeUserText(input: string, max = 4000): string {
  return input
    .replace(/\r\n?/g, "\n")
    .replace(INVISIBLE, "")
    .replace(ODD_SPACES, " ")
    .slice(0, max);
}

export function findBannedPhrases(text: string, banned: string[]): string[] {
  const hay = text.toLowerCase();
  return banned.filter((b) => b.trim() && hay.includes(b.trim().toLowerCase()));
}

/** 금지 표현을 제거(문장 흐름 유지를 위해 공백 하나로) */
export function stripBannedPhrases(text: string, banned: string[]): string {
  let out = text;
  for (const b of banned) {
    const t = b.trim();
    if (!t) continue;
    out = out.split(t).join("");
  }
  return out.replace(/[ \t]{2,}/g, " ");
}
