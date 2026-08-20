import { createClient, createServerSupabase } from "@/lib/supabase-server";
import { PRACTICE_BLOG_SOURCE_TYPE } from "@/lib/practice-blog/constants";

export type PracticeCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
  updated_at: string;
};

export type PracticeBlogPost = {
  id: string;
  title: string;
  slug: string;
  body: string | null;
  excerpt: string | null;
  next_slug: string | null;
  related_slugs: string[];
  product_ids: string[];
  published_at: string;
  updated_at: string;
  practice_category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
};

const POST_COLS =
  "id, title, slug, body, excerpt, next_slug, related_slugs, product_ids, published_at, updated_at, practice_category_id";

type PostRow = {
  id: string;
  title: string;
  slug: string | null;
  body: string | null;
  excerpt: string | null;
  next_slug: string | null;
  related_slugs: string[] | null;
  product_ids: string[] | null;
  published_at: string;
  updated_at: string;
  practice_category_id: string | null;
  practice_categories?: { name: string; slug: string } | { name: string; slug: string }[] | null;
};

function categoryFromJoin(
  raw: PostRow["practice_categories"]
): { name: string; slug: string } | null {
  if (!raw) return null;
  const row = Array.isArray(raw) ? raw[0] : raw;
  if (!row?.slug) return null;
  return { name: row.name, slug: row.slug };
}

function normalizePost(row: PostRow): PracticeBlogPost | null {
  if (!row.slug) return null;
  const cat = categoryFromJoin(row.practice_categories);
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    body: row.body,
    excerpt: row.excerpt,
    next_slug: row.next_slug,
    related_slugs: row.related_slugs ?? [],
    product_ids: row.product_ids ?? [],
    published_at: row.published_at,
    updated_at: row.updated_at,
    practice_category_id: row.practice_category_id,
    category_name: cat?.name ?? null,
    category_slug: cat?.slug ?? null,
  };
}

function explainMissingTable(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("practice_categories") ||
    m.includes("practice_category_id") ||
    m.includes("does not exist")
  );
}

export async function listPublishedPracticeCategories(): Promise<PracticeCategory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("practice_categories")
    .select("id, name, slug, description, sort_order, is_published, updated_at")
    .eq("is_published", true)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    if (!explainMissingTable(error.message)) {
      console.error("[practice-blog] listPublishedPracticeCategories:", error.message);
    }
    return [];
  }
  return (data ?? []) as PracticeCategory[];
}

export async function getPublishedPracticeCategoryBySlug(
  slug: string
): Promise<PracticeCategory | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = createClient();
  const { data, error } = await supabase
    .from("practice_categories")
    .select("id, name, slug, description, sort_order, is_published, updated_at")
    .eq("slug", decoded)
    .eq("is_published", true)
    .maybeSingle();

  if (error) {
    if (!explainMissingTable(error.message)) {
      console.error("[practice-blog] getPublishedPracticeCategoryBySlug:", error.message);
    }
    return null;
  }
  return (data as PracticeCategory | null) ?? null;
}

export async function listPublishedPracticePosts(options?: {
  categoryId?: string;
}): Promise<PracticeBlogPost[]> {
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  let query = supabase
    .from("posts")
    .select(`${POST_COLS}, practice_categories ( name, slug )`)
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .eq("is_private", false)
    .not("slug", "is", null)
    .order("published_at", { ascending: false });

  if (options?.categoryId) {
    query = query.eq("practice_category_id", options.categoryId);
  }

  const { data, error } = await query;
  if (error) {
    if (!explainMissingTable(error.message)) {
      console.error("[practice-blog] listPublishedPracticePosts:", error.message);
    }
    return [];
  }
  return (data ?? [])
    .map((row) => normalizePost(row as PostRow))
    .filter((p): p is PracticeBlogPost => p != null);
}

export async function getPublishedPracticeBySlug(
  slug: string
): Promise<PracticeBlogPost | null> {
  const decoded = decodeURIComponent(slug);
  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_COLS}, practice_categories ( name, slug )`)
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
    .eq("slug", decoded)
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .eq("is_private", false)
    .maybeSingle();

  if (error) {
    if (!explainMissingTable(error.message)) {
      console.error("[practice-blog] getPublishedPracticeBySlug:", error.message);
    }
    return null;
  }
  if (!data) return null;
  return normalizePost(data as PostRow);
}

export async function getPublishedPracticeBySlugs(
  slugs: string[]
): Promise<PracticeBlogPost[]> {
  const unique = [...new Set(slugs.map((s) => s.trim()).filter(Boolean))];
  if (!unique.length) return [];

  const supabase = createClient();
  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_COLS}, practice_categories ( name, slug )`)
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
    .in("slug", unique)
    .not("published_at", "is", null)
    .lte("published_at", nowIso)
    .eq("is_private", false);

  if (error) {
    if (!explainMissingTable(error.message)) {
      console.error("[practice-blog] getPublishedPracticeBySlugs:", error.message);
    }
    return [];
  }

  const bySlug = new Map<string, PracticeBlogPost>();
  for (const row of data ?? []) {
    const post = normalizePost(row as PostRow);
    if (post) bySlug.set(post.slug, post);
  }
  return unique.map((s) => bySlug.get(s)).filter((p): p is PracticeBlogPost => p != null);
}

export type AdminPracticePost = Omit<PracticeBlogPost, "published_at" | "slug"> & {
  slug: string | null;
  published_at: string | null;
  is_private: boolean;
};

export async function listAdminPracticePosts(): Promise<AdminPracticePost[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_COLS}, is_private, practice_categories ( name, slug )`)
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[practice-blog] listAdminPracticePosts:", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const r = row as PostRow & { is_private: boolean; published_at: string | null };
    const cat = categoryFromJoin(r.practice_categories);
    return {
      id: r.id,
      title: r.title,
      slug: r.slug,
      body: r.body,
      excerpt: r.excerpt,
      next_slug: r.next_slug,
      related_slugs: r.related_slugs ?? [],
      product_ids: r.product_ids ?? [],
      published_at: r.published_at,
      updated_at: r.updated_at,
      practice_category_id: r.practice_category_id,
      category_name: cat?.name ?? null,
      category_slug: cat?.slug ?? null,
      is_private: r.is_private ?? false,
    };
  });
}

export async function getAdminPracticeById(id: string) {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select(`${POST_COLS}, is_private, created_at, practice_categories ( name, slug )`)
    .eq("id", id)
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
    .maybeSingle();

  if (error || !data) return null;
  const r = data as PostRow & { is_private: boolean; created_at: string; published_at: string | null };
  const cat = categoryFromJoin(r.practice_categories);
  return {
    id: r.id,
    title: r.title,
    slug: r.slug,
    body: r.body,
    excerpt: r.excerpt,
    next_slug: r.next_slug,
    related_slugs: r.related_slugs ?? [],
    product_ids: r.product_ids ?? [],
    published_at: r.published_at,
    updated_at: r.updated_at,
    created_at: r.created_at,
    is_private: r.is_private ?? false,
    practice_category_id: r.practice_category_id,
    category_name: cat?.name ?? null,
    category_slug: cat?.slug ?? null,
  };
}

export async function listAdminPracticeCategories(): Promise<PracticeCategory[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("practice_categories")
    .select("id, name, slug, description, sort_order, is_published, updated_at")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("[practice-blog] listAdminPracticeCategories:", error.message);
    return [];
  }
  return (data ?? []) as PracticeCategory[];
}

export async function countPracticePostsInCategory(categoryId: string): Promise<number> {
  const supabase = await createServerSupabase();
  const { count, error } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
    .eq("practice_category_id", categoryId);

  if (error) return 0;
  return count ?? 0;
}
