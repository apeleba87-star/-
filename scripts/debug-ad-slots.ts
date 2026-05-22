import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const k = trimmed.slice(0, eq).trim();
    let v = trimmed.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
if (!url || !key) {
  console.error("Missing env", { url: !!url, key: !!key });
  process.exit(1);
}
const sb = createClient(url, key);

const keys = ["tender_report_budget_below", "tender_report_premium_core_below"];

async function main() {
  const { data, error } = await sb
    .from("home_ad_slots")
    .select("key, enabled, slot_type, script_content, coupang_config")
    .in("key", keys);

  console.log(JSON.stringify({ error, data }, null, 2));

  const { data: cache } = await sb
    .from("coupang_ad_cache")
    .select("slot_key, products, fetch_error")
    .in("slot_key", keys);

  console.log("cache:", JSON.stringify(cache, null, 2));
}

main().catch(console.error);
