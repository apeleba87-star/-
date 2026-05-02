/**
 * Loads a TTF/OTF with Hangul coverage for pdf-lib embedFont.
 * Cached per runtime.
 *
 * 우선순위: PDF_KOREAN_FONT_PATH → public/fonts/NanumGothic-Regular.ttf → 환경변수 URL → CDN.
 * 배포 환경에서 외부 fetch가 막혀도 로컬 파일이 있으면 동작합니다.
 */

import { readFile } from "fs/promises";
import path from "path";

let cached: Uint8Array | null = null;

const DEFAULT_REMOTE_URLS = [
  "https://fonts.gstatic.com/s/nanumgothic/v21/NaumFontSetup_TTF_GOTHIC/NanumGothic-Regular.ttf",
  "https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/nanumgothic/NanumGothic-Regular.ttf",
];

async function tryLoadFromDisk(): Promise<Uint8Array | null> {
  const candidates = [
    process.env.PDF_KOREAN_FONT_PATH?.trim(),
    path.join(process.cwd(), "public", "fonts", "NanumGothic-Regular.ttf"),
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    try {
      const buf = await readFile(p);
      if (buf.byteLength >= 1000) return new Uint8Array(buf);
    } catch {
      /* try next */
    }
  }
  return null;
}

async function loadViaRemote(): Promise<Uint8Array> {
  const urls = [
    process.env.NOTO_SANS_KR_OTF_URL?.trim(),
    process.env.NANUM_GOTHIC_TTF_URL?.trim(),
    ...DEFAULT_REMOTE_URLS,
  ].filter(Boolean) as string[];

  const tried = new Set<string>();
  let lastStatus = 0;
  for (const url of urls) {
    if (tried.has(url)) continue;
    tried.add(url);
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(25000) });
      lastStatus = res.status;
      if (!res.ok) continue;
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf.byteLength >= 1000) return buf;
    } catch {
      /* try next URL */
    }
  }
  throw new Error(`pdf_font_fetch_failed:${lastStatus || "network"}`);
}

export async function loadKoreanPdfFontBytes(): Promise<Uint8Array> {
  if (cached) return cached;
  const fromDisk = await tryLoadFromDisk();
  if (fromDisk) {
    cached = fromDisk;
    return fromDisk;
  }
  const remote = await loadViaRemote();
  cached = remote;
  return remote;
}

export function clearKoreanPdfFontCacheForTests() {
  cached = null;
}
