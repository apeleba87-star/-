/** 교육 블로그 — 직접 작성, /blog/[slug], 다음 글·제품 연결 */

export const EDU_BLOG_SOURCE_TYPE = "edu_blog";

export const EDU_BLOG_INTENTS = [
  { value: "cause", label: "원인" },
  { value: "how-to", label: "제거·방법" },
  { value: "compare", label: "비교·고르기" },
  { value: "prevent", label: "예방" },
] as const;

export type EduBlogIntent = (typeof EDU_BLOG_INTENTS)[number]["value"];

export function eduBlogPath(slug: string): string {
  return `/blog/${encodeURIComponent(slug)}`;
}

export function eduIntentLabel(intent: string | null | undefined): string | null {
  if (!intent) return null;
  return EDU_BLOG_INTENTS.find((i) => i.value === intent)?.label ?? intent;
}
