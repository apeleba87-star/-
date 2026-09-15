/**
 * 디자인·SEO 확인용 키엘 샘플 질문 3건.
 * Usage: node scripts/seed-sample-questions.mjs
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  if (!k || k.startsWith("#")) continue;
  env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local)");
  process.exit(1);
}

const sb = createClient(url, key);

function slugify(value) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "question").slice(0, 80);
}

const SAMPLES = [
  {
    title: "사니칼로 샤워부스 유리 물때 제거해도 되나요?",
    body: `욕실 샤워부스 유리에 물때가 많이 끼어서 사니칼(Sanikal)을 써볼까 합니다.

희석은 보통 몇 대 몇으로 하나요? 실리콘 줄눈이나 크롬 수전에 튀면 괜찮은지도 궁금합니다.
산성 세제라서 대리석·천연석에는 안 된다고 들었는데, 유리만 닦을 때는 괜찮나요?`,
    entities: [
      { entity_type: "product", entity_id: "kiehl-sanikal", is_primary: true },
      { entity_type: "contaminant", entity_id: "limescale", is_primary: false },
      { entity_type: "material", entity_id: "glass", is_primary: false },
      { entity_type: "place", entity_id: "locker", is_primary: false },
    ],
  },
  {
    title: "글라스퀸이랑 글라스킹 중에 사무실 유리 청소는 뭘 써야 하나요?",
    body: `사무실 파티션·유리문 정기청소용으로 키엘 유리 세제를 고르고 있습니다.

글라스퀸(Glassqueen)과 글라스킹(Glasking) 차이가 잘 안 잡혀서요.
먼지·손때 위주 일상 청소면 어떤 제품이 맞고, 물때가 섞여 있으면 어떻게 구분하면 될까요?`,
    entities: [
      { entity_type: "product", entity_id: "kiehl-glassqueen", is_primary: true },
      { entity_type: "product", entity_id: "kiehl-glasking", is_primary: false },
      { entity_type: "place", entity_id: "office", is_primary: false },
      { entity_type: "material", entity_id: "glass", is_primary: false },
    ],
  },
  {
    title: "토네이도 희석 비율 바닥 세정기에 맞춰서 쓰는 법 알려주세요",
    body: `상가 로비 PVC·장판 바닥에 키엘 토네이도(Tornado)를 바닥 세정기랑 같이 쓰려고 합니다.

일상 청소용 표준 희석이랑, 기름때·발자국이 심할 때 강한 희석을 어떻게 잡는지요.
거품이 많이 나면 기계에 문제 없는지도 알고 싶습니다.`,
    entities: [
      { entity_type: "product", entity_id: "kiehl-tornado", is_primary: true },
      { entity_type: "place", entity_id: "shop", is_primary: false },
      { entity_type: "contaminant", entity_id: "grease", is_primary: false },
    ],
  },
];

async function main() {
  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id, display_name, role")
    .order("created_at", { ascending: true })
    .limit(5);

  if (pErr) {
    console.error("profiles 조회 실패:", pErr.message);
    process.exit(1);
  }
  const author = profiles?.[0];
  if (!author?.id) {
    console.error("질문을 붙일 profiles 사용자가 없습니다. 회원 1명 이상 필요합니다.");
    process.exit(1);
  }
  console.log("author:", author.id, author.display_name ?? author.role);

  // 마이그레이션 존재 확인
  const { error: pingErr } = await sb.from("questions").select("id").limit(1);
  if (pingErr) {
    console.error(
      "questions 테이블 없음. supabase/migrations/205_product_questions.sql 적용 후 다시 실행하세요.\n",
      pingErr.message,
    );
    process.exit(1);
  }

  for (const sample of SAMPLES) {
    const { data: existing } = await sb
      .from("questions")
      .select("id, slug")
      .eq("title", sample.title)
      .maybeSingle();

    if (existing) {
      console.log("skip (이미 있음):", existing.id, sample.title);
      continue;
    }

    const slug = slugify(sample.title);
    const { data: q, error: qErr } = await sb
      .from("questions")
      .insert({
        author_id: author.id,
        title: sample.title,
        body: sample.body,
        slug,
        status: "published",
      })
      .select("id, slug")
      .single();

    if (qErr || !q) {
      console.error("insert 실패:", sample.title, qErr?.message);
      continue;
    }

    const links = sample.entities.map((e) => ({
      question_id: q.id,
      entity_type: e.entity_type,
      entity_id: e.entity_id,
      is_primary: e.is_primary,
    }));
    const { error: lErr } = await sb.from("question_entity_links").insert(links);
    if (lErr) {
      console.error("links 실패:", q.id, lErr.message);
      await sb.from("questions").delete().eq("id", q.id);
      continue;
    }

    console.log("ok:", q.id, `/questions/${q.id}/${q.slug}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
