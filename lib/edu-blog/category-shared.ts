import { EDU_BLOG_RESERVED_CATEGORY_SLUGS } from "@/lib/edu-blog/constants";

export type EduBlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

export function slugifyEduCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function validateEduCategorySlug(slug: string): string | null {
  const s = slug.trim();
  if (!s) return "슬러그는 필수입니다.";
  if (EDU_BLOG_RESERVED_CATEGORY_SLUGS.has(s.toLowerCase())) {
    return "이 슬러그는 사용할 수 없습니다.";
  }
  if (!/^[\p{L}\p{N}-]+$/u.test(s)) {
    return "슬러그는 글자·숫자·하이픈만 사용할 수 있습니다.";
  }
  return null;
}
