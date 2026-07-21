"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import { EDU_BLOG_SOURCE_TYPE } from "@/lib/edu-blog/constants";

export type EduBlogSaveInput = {
  id?: string;
  title: string;
  slug: string;
  body: string | null;
  excerpt: string | null;
  edu_intent: string | null;
  next_slug: string | null;
  related_slugs: string[];
  product_ids: string[];
  publish: boolean;
  /** 기존 발행 시각 유지용 */
  existingPublishedAt?: string | null;
};

export type EduBlogSaveResult =
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
  if (m.includes("edu_intent") || m.includes("next_slug") || m.includes("related_slugs") || m.includes("product_ids")) {
    return "DB에 청소지식 컬럼이 없습니다. supabase/migrations/198_edu_blog_posts.sql 을 적용한 뒤 다시 저장하세요.";
  }
  if (m.includes("duplicate") || m.includes("unique")) {
    return "같은 슬러그(또는 source)의 글이 이미 있습니다. 슬러그를 바꿔 주세요.";
  }
  if (m.includes("row-level security") || m.includes("rls")) {
    return "권한(RLS) 때문에 저장되지 않았습니다. admin/editor 계정으로 다시 로그인해 주세요.";
  }
  return message;
}

export async function saveEduBlogPost(input: EduBlogSaveInput): Promise<EduBlogSaveResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const slug = input.slug.trim();
  const title = input.title.trim();
  if (!title) return { ok: false, error: "제목을 입력해 주세요." };
  if (!slug) return { ok: false, error: "슬러그는 필수입니다." };

  const related = (input.related_slugs ?? []).filter(
    (s) => s && s !== slug && s !== (input.next_slug ?? "").trim()
  );

  const published_at = input.publish
    ? input.existingPublishedAt ?? new Date().toISOString()
    : null;

  const payload = {
    title,
    slug,
    body: input.body,
    excerpt: input.excerpt,
    category_id: null as string | null,
    newsletter_include: false,
    source_type: EDU_BLOG_SOURCE_TYPE,
    source_ref: slug,
    edu_intent: input.edu_intent,
    next_slug: input.next_slug?.trim() || null,
    related_slugs: related,
    product_ids: input.product_ids ?? [],
    published_at,
    is_private: false,
    updated_at: new Date().toISOString(),
  };

  const { supabase, userId } = auth;

  if (input.id) {
    const { data, error } = await supabase
      .from("posts")
      .update(payload)
      .eq("id", input.id)
      .eq("source_type", EDU_BLOG_SOURCE_TYPE)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, error: explainDbError(error.message) };
    if (!data?.id) {
      return {
        ok: false,
        error:
          "저장되지 않았습니다. (권한 또는 글 ID 문제) 로그아웃 후 다시 시도하거나, 마이그레이션 198 적용 여부를 확인하세요.",
      };
    }

    revalidatePath("/blog");
    revalidatePath("/admin/blog");
    revalidatePath(`/blog/${encodeURIComponent(slug)}`);
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
        "저장되지 않았습니다. admin/editor로 로그인했는지, DB 마이그레이션 198이 적용됐는지 확인하세요.",
    };
  }

  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  revalidatePath(`/blog/${encodeURIComponent(slug)}`);
  return { ok: true, id: data.id };
}
