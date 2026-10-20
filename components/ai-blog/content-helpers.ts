import { exportFileName, matchPhoto, type LocalPhoto } from "@/lib/ai-blog/local-media";
import type { ContentBlock, ImageBlock, MediaPair, ProjectMedia } from "@/lib/ai-blog/types";

export type ResolvedImage = {
  block: ImageBlock;
  media: ProjectMedia | null;
  photo: LocalPhoto | null;
  label: string;
  order: number;
  fileName: string;
};

export function newBlockId(): string {
  return `b${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

/** 이미지 블록 → 미디어·로컬 사진·내보내기 파일명 (전후 세트 번호 공유: 01 전 / 01 후) */
export function resolveImages(
  blocks: ContentBlock[],
  media: ProjectMedia[],
  pairs: MediaPair[],
  photos: LocalPhoto[],
): Map<string, ResolvedImage> {
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const pairById = new Map(pairs.map((p) => [p.id, p]));
  const pairNoById = new Map<string, number>();
  let nextPairNo = 0;
  const out = new Map<string, ResolvedImage>();
  let order = 0;
  for (const b of blocks) {
    if (b.type !== "image") continue;
    order += 1;
    const m = b.media_id ? (mediaById.get(b.media_id) ?? null) : null;
    const pair = b.pair_id ? pairById.get(b.pair_id) : undefined;
    let pairNo: number;
    if (b.pair_id) {
      const existing = pairNoById.get(b.pair_id);
      if (existing != null) pairNo = existing;
      else {
        nextPairNo += 1;
        pairNo = nextPairNo;
        pairNoById.set(b.pair_id, pairNo);
      }
    } else {
      nextPairNo += 1;
      pairNo = nextPairNo;
    }
    out.set(b.id, {
      block: b,
      media: m,
      photo: m ? matchPhoto(m, photos) : null,
      label: pair?.label ?? "",
      order,
      fileName: exportFileName(pairNo, b.role, m?.local_name ?? "photo.jpg"),
    });
  }
  return out;
}

/** 전후 세트 기준 업로드·미사용 목록 (폴더 정리용) */
export function buildFieldExport(
  pairs: MediaPair[],
  media: ProjectMedia[],
  photos: LocalPhoto[],
): { upload: { fileName: string; photo: LocalPhoto }[]; unused: LocalPhoto[]; usedKeys: Set<string> } {
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const usedKeys = new Set<string>();
  const upload: { fileName: string; photo: LocalPhoto }[] = [];
  let pairNo = 0;
  for (const p of pairs) {
    const slots: { role: "BEFORE" | "AFTER"; id: string | null }[] = [
      { role: "BEFORE", id: p.before_media_id },
      { role: "AFTER", id: p.after_media_id },
    ];
    const resolved = slots.flatMap(({ role, id }) => {
      if (!id) return [];
      const m = mediaById.get(id);
      if (!m) return [];
      const photo = matchPhoto(m, photos);
      if (!photo) return [];
      return [{ role, photo, name: m.local_name }];
    });
    if (!resolved.length) continue;
    pairNo += 1;
    for (const r of resolved) {
      usedKeys.add(r.photo.key);
      upload.push({ fileName: exportFileName(pairNo, r.role, r.name), photo: r.photo });
    }
  }
  const unused = photos.filter((p) => !usedKeys.has(p.key));
  return { upload, unused, usedKeys };
}

export type PhotoLayout = "side" | "stack";

export type BlockGroup =
  | { kind: "heading"; block: ContentBlock & { type: "heading" } }
  | { kind: "paragraph"; block: ContentBlock & { type: "paragraph" } }
  | { kind: "image"; block: ImageBlock }
  | { kind: "pair"; before: ImageBlock; after: ImageBlock };

/** 연속된 같은 짝의 BEFORE → AFTER 이미지 블록을 하나로 묶는다 (좌우 배치용) */
export function groupBlocks(blocks: ContentBlock[]): BlockGroup[] {
  const out: BlockGroup[] = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    if (b.type === "paragraph") {
      out.push({ kind: "paragraph", block: b });
      continue;
    }
    if (b.type === "heading") {
      out.push({ kind: "heading", block: b });
      continue;
    }
    const n = blocks[i + 1];
    if (n?.type === "image" && b.role === "BEFORE" && n.role === "AFTER" && b.pair_id === n.pair_id) {
      out.push({ kind: "pair", before: b, after: n });
      i++;
    } else {
      out.push({ kind: "image", block: b });
    }
  }
  return out;
}

export function paragraphs(blocks: ContentBlock[]): string[] {
  return blocks.flatMap((b) => (b.type === "paragraph" && b.text.trim() ? [b.text.trim()] : []));
}

/** 본문 글자 수 계산용 (소제목 제외) */
export function fullText(blocks: ContentBlock[]): string {
  return paragraphs(blocks).join("\n\n");
}

/** 복사용 전체 글: 소제목과 문단을 순서대로 */
export function copyText(blocks: ContentBlock[]): string {
  return blocks
    .flatMap((b) => (b.type !== "image" && b.text.trim() ? [b.text.trim()] : []))
    .join("\n\n");
}

export function countKeyword(text: string, keyword: string): number {
  const k = keyword.trim();
  if (!k) return 0;
  return text.split(k).length - 1;
}

/** 클립보드에는 순수 텍스트만 넣는다 (HTML 없음) */
export async function copyPlain(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}
