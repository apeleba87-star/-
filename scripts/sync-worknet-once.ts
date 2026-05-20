/**
 * 로컬 1회: 워크넷 수집 → 정규화 → 스냅샷
 *   npx tsx scripts/sync-worknet-once.ts
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

loadEnvFile(".env.local");
loadEnvFile(".env");

async function main() {
  const apiKey = process.env.WORKNET_API_KEY?.trim();
  if (!apiKey) {
    console.error("WORKNET_API_KEY 가 .env.local 에 없습니다.");
    process.exit(1);
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()) {
    console.error("NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 가 필요합니다.");
    process.exit(1);
  }

  const { createServiceSupabase } = await import("../lib/supabase-server");
  const { runWorknetWantedIngest } = await import("../lib/jobs-public-ingest/worknet/run-ingest");
  const { runWorknetNormalizeFromRaw } = await import("../lib/jobs-public-ingest/run-worknet-normalize");
  const { computeJobSpotlightSnapshots } = await import(
    "../lib/jobs-public-ingest/compute-job-spotlight-snapshots"
  );

  const supabase = createServiceSupabase();

  console.log("1/3 워크넷 수집…");
  const ingest = await runWorknetWantedIngest({
    supabase,
    apiKey,
    maxRowsPerKeyword: Number(process.env.WORKNET_INGEST_MAX_ROWS ?? 300),
    regDate: "W-2",
  });
  console.log(ingest);
  if (!ingest.ok) process.exit(1);

  console.log("2/3 정규화…");
  const normalize = await runWorknetNormalizeFromRaw({ supabase, maxRows: 5000 });
  console.log(normalize);

  console.log("3/3 스냅샷…");
  const spotlight = await computeJobSpotlightSnapshots(supabase);
  console.log(spotlight);

  const { count, error } = await supabase
    .from("public_job_openings")
    .select("*", { count: "exact", head: true })
    .eq("is_open", true);

  if (error?.message?.includes("public_job_openings")) {
    console.error("\n테이블이 없습니다. supabase migration 139 를 먼저 적용하세요.");
    process.exit(1);
  }

  console.log(`\n공개 공고(청소 필터): ${count ?? 0}건`);
  console.log("완료 → http://localhost:3001/jobs/public");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
