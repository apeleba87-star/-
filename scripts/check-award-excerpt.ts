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
  const doRefreshAll = process.argv.includes("--refresh-all");
  const ref = process.argv.find((a) => /^\d{4}-\d{2}-\d{2}$/.test(a)) ?? "2026-05-21";
  const doRefresh = doRefreshAll || process.argv.includes("--refresh");
  const { createServiceSupabase } = await import("../lib/supabase-server");
  const { heroMetricsFromAwardExcerpt, awardReportListHeroExcerpt } = await import(
    "../lib/news/parseReportCardHero"
  );
  const { computeAwardDailyCardHeadline } = await import("../lib/content/build-award-market-snapshot");
  const { refreshAwardReportDailyCard } = await import("../lib/content/award-market-report-job");
  const sb = createServiceSupabase();

  if (doRefreshAll) {
    const { data: posts } = await sb
      .from("posts")
      .select("source_ref")
      .eq("source_type", "award_market_intel")
      .not("published_at", "is", null);
    const keys = [
      ...new Set(
        (posts ?? [])
          .map((p) => p.source_ref)
          .filter((k): k is string => typeof k === "string" && /^\d{4}-\d{2}-\d{2}$/.test(k)),
      ),
    ];
    for (const k of keys) {
      const refreshed = await refreshAwardReportDailyCard(sb, k);
      console.log(k, refreshed.ok ? refreshed.card_headline : refreshed.error);
    }
    return;
  }

  if (doRefresh) {
    const refreshed = await refreshAwardReportDailyCard(sb, ref);
    console.log("refresh:", refreshed);
  }

  const { data: post } = await sb
    .from("posts")
    .select("id, excerpt, source_ref, report_snapshot")
    .eq("source_type", "award_market_intel")
    .eq("source_ref", ref)
    .maybeSingle();

  const since = new Date(`${ref}T15:00:00+09:00`);
  since.setDate(since.getDate() - 90);
  const { data: rows } = await sb
    .from("tender_award_summaries")
    .select("openg_dt,bid_rate_pct,prtcpt_cnum,industry_code,industry_name")
    .gte("openg_dt", since.toISOString());

  const inScope = (rows ?? []).filter(
    (r) =>
      typeof r.industry_code === "string" &&
      r.industry_code.trim().length > 0 &&
      (r.industry_name?.trim() ?? "") !== "기타"
  );
  const computed = computeAwardDailyCardHeadline(inScope, ref);
  const computedAll = computeAwardDailyCardHeadline(rows ?? [], ref);

  console.log("post excerpt:", post?.excerpt);
  console.log("snapshot card_headline:", (post?.report_snapshot as { card_headline?: string })?.card_headline);
  console.log("list hero source:", awardReportListHeroExcerpt(post ?? {}));
  console.log("hero from list source:", heroMetricsFromAwardExcerpt(awardReportListHeroExcerpt(post ?? {})));
  console.log("hero from excerpt:", heroMetricsFromAwardExcerpt(post?.excerpt));
  console.log("computed (inScope):", computed);
  console.log("computed (all rows):", computedAll);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
