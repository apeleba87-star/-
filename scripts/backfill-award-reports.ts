/**
 * 낙찰 리포트 card_headline 일괄 강제 재생성
 *   npx tsx scripts/backfill-award-reports.ts
 *   npx tsx scripts/backfill-award-reports.ts --days=14
 */
import fs from "fs";
import path from "path";

function loadEnvFile(name: string) {
  const p = path.join(process.cwd(), name);
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

async function main() {
  loadEnvFile(".env.local");
  loadEnvFile(".env");

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요합니다.");
    process.exit(1);
  }

  const { createServiceSupabase } = await import("../lib/supabase-server");
  const { runAwardMarketReportJob, refreshAwardReportDailyCard } = await import(
    "../lib/content/award-market-report-job"
  );

  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const maxDays = daysArg ? Math.max(1, parseInt(daysArg.split("=")[1]!, 10)) : 30;

  const supabase = createServiceSupabase();

  const { data: posts, error } = await supabase
    .from("posts")
    .select("source_ref, published_at")
    .eq("source_type", "award_market_intel")
    .not("published_at", "is", null)
    .order("source_ref", { ascending: false });

  if (error) {
    console.error(error.message);
    process.exit(1);
  }

  const keys = [
    ...new Set(
      (posts ?? [])
        .map((p) => p.source_ref)
        .filter((k): k is string => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k))
    ),
  ].slice(0, maxDays);

  console.log(`재생성 ${keys.length}일: ${keys.join(", ")}`);

  let ok = 0;
  let cardOnly = 0;
  let skipped = 0;
  let fail = 0;

  for (const periodKey of keys) {
    const at = new Date(`${periodKey}T15:00:00+09:00`);
    const result = await runAwardMarketReportJob(supabase, {
      force: true,
      autoPublish: true,
      at,
    });
    if (!result.ok) {
      fail += 1;
      console.error(`FAIL ${periodKey}:`, result.error);
      continue;
    }
    if (result.skipped && result.reason === "no_awards") {
      const card = await refreshAwardReportDailyCard(supabase, periodKey);
      if (!card.ok) {
        skipped += 1;
        console.log(`SKIP ${periodKey}: no_awards (${card.error})`);
        continue;
      }
      cardOnly += 1;
      console.log(`CARD ${periodKey}: ${card.card_headline}`);
      continue;
    }
    if (result.skipped) {
      skipped += 1;
      console.log(`SKIP ${periodKey}: ${result.reason ?? result.message}`);
      continue;
    }
    ok += 1;
    const excerpt = await supabase
      .from("posts")
      .select("excerpt")
      .eq("id", result.post_id!)
      .single();
    console.log(`OK ${periodKey}: ${excerpt.data?.excerpt ?? "(no excerpt)"}`);
  }

  console.log(`\n완료 — 전체 재생성 ${ok}, 카드만 갱신 ${cardOnly}, 건너뜀 ${skipped}, 실패 ${fail}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
