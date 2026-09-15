/**
 * questions id 시퀀스를 MAX(id)에 맞춤 (다음 글이 31번부터)
 * Usage: node scripts/fix-questions-seq.mjs
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

const { data: maxRow } = await sb
  .from("questions")
  .select("id")
  .order("id", { ascending: false })
  .limit(1)
  .maybeSingle();

const maxId = Number(maxRow?.id ?? 0);
console.log("max id:", maxId);
console.log(
  "Supabase SQL Editor에서 실행:\n" +
    `SELECT setval(pg_get_serial_sequence('public.questions','id'), ${Math.max(maxId, 1)});`,
);
