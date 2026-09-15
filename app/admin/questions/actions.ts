"use server";

import { revalidatePath } from "next/cache";
import {
  getContaminantById,
  getMaterialById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getMergedProductById } from "@/lib/knowledge-hub/product-catalog";
import { questionPath, type QuestionEntityType } from "@/lib/questions/constants";
import { isKnownQuestionPlaceId } from "@/lib/questions/places";
import { createServerSupabase } from "@/lib/supabase-server";

type AdminResult = { ok: true } | { ok: false; error: string };

async function requireEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다." };
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "권한이 없습니다." };
  }
  return { ok: true as const, supabase, userId: user.id };
}

export async function adminDeleteQuestionAction(
  questionId: number,
): Promise<AdminResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const { data: q } = await auth.supabase
    .from("questions")
    .select("id, slug, author_id")
    .eq("id", questionId)
    .maybeSingle();
  if (!q) return { ok: false, error: "질문을 찾을 수 없습니다." };

  const { error } = await auth.supabase
    .from("questions")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: auth.userId,
    })
    .eq("id", questionId);

  if (error) return { ok: false, error: error.message };

  revalidatePath("/questions");
  revalidatePath(questionPath(Number(q.id), String(q.slug)));
  revalidatePath("/admin/questions");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function adminDeleteAnswerAction(
  answerId: string,
): Promise<AdminResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const { data: a } = await auth.supabase
    .from("question_answers")
    .select("id, question_id")
    .eq("id", answerId)
    .maybeSingle();
  if (!a) return { ok: false, error: "답변을 찾을 수 없습니다." };

  const { error } = await auth.supabase
    .from("question_answers")
    .update({
      status: "deleted",
      deleted_at: new Date().toISOString(),
      deleted_by: auth.userId,
    })
    .eq("id", answerId);

  if (error) return { ok: false, error: error.message };

  const { data: q } = await auth.supabase
    .from("questions")
    .select("slug")
    .eq("id", a.question_id)
    .maybeSingle();

  if (q) revalidatePath(questionPath(Number(a.question_id), String(q.slug)));
  revalidatePath("/admin/questions");
  return { ok: true };
}

export async function adminSuspendQuestionsUserAction(
  userId: string,
  hidePosts: boolean,
): Promise<AdminResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("profiles")
    .update({ questions_suspended_at: new Date().toISOString() })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };

  if (hidePosts) {
    await auth.supabase
      .from("questions")
      .update({
        status: "hidden",
        deleted_at: new Date().toISOString(),
        deleted_by: auth.userId,
      })
      .eq("author_id", userId)
      .eq("status", "published")
      .is("deleted_at", null);

    await auth.supabase
      .from("question_answers")
      .update({
        status: "hidden",
        deleted_at: new Date().toISOString(),
        deleted_by: auth.userId,
      })
      .eq("author_id", userId)
      .eq("status", "published")
      .is("deleted_at", null);
  }

  revalidatePath("/questions");
  revalidatePath("/admin/questions");
  revalidatePath("/sitemap.xml");
  return { ok: true };
}

export async function adminUnsuspendQuestionsUserAction(
  userId: string,
): Promise<AdminResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const { error } = await auth.supabase
    .from("profiles")
    .update({ questions_suspended_at: null })
    .eq("id", userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/questions");
  return { ok: true };
}

/** 관리자: 질문 태그(엔티티) 전체 교체 */
export async function adminSetQuestionTagsAction(input: {
  questionId: number;
  entities: { type: QuestionEntityType; id: string }[];
}): Promise<AdminResult> {
  const auth = await requireEditor();
  if (!auth.ok) return auth;

  const questionId = Number(input.questionId);
  if (!Number.isFinite(questionId) || questionId < 1) {
    return { ok: false, error: "잘못된 질문입니다." };
  }

  const raw = input.entities ?? [];
  if (raw.length > 12) {
    return { ok: false, error: "태그는 최대 12개까지입니다." };
  }

  const seen = new Set<string>();
  const cleaned: { type: QuestionEntityType; id: string }[] = [];
  for (const e of raw) {
    const id = e.id.trim();
    if (!id) continue;
    const key = `${e.type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (e.type === "product") {
      const p = await getMergedProductById(id);
      if (!p || p.status === "draft") {
        return { ok: false, error: `알 수 없는 제품: ${id}` };
      }
    } else if (e.type === "contaminant") {
      if (!getContaminantById(id)) {
        return { ok: false, error: `알 수 없는 오염: ${id}` };
      }
    } else if (e.type === "material") {
      if (!getMaterialById(id)) {
        return { ok: false, error: `알 수 없는 재질: ${id}` };
      }
    } else if (e.type === "place") {
      if (!isKnownQuestionPlaceId(id)) {
        return { ok: false, error: `알 수 없는 장소: ${id}` };
      }
    } else {
      return { ok: false, error: "지원하지 않는 태그 유형입니다." };
    }
    cleaned.push({ type: e.type, id });
  }

  const { data: q } = await auth.supabase
    .from("questions")
    .select("id, slug")
    .eq("id", questionId)
    .maybeSingle();
  if (!q) return { ok: false, error: "질문을 찾을 수 없습니다." };

  const { error: delErr } = await auth.supabase
    .from("question_entity_links")
    .delete()
    .eq("question_id", questionId);
  if (delErr) return { ok: false, error: delErr.message };

  if (cleaned.length > 0) {
    const firstProduct = cleaned.find((e) => e.type === "product");
    const linkRows = cleaned.map((e) => ({
      question_id: questionId,
      entity_type: e.type,
      entity_id: e.id,
      is_primary: Boolean(firstProduct && e.type === "product" && e.id === firstProduct.id),
    }));
    const { error: insErr } = await auth.supabase
      .from("question_entity_links")
      .insert(linkRows);
    if (insErr) return { ok: false, error: insErr.message };
  }

  const path = questionPath(questionId, String(q.slug));
  revalidatePath(path);
  revalidatePath("/questions");
  revalidatePath("/admin/questions");
  revalidatePath(`/admin/questions/${questionId}`);
  for (const e of cleaned) {
    if (e.type === "product") revalidatePath(`/products/${e.id}`);
  }
  return { ok: true };
}
