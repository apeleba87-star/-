export const KNOWLEDGE_MEDIA_BUCKET = "knowledge-media";

export const KNOWLEDGE_MEDIA_ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

export const KNOWLEDGE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

/** SEO·비용: 긴 변 상한 (업로드 시 WebP 변환) */
export const KNOWLEDGE_MEDIA_DISPLAY_MAX = 1400;
export const KNOWLEDGE_MEDIA_THUMB_MAX = 400;

export type KnowledgeMediaEntityType = "product" | "equipment" | "edu_blog" | "guide" | "practice_blog";

export type KnowledgeMediaRole = "cover" | "gallery" | "inline" | "before" | "after";
