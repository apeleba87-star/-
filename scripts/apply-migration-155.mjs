/**
 * Supabase SQL Editor에 붙여넣을 migration 155 내용을 출력합니다.
 * Usage: node scripts/apply-migration-155.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sql = fs.readFileSync(
  path.join(__dirname, "../supabase/migrations/155_demand_keyword_daily_phrase_unique.sql"),
  "utf8"
);
console.log(sql);
