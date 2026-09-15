import AdminQuestionsPanel from "@/app/admin/questions/AdminQuestionsPanel";
import {
  getContaminantById,
  getMaterialById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { listMergedProducts } from "@/lib/knowledge-hub/product-catalog";
import { getQuestionPlaceLabel } from "@/lib/questions/places";
import { listAdminRecentQuestions } from "@/lib/questions/queries";
import { createServerSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export default async function AdminQuestionsPage() {
  const items = await listAdminRecentQuestions(80);
  const authorIds = [...new Set(items.map((i) => i.author_id))];
  const questionIds = items.map((i) => i.id);
  const supabase = await createServerSupabase();

  const suspendMap = new Map<string, string | null>();
  if (authorIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, questions_suspended_at")
      .in("id", authorIds);
    for (const row of data ?? []) {
      suspendMap.set(
        row.id as string,
        (row.questions_suspended_at as string | null) ?? null,
      );
    }
  }

  const linksByQuestion = new Map<
    number,
    { entity_type: string; entity_id: string }[]
  >();
  if (questionIds.length > 0) {
    const { data: links } = await supabase
      .from("question_entity_links")
      .select("question_id, entity_type, entity_id")
      .in("question_id", questionIds);
    for (const link of links ?? []) {
      const qid = Number(link.question_id);
      const arr = linksByQuestion.get(qid) ?? [];
      arr.push({
        entity_type: String(link.entity_type),
        entity_id: String(link.entity_id),
      });
      linksByQuestion.set(qid, arr);
    }
  }

  const products = await listMergedProducts();
  const productName = new Map(products.map((p) => [p.id, p.name]));

  function summarize(qid: number): { tag_count: number; tag_summary: string | null } {
    const links = linksByQuestion.get(qid) ?? [];
    if (links.length === 0) return { tag_count: 0, tag_summary: null };
    const parts: string[] = [];
    for (const l of links) {
      if (l.entity_type === "product") {
        parts.push(productName.get(l.entity_id) ?? l.entity_id);
      } else if (l.entity_type === "contaminant") {
        parts.push(getContaminantById(l.entity_id)?.name ?? l.entity_id);
      } else if (l.entity_type === "material") {
        parts.push(getMaterialById(l.entity_id)?.name ?? l.entity_id);
      } else if (l.entity_type === "place") {
        parts.push(getQuestionPlaceLabel(l.entity_id) ?? l.entity_id);
      }
    }
    return {
      tag_count: links.length,
      tag_summary: parts.length ? parts.join(" · ") : null,
    };
  }

  const rows = items.map((i) => {
    const tags = summarize(i.id);
    return {
      ...i,
      questions_suspended_at: suspendMap.get(i.author_id) ?? null,
      tag_count: tags.tag_count,
      tag_summary: tags.tag_summary,
    };
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-slate-900">질문 게시판 관리</h1>
      <p className="mt-1 text-sm text-slate-600">
        경로: 관리자 → 질문 게시판 → <strong>태그 지정</strong>. 사용자 작성에는 태그가
        없고, 여기서 제품·오염 등을 연결합니다.
      </p>
      <div className="mt-6">
        <AdminQuestionsPanel items={rows} />
      </div>
    </div>
  );
}
