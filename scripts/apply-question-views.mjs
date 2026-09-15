/**
 * Apply question view_count DDL using DATABASE_URL / DIRECT_URL if present.
 * Usage: node scripts/apply-question-views.mjs
 */
import fs from "fs";
import pg from "pg";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  if (!k || k.startsWith("#")) continue;
  env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const conn =
  env.DATABASE_URL ||
  env.DIRECT_URL ||
  env.POSTGRES_URL ||
  env.SUPABASE_DB_URL;

if (!conn) {
  console.error(
    "DATABASE_URL(또는 DIRECT_URL)이 .env.local에 없습니다.\n" +
      "Supabase SQL Editor에서 supabase/migrations/206_question_view_count.sql 을 실행하세요.",
  );
  process.exit(1);
}

const sql = fs.readFileSync(
  "supabase/migrations/206_question_view_count.sql",
  "utf8",
);
const client = new pg.Client({
  connectionString: conn,
  ssl: conn.includes("localhost") ? undefined : { rejectUnauthorized: false },
});
await client.connect();
try {
  await client.query(sql);
  console.log("applied 206_question_view_count.sql");
} finally {
  await client.end();
}
