/** 청소업 실무 — 관리자 칸·글, 공개 /practice */

export const PRACTICE_BLOG_SOURCE_TYPE = "practice_blog";

export const PRACTICE_HUB = {
  href: "/practice",
  label: "청소업 실무",
  adminHref: "/admin/practice",
  adminCategoriesHref: "/admin/practice/categories",
} as const;

export const PRACTICE_RESERVED_POST_SLUGS = new Set(["c"]);

export function practiceBlogPath(slug: string): string {
  return `/practice/${encodeURIComponent(slug)}`;
}

export function practiceCategoryPath(slug: string): string {
  return `/practice/c/${encodeURIComponent(slug)}`;
}

export function slugifyPractice(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
