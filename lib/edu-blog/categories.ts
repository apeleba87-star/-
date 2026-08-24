import { createClient, createServerSupabase } from "@/lib/supabase-server";
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

const SELECT_COLS =
  "id, slug, name, description, sort_order, is_published, updated_at";

function normalize(row: {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
}): EduBlogCategory {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    sort_order: row.sort_order ?? 0,
    is_published: row.is_published,
    updated_at: row.updated_at,
  };
}

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

/** 공개 허브·칸 페이지 — 공개된 칸만 */
export async function listPublishedEduBlogCategories(): Promise<EduBlogCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("edu_blog_categories")
    .select(SELECT_COLS)
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[edu-blog] listPublishedEduBlogCategories:", error.message);
    return [];
  }
  return (data ?? []).map((row) => normalize(row as EduBlogCategory));
}

export async function getPublishedEduBlogCategoryBySlug(
  slug: string
): Promise<EduBlogCategory | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("edu_blog_categories")
    .select(SELECT_COLS)
    .eq("slug", decoded)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    console.error("[edu-blog] getPublishedEduBlogCategoryBySlug:", error.message);
    return null;
  }
  if (!data) return null;
  return normalize(data as EduBlogCategory);
}

/** Admin — 숨김 칸 포함 */
export async function listAdminEduBlogCategories(): Promise<EduBlogCategory[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("edu_blog_categories")
    .select(SELECT_COLS)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[edu-blog] listAdminEduBlogCategories:", error.message);
    return [];
  }
  return (data ?? []).map((row) => normalize(row as EduBlogCategory));
}

export async function getEduBlogCategoryById(
  id: string
): Promise<EduBlogCategory | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("edu_blog_categories")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return normalize(data as EduBlogCategory);
}
