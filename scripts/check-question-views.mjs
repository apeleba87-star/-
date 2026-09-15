/**
 * Apply 206_question_view_count.sql via PostgREST is not possible for DDL.
 * Uses service role + pg REST only if available; otherwise prints SQL reminder.
 *
 * Prefer: supabase db push / SQL editor에 206 마이그레이션 실행
 *
 * Fallback: ALTER via supabase-js won't run raw DDL. This script only verifies column.
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

const { data, error } = await sb.from("questions").select("id, view_count").limit(1);
if (error) {
  console.error("view_count 컬럼 없음 또는 오류:", error.message);
  console.error("→ supabase/migrations/206_question_view_count.sql 을 SQL Editor에서 실행하세요.");
  process.exit(1);
}
console.log("view_count OK", data);
