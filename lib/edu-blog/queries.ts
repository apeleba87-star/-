import { createClient } from "@/lib/supabase-server";
import {
  EDU_BLOG_SOURCE_TYPE,
  type EduBlogIntent,
} from "@/lib/edu-blog/constants";

export type EduBlogPost = {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  excerpt: string | null;
  edu_intent: EduBlogIntent | string | null;
  next_slug: string | null;
  related_slugs: string[];
  product_ids: string[];
  published_at: string;
  updated_at: string;
};

const SELECT_COLS =
  "id, title, slug, body, excerpt, edu_intent, next_slug, related_slugs, product_ids, published_at, updated_at";

function normalizePost(row: {
  id: string;
  title: string;
  slug: string | null;
  body: string | null;
  excerpt: string | null;
  edu_intent: string | null;
  next_slug: string | null;
  related_slugs: string[] | null;
  product_ids: string[] | null;
  published_at: string;
  updated_at: string;
}): EduBlogPost | null {
  if (!row.slug) return null;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    excerpt: row.excerpt,
    edu_intent: row.edu_intent,
    next_slug: row.next_slug,
    related_slugs: row.related_slugs ?? [],
    product_ids: row.product_ids ?? [],
    published_at: row.published_at,
    updated_at: row.updated_at,
  };
}

/** 공개 목록 — 발행·비공개 제외 edu_blog만 */
export async function listPublishedEduBlogPosts(): Promise<EduBlogPost[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COLS)
    .eq("source_type", EDU_BLOG_SOURCE_TYPE)
    .not("published_at", "is", null)
    .eq("is_private", false)
    .not("slug", "is", null)
    .order("published_at", { ascending: false });

  if (error) {
    console.error("[edu-blog] listPublishedEduBlogPosts:", error.message);
    return [];
  }

  return (data ?? [])
    .map((row) => normalizePost(row as Parameters<typeof normalizePost>[0]))
    .filter((p): p is EduBlogPost => p != null);
}

export async function getPublishedEduBlogBySlug(
  slug: string
): Promise<EduBlogPost | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COLS)
    .eq("source_type", EDU_BLOG_SOURCE_TYPE)
    .eq("slug", decoded)
    .not("published_at", "is", null)
    .eq("is_private", false)
    .maybeSingle();

  if (error) {
    console.error("[edu-blog] getPublishedEduBlogBySlug:", error.message);
    return null;
  }
  if (!data) return null;
  return normalizePost(data as Parameters<typeof normalizePost>[0]);
}

/** slug 목록으로 발행 글 조회 (다음·관련용) */
export async function getPublishedEduBlogsBySlugs(
  slugs: string[]
): Promise<EduBlogPost[]> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(SELECT_COLS)
    .eq("source_type", EDU_BLOG_SOURCE_TYPE)
    .in("slug", unique)
    .not("published_at", "is", null)
    .eq("is_private", false);

  if (error) {
    console.error("[edu-blog] getPublishedEduBlogsBySlugs:", error.message);
    return [];
  }

  const bySlug = new Map<string, EduBlogPost>();
  for (const row of data ?? []) {
    const post = normalizePost(row as Parameters<typeof normalizePost>[0]);
    if (post) bySlug.set(post.slug, post);
  }
  return unique.map((s) => bySlug.get(s)).filter((p): p is EduBlogPost => p != null);
}

/** Admin 목록 — 초안 포함 */
export async function listAdminEduBlogPosts(): Promise<
  (Omit<EduBlogPost, "published_at" | "slug"> & {
    slug: string | null;
    published_at: string | null;
    is_private: boolean;
  })[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`${SELECT_COLS}, is_private`)
    .eq("source_type", EDU_BLOG_SOURCE_TYPE)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[edu-blog] listAdminEduBlogPosts:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as {
      id: string;
      title: string;
      slug: string | null;
      body: string | null;
      excerpt: string | null;
      edu_intent: string | null;
      next_slug: string | null;
      related_slugs: string[] | null;
      product_ids: string[] | null;
      published_at: string | null;
      updated_at: string;
      is_private: boolean;
    };
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      body: r.body,
      excerpt: r.excerpt,
      edu_intent: r.edu_intent,
      next_slug: r.next_slug,
      related_slugs: r.related_slugs ?? [],
      product_ids: r.product_ids ?? [],
      published_at: r.published_at,
      updated_at: r.updated_at,
      is_private: r.is_private ?? false,
    };
  });
}

export async function getAdminEduBlogById(id: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("posts")
    .select(`${SELECT_COLS}, is_private, created_at`)
    .eq("id", id)
    .eq("source_type", EDU_BLOG_SOURCE_TYPE)
    .maybeSingle();

  if (error || !data) return null;
  return data as {
    id: string;
    title: string;
    slug: string | null;
    body: string | null;
    excerpt: string | null;
    edu_intent: string | null;
    next_slug: string | null;
    related_slugs: string[] | null;
    product_ids: string[] | null;
    published_at: string | null;
    updated_at: string;
    created_at: string;
    is_private: boolean;
  };
}
