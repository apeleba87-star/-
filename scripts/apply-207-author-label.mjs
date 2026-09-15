/**
 * 207 author_label 컬럼 적용 시도 (DATABASE_URL 있을 때)
 * 없으면 SQL 안내만 출력
 */
import fs from "fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  if (!k || k.startsWith("#")) continue;
  env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const sql = fs.readFileSync(
  "supabase/migrations/207_question_author_label.sql",
  "utf8",
);
const conn =
  env.DATABASE_URL || env.DIRECT_URL || env.POSTGRES_URL || env.SUPABASE_DB_URL;

if (!conn) {
  console.log(sql);
  console.log(
    "\n↑ Supabase SQL Editor에 붙여 실행한 뒤:\n  node scripts/seed-questions-board.mjs --reset",
  );
  process.exit(0);
}

try {
  const pg = await import("pg");
  const client = new pg.default.Client({
    connectionString: conn,
    ssl: conn.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();
  await client.query(sql);
  await client.end();
  console.log("applied 207_question_author_label.sql");
} catch (e) {
  console.error(e.message ?? e);
  console.log("\n수동 실행 SQL:\n", sql);
  process.exit(1);
}
