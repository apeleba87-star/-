import sharp from "sharp";
import {
  KNOWLEDGE_MEDIA_DISPLAY_MAX,
  KNOWLEDGE_MEDIA_THUMB_MAX,
} from "@/lib/knowledge-hub/media/constants";

/**
 * 업로드 원본 → 디스플레이(WebP) + 썸네일(WebP).
 * 원본을 그대로 저장하지 않아 Storage·대역폭 비용을 줄인다.
 */
export async function makeKnowledgeMediaVariants(buffer: Buffer): Promise<{
  display: Buffer;
  thumb: Buffer;
  width: number;
  height: number;
}> {
  const rotated = sharp(buffer).rotate();
  const meta = await rotated.metadata();
  const display = await rotated
    .clone()
    .resize({
      width: KNOWLEDGE_MEDIA_DISPLAY_MAX,
      height: KNOWLEDGE_MEDIA_DISPLAY_MAX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
  const displayMeta = await sharp(display).metadata();
  const thumb = await sharp(buffer)
    .rotate()
    .resize({
      width: KNOWLEDGE_MEDIA_THUMB_MAX,
      height: KNOWLEDGE_MEDIA_THUMB_MAX,
      fit: "cover",
      position: "attention",
    })
    .webp({ quality: 75, effort: 4 })
    .toBuffer();

  return {
    display,
    thumb,
    width: displayMeta.width ?? meta.width ?? KNOWLEDGE_MEDIA_DISPLAY_MAX,
    height: displayMeta.height ?? meta.height ?? KNOWLEDGE_MEDIA_DISPLAY_MAX,
  };
}
