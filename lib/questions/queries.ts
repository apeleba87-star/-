import {
  PRODUCT_QUESTIONS_PREVIEW,
  QUESTIONS_LIST_PAGE_SIZE,
  OFFICIAL_ANSWER_DISPLAY_NAME,
  type QuestionEntityType,
} from "@/lib/questions/constants";
import { resolveEntityLinks } from "@/lib/questions/resolve-entities";
import type {
  QuestionAnswerRow,
  QuestionDetail,
  QuestionEntityLinkRow,
  QuestionListItem,
  QuestionRow,
} from "@/lib/questions/types";
import {
  createClient,
  createServerSupabase,
  createServiceSupabase,
} from "@/lib/supabase-server";

type ProfileLite = { id: string; display_name: string | null; role: string | null };

/** 게시판 작성자 표시용 — profiles는 본인만 SELECT 가능해서 service role로 표시명만 조회 */
async function profilesByIds(
  ids: string[],
): Promise<Map<string, ProfileLite>> {
  const unique = [...new Set(ids.filter(Boolean))];
  const map = new Map<string, ProfileLite>();
  if (unique.length === 0) return map;

  let supabase;
  try {
    supabase = createServiceSupabase();
  } catch {
    supabase = createClient();
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, role")
    .in("id", unique);

  if (error) {
    console.error("[questions] profilesByIds", error.message);
    return map;
  }

  for (const row of data ?? []) {
    map.set(row.id as string, {
      id: row.id as string,
      display_name: (row.display_name as string | null) ?? null,
      role: (row.role as string | null) ?? null,
    });
  }
  return map;
}

function mapQuestion(row: Record<string, unknown>): QuestionRow {
  return {
    id: Number(row.id),
    author_id: String(row.author_id),
    title: String(row.title),
    body: String(row.body),
    slug: String(row.slug),
    status: row.status as QuestionRow["status"],
    answer_count: Number(row.answer_count ?? 0),
    view_count: Number(row.view_count ?? 0),
    author_label: (row.author_label as string | null) ?? null,
    deleted_at: (row.deleted_at as string | null) ?? null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

function resolveAuthorLabel(
  authorLabel: string | null | undefined,
  profileName: string | null | undefined,
): string | null {
  const label = authorLabel?.trim();
  if (label) return label;
  const name = profileName?.trim();
  if (name) return name;
  return null;
}

const QUESTION_LIST_SELECTS = [
  "id, author_id, title, slug, answer_count, view_count, author_label, created_at",
  "id, author_id, title, slug, answer_count, author_label, created_at",
  "id, author_id, title, slug, answer_count, view_count, created_at",
  "id, author_id, title, slug, answer_count, created_at",
] as const;

function isMissingColumnError(message: string | undefined): boolean {
  if (!message) return false;
  return (
    message.includes("view_count") ||
    message.includes("author_label") ||
    message.includes("does not exist")
  );
}

export type ListQuestionsFilter = {
  productId?: string;
  contaminantId?: string;
  materialId?: string;
  placeId?: string;
  page?: number;
};

export async function listPublishedQuestions(
  filter: ListQuestionsFilter = {},
): Promise<{ items: QuestionListItem[]; total: number }> {
  const page = Math.max(1, filter.page ?? 1);
  const from = (page - 1) * QUESTIONS_LIST_PAGE_SIZE;
  const to = from + QUESTIONS_LIST_PAGE_SIZE - 1;

  const supabase = createClient();

  let questionIds: number[] | null = null;
  const entityFilter: { type: QuestionEntityType; id: string } | null =
    filter.productId
      ? { type: "product", id: filter.productId }
      : filter.contaminantId
        ? { type: "contaminant", id: filter.contaminantId }
        : filter.materialId
          ? { type: "material", id: filter.materialId }
          : filter.placeId
            ? { type: "place", id: filter.placeId }
            : null;

  if (entityFilter) {
    const { data: linkRows, error: linkErr } = await supabase
      .from("question_entity_links")
      .select("question_id")
      .eq("entity_type", entityFilter.type)
      .eq("entity_id", entityFilter.id);
    if (linkErr) {
      console.error("[questions] list links", linkErr.message);
      return { items: [], total: 0 };
    }
    questionIds = [...new Set((linkRows ?? []).map((r) => Number(r.question_id)))];
    if (questionIds.length === 0) return { items: [], total: 0 };
  }

  let data: Record<string, unknown>[] | null = null;
  let error: { message: string } | null = null;
  let count: number | null = null;

  for (const select of QUESTION_LIST_SELECTS) {
    let q = supabase
      .from("questions")
      .select(select, { count: "exact" })
      .eq("status", "published")
      .is("deleted_at", null)
      .order("id", { ascending: false });
    if (questionIds) q = q.in("id", questionIds);
    const result = await q.range(from, to);
    data = (result.data as Record<string, unknown>[] | null) ?? null;
    error = result.error;
    count = result.count;
    if (!error) break;
    if (!isMissingColumnError(error.message)) break;
  }

  if (error) {
    console.error("[questions] list", error.message);
    return { items: [], total: 0 };
  }

  const rows = data ?? [];
  const ids = rows.map((r) => Number(r.id));
  const authorIds = rows.map((r) => String(r.author_id));
  const profiles = await profilesByIds(authorIds);

  const primaryProduct = new Map<number, string>();
  if (ids.length > 0) {
    const { data: links } = await supabase
      .from("question_entity_links")
      .select("question_id, entity_id, is_primary")
      .eq("entity_type", "product")
      .in("question_id", ids);
    for (const link of links ?? []) {
      const qid = Number(link.question_id);
      if (link.is_primary || !primaryProduct.has(qid)) {
        primaryProduct.set(qid, String(link.entity_id));
      }
    }
  }

  const productIds = [...new Set(primaryProduct.values())];
  const productNames = new Map<string, string>();
  if (productIds.length > 0) {
    const { listMergedProducts } = await import(
      "@/lib/knowledge-hub/product-catalog"
    );
    const products = await listMergedProducts();
    for (const p of products) {
      if (productIds.includes(p.id)) productNames.set(p.id, p.name);
    }
  }

  const items: QuestionListItem[] = rows.map((r) => {
    const id = Number(r.id);
    const pid = primaryProduct.get(id) ?? null;
    return {
      id,
      title: String(r.title),
      slug: String(r.slug),
      answer_count: Number(r.answer_count ?? 0),
      view_count: Number(r.view_count ?? 0),
      created_at: String(r.created_at),
      author_display_name: resolveAuthorLabel(
        r.author_label as string | null | undefined,
        profiles.get(String(r.author_id))?.display_name,
      ),
      primary_product_id: pid,
      primary_product_name: pid ? productNames.get(pid) ?? null : null,
    };
  });

  return { items, total: count ?? items.length };
}

export async function listQuestionsForProduct(
  productId: string,
  limit = PRODUCT_QUESTIONS_PREVIEW,
): Promise<QuestionListItem[]> {
  const supabase = createClient();
  const { data: links } = await supabase
    .from("question_entity_links")
    .select("question_id")
    .eq("entity_type", "product")
    .eq("entity_id", productId);

  const ids = [...new Set((links ?? []).map((l) => Number(l.question_id)))];
  if (ids.length === 0) return [];

  let listRows: Record<string, unknown>[] | null = null;
  for (const select of QUESTION_LIST_SELECTS) {
    const result = await supabase
      .from("questions")
      .select(select)
      .eq("status", "published")
      .is("deleted_at", null)
      .in("id", ids)
      .order("id", { ascending: false })
      .limit(limit);
    listRows = (result.data as Record<string, unknown>[] | null) ?? null;
    if (!result.error) break;
    if (!isMissingColumnError(result.error.message)) break;
  }

  const authorIds = (listRows ?? []).map((r) => String(r.author_id));
  const profiles = await profilesByIds(authorIds);

  return (listRows ?? []).map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    slug: String(r.slug),
    answer_count: Number(r.answer_count ?? 0),
    view_count: Number(r.view_count ?? 0),
    created_at: String(r.created_at),
    author_display_name: resolveAuthorLabel(
      r.author_label as string | null | undefined,
      profiles.get(String(r.author_id))?.display_name,
    ),
    primary_product_id: productId,
    primary_product_name: null,
  }));
}

export async function getPublishedQuestionById(
  id: number,
): Promise<QuestionDetail | null> {
  const supabase = createClient();
  const { data: row, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .eq("status", "published")
    .is("deleted_at", null)
    .maybeSingle();

  if (error || !row) return null;

  const question = mapQuestion(row);
  const { data: linkRows } = await supabase
    .from("question_entity_links")
    .select("*")
    .eq("question_id", id);

  const links = (linkRows ?? []).map(
    (l): QuestionEntityLinkRow => ({
      id: String(l.id),
      question_id: Number(l.question_id),
      entity_type: l.entity_type as QuestionEntityLinkRow["entity_type"],
      entity_id: String(l.entity_id),
      is_primary: Boolean(l.is_primary),
      created_at: String(l.created_at),
    }),
  );

  const { data: answerRows } = await supabase
    .from("question_answers")
    .select("*")
    .eq("question_id", id)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("is_official", { ascending: false })
    .order("created_at", { ascending: true });

  const answersRaw = (answerRows ?? []).map(
    (a): QuestionAnswerRow => ({
      id: String(a.id),
      question_id: Number(a.question_id),
      author_id: String(a.author_id),
      parent_id: (a.parent_id as string | null) ?? null,
      body: String(a.body),
      is_official: Boolean(a.is_official),
      status: a.status as QuestionAnswerRow["status"],
      deleted_at: (a.deleted_at as string | null) ?? null,
      created_at: String(a.created_at),
      updated_at: String(a.updated_at),
    }),
  );

  const profileIds = [
    question.author_id,
    ...answersRaw.map((a) => a.author_id),
  ];
  const profiles = await profilesByIds(profileIds);
  const author = profiles.get(question.author_id);
  const resolved_links = await resolveEntityLinks(links);

  const withNames = answersRaw.map((a) => {
    const p = profiles.get(a.author_id);
    return {
      ...a,
      author_display_name: a.is_official
        ? OFFICIAL_ANSWER_DISPLAY_NAME
        : p?.display_name?.trim() || null,
      author_role: p?.role ?? null,
    };
  });

  const topLevel = withNames.filter((a) => !a.parent_id);
  const repliesByParent = new Map<string, typeof withNames>();
  for (const a of withNames) {
    if (!a.parent_id) continue;
    const list = repliesByParent.get(a.parent_id) ?? [];
    list.push(a);
    repliesByParent.set(a.parent_id, list);
  }

  return {
    ...question,
    author_display_name: resolveAuthorLabel(
      question.author_label,
      author?.display_name,
    ),
    author_role: author?.role ?? null,
    links,
    resolved_links,
    answers: topLevel.map((a) => ({
      ...a,
      replies: repliesByParent.get(a.id) ?? [],
    })),
  };
}

export async function listSitemapQuestions(): Promise<
  { id: number; slug: string; updated_at: string }[]
> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("questions")
    .select("id, slug, updated_at")
    .eq("status", "published")
    .is("deleted_at", null)
    .order("id", { ascending: true })
    .limit(5000);

  if (error) {
    console.error("[questions] sitemap", error.message);
    return [];
  }
  return (data ?? []).map((r) => ({
    id: Number(r.id),
    slug: String(r.slug),
    updated_at: String(r.updated_at),
  }));
}

export async function getAdminQuestionById(id: number): Promise<{
  question: QuestionRow;
  links: QuestionEntityLinkRow[];
  author_display_name: string | null;
} | null> {
  const supabase = await createServerSupabase();
  const { data: row, error } = await supabase
    .from("questions")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !row) return null;

  const question = mapQuestion(row);
  const { data: linkRows } = await supabase
    .from("question_entity_links")
    .select("*")
    .eq("question_id", id);

  const links = (linkRows ?? []).map(
    (l): QuestionEntityLinkRow => ({
      id: String(l.id),
      question_id: Number(l.question_id),
      entity_type: l.entity_type as QuestionEntityLinkRow["entity_type"],
      entity_id: String(l.entity_id),
      is_primary: Boolean(l.is_primary),
      created_at: String(l.created_at),
    }),
  );

  const profiles = await profilesByIds([question.author_id]);
  return {
    question,
    links,
    author_display_name: resolveAuthorLabel(
      question.author_label,
      profiles.get(question.author_id)?.display_name,
    ),
  };
}

/** 관리자: 최근 질문 (삭제 포함 조회는 서버 세션 + RLS admin) */
export async function listAdminRecentQuestions(limit = 50): Promise<
  (QuestionRow & { author_display_name: string | null })[]
> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("questions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[questions] admin list", error.message);
    return [];
  }

  const rows = (data ?? []).map(mapQuestion);
  const profiles = await profilesByIds(rows.map((r) => r.author_id));
  return rows.map((r) => ({
    ...r,
    author_display_name: resolveAuthorLabel(
      r.author_label,
      profiles.get(r.author_id)?.display_name,
    ),
  }));
}

export type MyQuestionItem = {
  id: number;
  title: string;
  slug: string;
  answer_count: number;
  view_count: number;
  created_at: string;
};

export type MyAnswerItem = {
  id: string;
  body: string;
  is_official: boolean;
  created_at: string;
  question_id: number;
  question_title: string;
  question_slug: string;
};

/** 마이페이지 — 내가 쓴 질문 */
export async function listMyQuestions(
  userId: string,
  limit = 30,
): Promise<MyQuestionItem[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("questions")
    .select("id, title, slug, answer_count, view_count, created_at")
    .eq("author_id", userId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[questions] listMyQuestions", error.message);
    return [];
  }

  return (data ?? []).map((r) => ({
    id: Number(r.id),
    title: String(r.title),
    slug: String(r.slug),
    answer_count: Number(r.answer_count ?? 0),
    view_count: Number((r as { view_count?: number }).view_count ?? 0),
    created_at: String(r.created_at),
  }));
}

/** 마이페이지 — 내가 쓴 답변 */
export async function listMyAnswers(
  userId: string,
  limit = 30,
): Promise<MyAnswerItem[]> {
  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("question_answers")
    .select(
      "id, body, is_official, created_at, question_id, questions!inner(id, title, slug, status, deleted_at)",
    )
    .eq("author_id", userId)
    .eq("status", "published")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    // join 실패 시 단순 조회 후 질문 보강
    console.error("[questions] listMyAnswers", error.message);
    const fallback = await supabase
      .from("question_answers")
      .select("id, body, is_official, created_at, question_id")
      .eq("author_id", userId)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);
    if (fallback.error || !fallback.data?.length) return [];

    const qids = [...new Set(fallback.data.map((a) => Number(a.question_id)))];
    const { data: qs } = await supabase
      .from("questions")
      .select("id, title, slug")
      .in("id", qids)
      .eq("status", "published")
      .is("deleted_at", null);
    const qmap = new Map(
      (qs ?? []).map((q) => [
        Number(q.id),
        { title: String(q.title), slug: String(q.slug) },
      ]),
    );

    return fallback.data
      .map((a) => {
        const q = qmap.get(Number(a.question_id));
        if (!q) return null;
        return {
          id: String(a.id),
          body: String(a.body),
          is_official: Boolean(a.is_official),
          created_at: String(a.created_at),
          question_id: Number(a.question_id),
          question_title: q.title,
          question_slug: q.slug,
        };
      })
      .filter((x): x is MyAnswerItem => x != null);
  }

  return (data ?? [])
    .map((row) => {
      const r = row as {
        id: string;
        body: string;
        is_official: boolean;
        created_at: string;
        question_id: number;
        questions:
          | {
              id: number;
              title: string;
              slug: string;
              status: string;
              deleted_at: string | null;
            }
          | {
              id: number;
              title: string;
              slug: string;
              status: string;
              deleted_at: string | null;
            }[]
          | null;
      };
      const q = Array.isArray(r.questions) ? r.questions[0] : r.questions;
      if (!q || q.status !== "published" || q.deleted_at) return null;
      return {
        id: String(r.id),
        body: String(r.body),
        is_official: Boolean(r.is_official),
        created_at: String(r.created_at),
        question_id: Number(r.question_id),
        question_title: String(q.title),
        question_slug: String(q.slug),
      };
    })
    .filter((x): x is MyAnswerItem => x != null);
}
