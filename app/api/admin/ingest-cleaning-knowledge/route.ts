import { NextResponse } from "next/server";
import { INITIAL_CLEANING_KNOWLEDGE } from "@/lib/knowledge-hub/cleaning-knowledge/initial-knowledge";
import { mergeKnowledgeDb } from "@/lib/knowledge-hub/cleaning-knowledge/merge";
import type { CleaningKnowledgeDb } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { createServerSupabase } from "@/lib/supabase-server";

async function requireOperator() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "로그인이 필요합니다.", status: 401 };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { ok: false as const, error: "권한이 없습니다.", status: 403 };
  }
  return { ok: true as const };
}

/** POST: 패치 병합 시뮬레이션 (중복 제거 결과 반환). 영구 저장은 Cursor가 initial-knowledge.ts 갱신 */
export async function POST(req: Request) {
  const auth = await requireOperator();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  let patch: Partial<CleaningKnowledgeDb>;
  try {
    patch = (await req.json()) as Partial<CleaningKnowledgeDb>;
  } catch {
    return NextResponse.json({ ok: false, error: "JSON 파싱 실패" }, { status: 400 });
  }

  const merged = { ...INITIAL_CLEANING_KNOWLEDGE };
  const result = mergeKnowledgeDb(merged, patch);

  return NextResponse.json({
    ok: true,
    ingest: result,
    stats: {
      version: merged.version,
      products: merged.products.length,
      facts: merged.facts.length,
      recipes: merged.recipes.length,
      qaCases: merged.qaCases.length,
      rules: merged.rules.length,
    },
    note: "런타임 DB는 initial-knowledge.ts입니다. 승인된 패치는 해당 파일에 반영하세요.",
  });
}

export async function GET() {
  const auth = await requireOperator();
  if (!auth.ok) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  const db = INITIAL_CLEANING_KNOWLEDGE;
  return NextResponse.json({
    ok: true,
    version: db.version,
    updatedAt: db.updatedAt,
    counts: {
      materials: db.materials.length,
      contaminants: db.contaminants.length,
      products: db.products.length,
      facts: db.facts.length,
      recipes: db.recipes.length,
      qaCases: db.qaCases.length,
      rules: db.rules.length,
    },
  });
}
