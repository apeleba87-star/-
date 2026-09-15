"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { getContaminantById, getMaterialById } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { getMergedProductById } from "@/lib/knowledge-hub/product-catalog";
import {
  questionPath,
  slugifyQuestionTitle,
  type QuestionEntityType,
} from "@/lib/questions/constants";
import { isKnownQuestionPlaceId } from "@/lib/questions/places";
import {
  assertCanPostAnswer,
  assertCanPostQuestion,
} from "@/lib/questions/rate-limit";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

export type ActionResult =
  | { ok: true; questionId?: number; slug?: string; answerId?: string }
  | { ok: false; error: string };

type EntityInput = { type: QuestionEntityType; id: string; primary?: boolean };

async function requireUser() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false as const, error: "로그인이 필요합니다." };
  }
  return { ok: true as const, supabase, user };
}

async function validateEntities(
  entities: EntityInput[],
  opts?: { allowEmpty?: boolean },
): Promise<{ ok: true; entities: EntityInput[] } | { ok: false; error: string }> {
  if (entities.length === 0) {
    if (opts?.allowEmpty) return { ok: true, entities: [] };
    return { ok: false, error: "제품·오염·재질·장소 중 하나 이상 태그를 선택해 주세요." };
  }
  if (entities.length > 12) {
    return { ok: false, error: "태그는 최대 12개까지입니다." };
  }

  const seen = new Set<string>();
  const cleaned: EntityInput[] = [];

  for (const e of entities) {
    const id = e.id.trim();
    if (!id) continue;
    const key = `${e.type}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);

    if (e.type === "product") {
      const p = await getMergedProductById(id);
      if (!p || p.status === "draft") {
        return { ok: false, error: `알 수 없는 제품입니다: ${id}` };
      }
    } else if (e.type === "contaminant") {
      if (!getContaminantById(id)) {
        return { ok: false, error: `알 수 없는 오염입니다: ${id}` };
      }
    } else if (e.type === "material") {
      if (!getMaterialById(id)) {
        return { ok: false, error: `알 수 없는 재질입니다: ${id}` };
      }
    } else if (e.type === "place") {
      if (!isKnownQuestionPlaceId(id)) {
        return { ok: false, error: `알 수 없는 장소입니다: ${id}` };
      }
    } else if (e.type === "equipment") {
      return { ok: false, error: "장비 태그는 아직 지원하지 않습니다." };
    } else {
      return { ok: false, error: "지원하지 않는 태그 유형입니다." };
    }

    cleaned.push({ type: e.type, id, primary: Boolean(e.primary) });
  }

  if (cleaned.length === 0) {
    if (opts?.allowEmpty) return { ok: true, entities: [] };
    return { ok: false, error: "유효한 태그가 없습니다." };
  }

  const products = cleaned.filter((e) => e.type === "product");
  for (const e of cleaned) {
    e.primary = false;
  }
  if (products.length > 0) {
    products[0].primary = true;
  }

  return { ok: true, entities: cleaned };
}

function countExternalLinks(text: string): number {
  const matches = text.match(/https?:\/\//gi);
  return matches?.length ?? 0;
}

export async function createQuestionAction(input: {
  title: string;
  body: string;
  /** 제품 CTA — UI 없이 서버에서만 연결 */
  productId?: string;
  entities?: EntityInput[];
}): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const title = input.title?.trim() ?? "";
  const body = input.body?.trim() ?? "";
  if (title.length < 4 || title.length > 200) {
    return { ok: false, error: "제목은 4~200자로 입력해 주세요." };
  }
  if (body.length < 10 || body.length > 10000) {
    return { ok: false, error: "본문은 10~10000자로 입력해 주세요." };
  }
  if (countExternalLinks(title) + countExternalLinks(body) > 3) {
    return { ok: false, error: "외부 링크는 최대 3개까지 넣을 수 있습니다." };
  }

  const limit = await assertCanPostQuestion(auth.user.id, auth.supabase);
  if (!limit.ok) return limit;

  const draftEntities: EntityInput[] = [...(input.entities ?? [])];
  const silentProduct = input.productId?.trim();
  if (
    silentProduct &&
    !draftEntities.some((e) => e.type === "product" && e.id === silentProduct)
  ) {
    draftEntities.unshift({
      type: "product",
      id: silentProduct,
      primary: true,
    });
  }

  const entities = await validateEntities(draftEntities, { allowEmpty: true });
  if (!entities.ok) return entities;

  const slug = slugifyQuestionTitle(title);
  const { data: row, error } = await auth.supabase
    .from("questions")
    .insert({
      author_id: auth.user.id,
      title,
      body,
      slug,
      status: "published",
    })
    .select("id, slug")
    .single();

  if (error || !row) {
    console.error("[questions] create", error?.message);
    return {
      ok: false,
      error: error?.message?.includes("questions")
        ? "질문 테이블이 없습니다. DB 마이그레이션(205)을 적용해 주세요."
        : "질문을 저장하지 못했습니다.",
    };
  }

  const questionId = Number(row.id);
  if (entities.entities.length > 0) {
    const linkRows = entities.entities.map((e) => ({
      question_id: questionId,
      entity_type: e.type,
      entity_id: e.id,
      is_primary: Boolean(e.primary),
    }));

    const { error: linkErr } = await auth.supabase
      .from("question_entity_links")
      .insert(linkRows);

    if (linkErr) {
      console.error("[questions] links", linkErr.message);
      try {
        const service = createServiceSupabase();
        await service.from("questions").delete().eq("id", questionId);
      } catch (e) {
        console.error("[questions] orphan cleanup", e);
        await auth.supabase.from("questions").delete().eq("id", questionId);
      }
      return { ok: false, error: "연결 저장에 실패했습니다. 다시 시도해 주세요." };
    }
  }

  revalidatePath(questionPath(questionId, slug));
  revalidatePath("/questions");
  // 목록 외 무효화는 응답 이후 (체감 지연 감소)
  const productIds = entities.entities
    .filter((e) => e.type === "product")
    .map((e) => e.id);
  after(() => {
    revalidatePath("/admin/questions");
    revalidatePath("/sitemap.xml");
    revalidatePath("/mypage");
    for (const id of productIds) {
      revalidatePath(`/products/${id}`);
    }
  });

  return { ok: true, questionId, slug };
}

export async function createAnswerAction(input: {
  questionId: number;
  body: string;
  isOfficial?: boolean;
}): Promise<ActionResult> {
  const auth = await requireUser();
  if (!auth.ok) return auth;

  const body = input.body?.trim() ?? "";
  if (body.length < 2 || body.length > 10000) {
    return { ok: false, error: "답변은 2~10000자로 입력해 주세요." };
  }
  if (countExternalLinks(body) > 3) {
    return { ok: false, error: "외부 링크는 최대 3개까지 넣을 수 있습니다." };
  }

  const limit = await assertCanPostAnswer(auth.user.id, auth.supabase);
  if (!limit.ok) return limit;

  const { data: profile } = await auth.supabase
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();
  const isStaff =
    profile?.role === "admin" || profile?.role === "editor";
  const isOfficial = Boolean(input.isOfficial) && isStaff;

  const questionId = Number(input.questionId);
  if (!Number.isFinite(questionId) || questionId < 1) {
    return { ok: false, error: "잘못된 질문입니다." };
  }

  const { data: q } = await auth.supabase
    .from("questions")
    .select("id, slug, title, status, deleted_at, author_id")
    .eq("id", questionId)
    .maybeSingle();

  if (!q || q.status !== "published" || q.deleted_at) {
    return { ok: false, error: "답변할 수 없는 질문입니다." };
  }

  const { data: row, error } = await auth.supabase
    .from("question_answers")
    .insert({
      question_id: questionId,
      author_id: auth.user.id,
      body,
      is_official: isOfficial,
      status: "published",
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[questions] answer", error?.message);
    return { ok: false, error: "답변을 저장하지 못했습니다." };
  }

  const path = questionPath(questionId, String(q.slug));
  revalidatePath(path);
  revalidatePath("/questions");
  after(() => {
    revalidatePath("/mypage");
    revalidatePath("/notifications");
  });

  const { notifyQuestionAnswered } = await import("@/lib/questions/notify");
  // 알림은 응답과 무관 — 기다리지 않음
  void notifyQuestionAnswered({
    questionAuthorId: String(q.author_id),
    answerAuthorId: auth.user.id,
    answerId: String(row.id),
    questionId,
    questionSlug: String(q.slug),
    questionTitle: String(q.title ?? ""),
    isOfficial,
  });

  return { ok: true, answerId: String(row.id) };
}

/** 공개 상세 조회수 +1 (실패해도 페이지는 유지). viewerKey로 5분 쿨다운 */
export async function recordQuestionViewAction(
  questionId: number,
  viewerKey?: string,
): Promise<{ ok: boolean; viewCount?: number }> {
  const id = Number(questionId);
  if (!Number.isFinite(id) || id < 1) return { ok: false };

  const key = viewerKey?.trim().slice(0, 80) || undefined;
  const supabase = await createServerSupabase();

  let data: unknown;
  let error: { message: string } | null = null;

  const withKey = await supabase.rpc("record_question_view", {
    p_question_id: id,
    p_viewer_key: key ?? null,
  });
  data = withKey.data;
  error = withKey.error;

  // 208 미적용 시 구 RPC(인자 1개)로 폴백
  if (error?.message?.includes("record_question_view")) {
    const legacy = await supabase.rpc("record_question_view", {
      p_question_id: id,
    });
    data = legacy.data;
    error = legacy.error;
  }

  if (error) {
    console.error("[questions] view", error.message);
    return { ok: false };
  }
  return { ok: true, viewCount: Number(data ?? 0) };
}
