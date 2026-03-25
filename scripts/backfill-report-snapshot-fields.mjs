#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";

function loadEnvLocal() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(m[1] in process.env)) process.env[m[1]] = v;
  }
}

function ensureBandsFromTopTenders(topTenders = [], hasUnknown = false) {
  const bands = new Map([
    ["1천만원 미만", 0],
    ["1천만~5천만원", 0],
    ["5천만~1억원", 0],
    ["1억원 이상", 0],
    ["금액 미기재", hasUnknown ? 1 : 0],
  ]);
  for (const t of topTenders) {
    const amt = Number(t?.budget ?? 0);
    if (!Number.isFinite(amt) || amt <= 0) {
      bands.set("금액 미기재", (bands.get("금액 미기재") ?? 0) + 1);
    } else if (amt < 10_000_000) {
      bands.set("1천만원 미만", (bands.get("1천만원 미만") ?? 0) + 1);
    } else if (amt < 50_000_000) {
      bands.set("1천만~5천만원", (bands.get("1천만~5천만원") ?? 0) + 1);
    } else if (amt < 100_000_000) {
      bands.set("5천만~1억원", (bands.get("5천만~1억원") ?? 0) + 1);
    } else {
      bands.set("1억원 이상", (bands.get("1억원 이상") ?? 0) + 1);
    }
  }
  return Array.from(bands.entries()).map(([label, count]) => ({ label, count }));
}

function ensureAgenciesFromTopTenders(topTenders = []) {
  const map = new Map();
  for (const t of topTenders) {
    const name = (t?.agency ?? "").trim() || "기타";
    map.set(name, (map.get(name) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error("SUPABASE_SERVICE_ROLE_KEY가 필요합니다. (.env.local 또는 환경변수)");
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey);
  const { data: posts, error } = await supabase
    .from("posts")
    .select("id, report_snapshot")
    .not("published_at", "is", null)
    .not("report_snapshot", "is", null)
    .or("source_type.not.is.null,slug.ilike.*daily-tender-digest*")
    .limit(1000);
  if (error) throw error;

  let updatedPosts = 0;
  for (const row of posts ?? []) {
    const snap = row.report_snapshot;
    if (!snap || typeof snap !== "object") continue;
    const s = { ...snap };
    if (!Array.isArray(s.agency_breakdown)) {
      s.agency_breakdown = ensureAgenciesFromTopTenders(Array.isArray(s.top_budget_tenders) ? s.top_budget_tenders : []);
    }
    if (!Array.isArray(s.budget_band_breakdown)) {
      s.budget_band_breakdown = ensureBandsFromTopTenders(
        Array.isArray(s.top_budget_tenders) ? s.top_budget_tenders : [],
        Boolean(s.has_budget_unknown)
      );
    }
    const changed =
      JSON.stringify(s.agency_breakdown) !== JSON.stringify(snap.agency_breakdown) ||
      JSON.stringify(s.budget_band_breakdown) !== JSON.stringify(snap.budget_band_breakdown);
    if (!changed) continue;
    const { error: upErr } = await supabase.from("posts").update({ report_snapshot: s }).eq("id", row.id);
    if (!upErr) updatedPosts += 1;
  }

  const { data: snapshots, error: snapErr } = await supabase
    .from("report_snapshots")
    .select("id, content_full")
    .limit(2000);
  if (snapErr) throw snapErr;

  let updatedSnapshots = 0;
  for (const row of snapshots ?? []) {
    const full = row.content_full;
    if (!full || typeof full !== "object") continue;
    const f = { ...full };
    if (!Array.isArray(f.agency_breakdown)) {
      f.agency_breakdown = ensureAgenciesFromTopTenders(Array.isArray(f.top_tenders) ? f.top_tenders : []);
    }
    if (!Array.isArray(f.budget_band_breakdown)) {
      f.budget_band_breakdown = ensureBandsFromTopTenders(
        Array.isArray(f.top_tenders) ? f.top_tenders : [],
        Boolean(f.has_budget_unknown)
      );
    }
    const changed =
      JSON.stringify(f.agency_breakdown) !== JSON.stringify(full.agency_breakdown) ||
      JSON.stringify(f.budget_band_breakdown) !== JSON.stringify(full.budget_band_breakdown);
    if (!changed) continue;
    const { error: upErr } = await supabase
      .from("report_snapshots")
      .update({ content_full: f, updated_at: new Date().toISOString() })
      .eq("id", row.id);
    if (!upErr) updatedSnapshots += 1;
  }

  console.log(`backfill complete: posts=${updatedPosts}, snapshots=${updatedSnapshots}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});

