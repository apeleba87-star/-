/**
 * 샘플 질문에 답변 1건 추가 (목록에서 답변 수 확인용)
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

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: profiles } = await sb
  .from("profiles")
  .select("id")
  .order("created_at", { ascending: true })
  .limit(1);
const authorId = profiles?.[0]?.id;
if (!authorId) {
  console.error("no profile");
  process.exit(1);
}

const questionId = 1;
const body =
  "유리만 닦을 때는 사니칼 희석(제품 안내 비율)으로 가능합니다. 실리콘 줄눈·크롬에는 오래 두지 말고 바로 물로 닦아내세요. 대리석·천연석에는 쓰지 않는 게 안전합니다.";

const { data: existing } = await sb
  .from("question_answers")
  .select("id")
  .eq("question_id", questionId)
  .limit(1)
  .maybeSingle();

if (existing) {
  console.log("skip: already has answer", existing.id);
  process.exit(0);
}

const { data, error } = await sb
  .from("question_answers")
  .insert({
    question_id: questionId,
    author_id: authorId,
    body,
    is_official: true,
    status: "published",
  })
  .select("id")
  .single();

if (error) {
  console.error(error.message);
  process.exit(1);
}
console.log("answer ok", data.id, "on question", questionId);
