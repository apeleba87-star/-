"use server";

import { revalidatePath } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  slugifyEduCategoryName,
  validateEduCategorySlug,
} from "@/lib/edu-blog/categories";
import { eduBlogCategoryPath } from "@/lib/edu-blog/constants";

export type EduCategorySaveInput = {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_published: boolean;
};

export type EduCategoryResult = { ok: true; id: string } | { ok: false; error: string };

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
  return { ok: true as const, supabase };
}

function explainDbError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("edu_blog_categories") || m.includes("schema cache") || m.includes("does not exist")) {
    return "DB에 실무 칸 테이블이 없습니다. supabase/migrations/202_edu_blog_categories.sql 을 적용한 뒤 다시 저장하세요.";
  }
  if (m.includes("duplicate") || m.includes("unique")) {
    return "같은 슬러그의 칸이 이미 있습니다. 슬러그를 바꿔 주세요.";
  }
  if (m.includes("row-level security") || m.includes("rls")) {
    return "권한(RLS) 때문에 저장되지 않았습니다. admin/editor 계정으로 다시 로그인해 주세요.";
  }
  return message;
}

function revalidateCategory(slug?: string | null) {
  revalidatePath("/blog");
  revalidatePath("/admin/blog");
  revalidatePath("/admin/blog/categories");
  if (slug) revalidatePath(eduBlogCategoryPath(slug));
}

export async function saveEduBlogCategory(input: EduCategorySaveInput): Promise<EduCategoryResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const name = input.name.trim();
  const slug = (input.slug.trim() || slugifyEduCategoryName(name)).trim();
  if (!name) return { ok: false, error: "칸 이름을 입력해 주세요." };
  const slugError = validateEduCategorySlug(slug);
  if (slugError) return { ok: false, error: slugError };

  const sort_order = Number.isFinite(input.sort_order) ? Math.trunc(input.sort_order) : 0;
  const payload = {
    name,
    slug,
    description: input.description?.trim() || null,
    sort_order,
    is_published: input.is_published,
    updated_at: new Date().toISOString(),
  };

  const { supabase } = auth;

  if (input.id) {
    const { data: prev } = await supabase
      .from("edu_blog_categories")
      .select("slug")
      .eq("id", input.id)
      .maybeSingle();

    const { data, error } = await supabase
      .from("edu_blog_categories")
      .update(payload)
      .eq("id", input.id)
      .select("id")
      .maybeSingle();

    if (error) return { ok: false, error: explainDbError(error.message) };
    if (!data?.id) return { ok: false, error: "저장되지 않았습니다. 칸 ID를 확인해 주세요." };

    revalidateCategory(slug);
    if (prev?.slug && prev.slug !== slug) revalidateCategory(prev.slug as string);
    return { ok: true, id: data.id };
  }

  const { data, error } = await supabase
    .from("edu_blog_categories")
    .insert(payload)
    .select("id")
    .maybeSingle();

  if (error) return { ok: false, error: explainDbError(error.message) };
  if (!data?.id) return { ok: false, error: "저장되지 않았습니다." };

  revalidateCategory(slug);
  return { ok: true, id: data.id };
}

export async function deleteEduBlogCategory(id: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const { data: prev } = await auth.supabase
    .from("edu_blog_categories")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  const { error } = await auth.supabase.from("edu_blog_categories").delete().eq("id", id);
  if (error) return { ok: false, error: explainDbError(error.message) };

  revalidateCategory(prev?.slug as string | undefined);
  return { ok: true };
}
