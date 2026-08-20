"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  PRACTICE_BLOG_SOURCE_TYPE,
  PRACTICE_HUB,
  PRACTICE_RESERVED_POST_SLUGS,
  practiceBlogPath,
  practiceCategoryPath,
  slugifyPractice,
} from "@/lib/practice-blog/constants";

export type PracticeSaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export type PracticeCategorySaveResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function requireEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다. 다시 로그인해 주세요." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "저장 권한이 없습니다. (admin/editor만 가능)" };
  }
  return { ok: true as const, supabase, userId: user.id };
}

function explainDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("practice_categories") || m.includes("practice_category_id")) {
    return "DB에 청소업 실무 테이블이 없습니다. supabase/migrations/203_practice_blog.sql 을 적용한 뒤 다시 저장하세요.";
  }
  if (m.includes("duplicate") || m.includes("unique")) {
    return "같은 주소(슬러그)가 이미 있습니다. 다른 주소로 바꿔 주세요.";
  }
  if (m.includes("row-level security") || m.includes("rls")) {
    return "권한(RLS) 때문에 저장되지 않았습니다. admin/editor 계정으로 다시 로그인해 주세요.";
  }
  return message;
}

function revalidatePractice(slug?: string | null, categorySlug?: string | null) {
  revalidatePath(PRACTICE_HUB.href);
  revalidatePath(PRACTICE_HUB.adminHref);
  revalidatePath(PRACTICE_HUB.adminCategoriesHref);
  revalidatePath("/sitemap.xml");
  if (slug) revalidatePath(practiceBlogPath(slug));
  if (categorySlug) revalidatePath(practiceCategoryPath(categorySlug));
}

export type PracticeBlogSaveInput = {
  id?: string;
  title: string;
  slug: string;
  body: string | null;
  excerpt: string | null;
  next_slug: string | null;
  related_slugs: string[];
  product_ids: string[];
  practice_category_id: string | null;
  publish: boolean;
  existingPublishedAt?: string | null;
  publishAt?: string | null;
};

export async function savePracticeBlogPost(
  input: PracticeBlogSaveInput
): Promise<PracticeSaveResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const slug = input.slug.trim();
  const title = input.title.trim();
  if (!title) return { ok: false, error: "제목을 입력해 주세요." };
  if (!slug) return { ok: false, error: "슬러그는 필수입니다." };
  if (PRACTICE_RESERVED_POST_SLUGS.has(slug)) {
    return { ok: false, error: `「${slug}」는 예약된 주소입니다. 다른 슬러그를 쓰세요.` };
  }

  if (input.publish && !input.practice_category_id) {
    return { ok: false, error: "발행하려면 칸(메뉴)을 선택해 주세요." };
  }

  const related = (input.related_slugs ?? []).filter(
    (s) => s && s !== slug && s !== (input.next_slug ?? "").trim()
  );

  const scheduledIso = (() => {
    const raw = input.publishAt?.trim();
    if (!raw) return null;
    const t = new Date(raw);
    return Number.isNaN(t.getTime()) ? null : t.toISOString();
  })();
  const published_at = (() => {
    if (!input.publish) return null;
    if (scheduledIso) return scheduledIso;
    const existing = input.existingPublishedAt?.trim() || null;
    if (existing) {
      const t = new Date(existing).getTime();
      if (!Number.isNaN(t) && t <= Date.now()) return existing;
    }
    return new Date().toISOString();
  })();

  const payload = {
    title,
    slug,
    body: input.body,
    excerpt: input.excerpt,
    category_id: null as string | null,
    newsletter_include: false,
    source_type: PRACTICE_BLOG_SOURCE_TYPE,
    source_ref: slug,
    edu_intent: null as string | null,
    next_slug: input.next_slug?.trim() || null,
    related_slugs: related,
    product_ids: input.product_ids ?? [],
    practice_category_id: input.practice_category_id,
    published_at,
    is_private: false,
    updated_at: new Date().toISOString(),
  };

  const { supabase, userId } = auth;

  let categorySlug: string | null = null;
  if (input.practice_category_id) {
    const { data: cat } = await supabase
      .from("practice_categories")
      .select("slug")
      .eq("id", input.practice_category_id)
      .maybeSingle();
    categorySlug = (cat as { slug?: string } | null)?.slug ?? null;
  }

  if (input.id) {
    const { data, error } = await supabase
      .from("posts")
      .update(payload)
      .eq("id", input.id)
      .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, error: explainDbError(error.message) };
    if (!data?.id) {
      return {
        ok: false,
        error:
          "저장되지 않았습니다. (권한 또는 글 ID 문제) 로그아웃 후 다시 시도하거나, 마이그레이션 203 적용 여부를 확인하세요.",
      };
    }

    revalidatePractice(slug, categorySlug);
    return { ok: true, id: data.id };
  }

  const { data, error } = await supabase
    .from("posts")
    .insert({ ...payload, created_by: userId })
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: explainDbError(error.message) };
  if (!data?.id) {
    return {
      ok: false,
      error:
        "저장되지 않았습니다. admin/editor로 로그인했는지, DB 마이그레이션 203이 적용됐는지 확인하세요.",
    };
  }

  revalidatePractice(slug, categorySlug);
  return { ok: true, id: data.id };
}

export async function deletePracticeBlogPost(id: string): Promise<PracticeSaveResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const { data: existing, error: loadError } = await auth.supabase
    .from("posts")
    .select("id, slug, practice_category_id, practice_categories ( slug )")
    .eq("id", id)
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE)
    .maybeSingle();

  if (loadError) return { ok: false, error: explainDbError(loadError.message) };
  if (!existing?.id) return { ok: false, error: "글을 찾을 수 없습니다." };

  const { error } = await auth.supabase
    .from("posts")
    .delete()
    .eq("id", id)
    .eq("source_type", PRACTICE_BLOG_SOURCE_TYPE);

  if (error) return { ok: false, error: explainDbError(error.message) };

  const catJoin = (existing as { practice_categories?: { slug: string } | { slug: string }[] | null })
    .practice_categories;
  const cat = Array.isArray(catJoin) ? catJoin[0] : catJoin;
  revalidatePractice(
    (existing as { slug?: string | null }).slug ?? null,
    cat?.slug ?? null
  );
  return { ok: true, id };
}

export type PracticeCategoryInput = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

export async function savePracticeCategory(
  input: PracticeCategoryInput
): Promise<PracticeCategorySaveResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const name = input.name.trim();
  const slug = slugifyPractice(input.slug || name);
  if (!name) return { ok: false, error: "칸 이름을 입력해 주세요." };
  if (!slug) return { ok: false, error: "주소(슬러그)를 입력해 주세요." };

  const payload = {
    name,
    slug,
    description: input.description?.trim() || null,
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
    is_published: input.is_published,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { data, error } = await auth.supabase
      .from("practice_categories")
      .update(payload)
      .eq("id", input.id)
      .select("id, slug")
      .maybeSingle();
    if (error) return { ok: false, error: explainDbError(error.message) };
    if (!data?.id) return { ok: false, error: "칸이 저장되지 않았습니다." };
    revalidatePractice(null, data.slug);
    return { ok: true, id: data.id };
  }

  const { data, error } = await auth.supabase
    .from("practice_categories")
    .insert(payload)
    .select("id, slug")
    .maybeSingle();
  if (error) return { ok: false, error: explainDbError(error.message) };
  if (!data?.id) return { ok: false, error: "칸이 저장되지 않았습니다." };
  revalidatePractice(null, data.slug);
  return { ok: true, id: data.id };
}

export async function deletePracticeCategory(id: string): Promise<PracticeCategorySaveResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const { data: existing } = await auth.supabase
    .from("practice_categories")
    .select("id, slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await auth.supabase.from("practice_categories").delete().eq("id", id);
  if (error) return { ok: false, error: explainDbError(error.message) };

  revalidatePractice(null, (existing as { slug?: string } | null)?.slug ?? null);
  return { ok: true, id };
}
