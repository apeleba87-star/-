export type EduImageAlign = "center" | "left" | "right" | "full";

export type EduBodyImage = {
  index: number;
  alt: string;
  url: string;
  align: EduImageAlign;
  raw: string;
  start: number;
  end: number;
};

/** 사진이 아닌 문단·제목 블록 (사진 위치 선택의 기준) */
export type EduTextBlock = {
  index: number;
  /** 드롭다운용 짧은 미리보기 */
  preview: string;
  start: number;
  end: number;
};

/** 사진이 붙는 위치: 맨 위 / 특정 문단 아래 / 맨 아래 */
export type EduImageAnchor = { kind: "top" } | { kind: "bottom" } | { kind: "after"; textIndex: number };

const IMG_RE = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g;
const ONLY_IMG_RE = /^\s*!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)\s*$/;

export function parseEduAlign(title?: string | null): EduImageAlign {
  const raw = (title ?? "").replace(/^edu-align:/, "").trim();
  if (raw === "left" || raw === "right" || raw === "full" || raw === "center") return raw;
  return "center";
}

export function buildEduImageMarkdown(url: string, alt: string, align: EduImageAlign): string {
  const safeAlt = (alt || "이미지").replace(/[[\]]/g, "");
  return `![${safeAlt}](${url} "edu-align:${align}")`;
}

export function listBodyImages(body: string): EduBodyImage[] {
  const out: EduBodyImage[] = [];
  const re = new RegExp(IMG_RE.source, "g");
  let m: RegExpExecArray | null;
  let index = 0;
  while ((m = re.exec(body)) !== null) {
    out.push({
      index,
      alt: m[1] ?? "",
      url: m[2] ?? "",
      align: parseEduAlign(m[3]),
      raw: m[0],
      start: m.index,
      end: m.index + m[0].length,
    });
    index += 1;
  }
  return out;
}

function previewText(raw: string): string {
  const one = raw.replace(/\s+/g, " ").trim();
  if (!one) return "(빈 문단)";
  return one.length > 48 ? `${one.slice(0, 48)}…` : one;
}

/** 이중 개행 기준 블록 중, 이미지가 아닌 문단·제목만 */
export function listTextBlocks(body: string): EduTextBlock[] {
  const out: EduTextBlock[] = [];
  if (!body.trim()) return out;

  const re = /\n{2,}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const ranges: { start: number; end: number }[] = [];
  while ((m = re.exec(body)) !== null) {
    ranges.push({ start: last, end: m.index });
    last = m.index + m[0].length;
  }
  ranges.push({ start: last, end: body.length });

  let index = 0;
  for (const r of ranges) {
    const text = body.slice(r.start, r.end);
    if (!text.trim()) continue;
    if (ONLY_IMG_RE.test(text.trim())) continue;
    // 이미지+텍스트 혼합 블록은 텍스트로 취급 (드물음)
    out.push({
      index,
      preview: previewText(text),
      start: r.start,
      end: r.end,
    });
    index += 1;
  }
  return out;
}

function expandImageRange(body: string, start: number, end: number): { start: number; end: number } {
  let s = start;
  let e = end;
  while (s > 0 && body[s - 1] === "\n") s -= 1;
  while (e < body.length && body[e] === "\n") e += 1;
  if (start - s > 2) s = start - 2;
  if (e - end > 2) e = end + 2;
  return { start: s, end: e };
}

function replaceRange(body: string, start: number, end: number, insert: string): string {
  return `${body.slice(0, start)}${insert}${body.slice(end)}`;
}

function normalizeGaps(body: string): string {
  return body.replace(/\n{3,}/g, "\n\n").replace(/^\n+/, "").replace(/\n+$/, "\n");
}

/** 지금 사진이 어느 문단 아래에 있는지 */
export function getImageAnchor(body: string, imageIndex: number): EduImageAnchor {
  const images = listBodyImages(body);
  const img = images[imageIndex];
  if (!img) return { kind: "top" };
  const texts = listTextBlocks(body);
  if (texts.length === 0) {
    return img.start <= 0 ? { kind: "top" } : { kind: "bottom" };
  }

  let lastBefore: EduTextBlock | null = null;
  for (const t of texts) {
    if (t.end <= img.start) lastBefore = t;
  }
  if (!lastBefore) return { kind: "top" };

  const anyTextAfter = texts.some((t) => t.start >= img.end);
  if (!anyTextAfter && lastBefore.index === texts[texts.length - 1]?.index) {
    // 마지막 문단 뒤이면서 더 이상 문단 없음 → 그 문단 아래로 표시
    return { kind: "after", textIndex: lastBefore.index };
  }
  return { kind: "after", textIndex: lastBefore.index };
}

export function setBodyImageAlign(body: string, imageIndex: number, align: EduImageAlign): string {
  const images = listBodyImages(body);
  const img = images[imageIndex];
  if (!img) return body;
  const nextRaw = buildEduImageMarkdown(img.url, img.alt || "이미지", align);
  return replaceRange(body, img.start, img.end, nextRaw);
}

export function removeBodyImage(body: string, imageIndex: number): string {
  const images = listBodyImages(body);
  const img = images[imageIndex];
  if (!img) return body;
  const range = expandImageRange(body, img.start, img.end);
  return normalizeGaps(replaceRange(body, range.start, range.end, "\n\n"));
}

/**
 * 사진을 선택한 문단 바로 아래로 이동.
 * (글 마크다운은 그대로 두고 사진 블록만 옮김)
 */
export function placeBodyImageAtAnchor(
  body: string,
  imageIndex: number,
  anchor: EduImageAnchor
): string {
  const images = listBodyImages(body);
  const img = images[imageIndex];
  if (!img) return body;

  const md = buildEduImageMarkdown(img.url, img.alt || "이미지", img.align);
  const range = expandImageRange(body, img.start, img.end);
  const without = normalizeGaps(replaceRange(body, range.start, range.end, "\n\n"));

  if (anchor.kind === "top") {
    return normalizeGaps(`${md}\n\n${without}`);
  }
  if (anchor.kind === "bottom") {
    return normalizeGaps(`${without.trimEnd()}\n\n${md}\n`);
  }

  // 제거 후 문단 목록 다시 잡고, 같은 index의 문단 뒤에 삽입
  const texts = listTextBlocks(without);
  const t = texts[anchor.textIndex];
  if (!t) {
    return normalizeGaps(`${without.trimEnd()}\n\n${md}\n`);
  }
  return normalizeGaps(
    `${without.slice(0, t.end)}\n\n${md}\n\n${without.slice(t.end)}`
  );
}

export function anchorSelectValue(anchor: EduImageAnchor): string {
  if (anchor.kind === "top") return "top";
  if (anchor.kind === "bottom") return "bottom";
  return `after:${anchor.textIndex}`;
}

export function parseAnchorSelectValue(value: string): EduImageAnchor {
  if (value === "top") return { kind: "top" };
  if (value === "bottom") return { kind: "bottom" };
  const m = value.match(/^after:(\d+)$/);
  if (m) return { kind: "after", textIndex: Number(m[1]) };
  return { kind: "top" };
}
