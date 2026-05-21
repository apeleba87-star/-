/**
 * 낙찰 요약에 연결된 tenders 업종 백필 + 미연결 tender_id 재매칭
 *   npx tsx scripts/backfill-award-tender-industries.ts
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
  const { runBackfillTenderIndustries } = await import("../lib/g2b/backfill-tender-industries");
  const { extractIndustryMatchesFromNoticeTitle } = await import("../lib/g2b/industry-from-raw");
  const { buildTenderOrdResolver } = await import("../lib/g2b/scsbid-award-summary");

  const supabase = createServiceSupabase();

  const { data: industryRows } = await supabase
    .from("industries")
    .select("code, name, aliases, group_key, sort_order")
    .eq("is_active", true);
  const industries = (industryRows ?? []).map((r) => ({
    code: r.code,
    name: r.name,
    aliases: r.aliases ?? undefined,
    group_key: r.group_key ?? undefined,
    sort_order: r.sort_order ?? 0,
  }));

  const { data: unlinked } = await supabase
    .from("tender_award_summaries")
    .select("id,bid_ntce_no,bid_ntce_ord")
    .is("tender_id", null);

  if (unlinked?.length) {
    const bidNos = [...new Set(unlinked.map((a) => a.bid_ntce_no).filter(Boolean))];
    const { data: tenderRows } = await supabase
      .from("tenders")
      .select("id,bid_ntce_no,bid_ntce_ord")
      .in("bid_ntce_no", bidNos);
    const resolve = buildTenderOrdResolver(
      (tenderRows ?? []) as { id: string; bid_ntce_no: string; bid_ntce_ord: string }[],
    );
    let relinked = 0;
    for (const row of unlinked) {
      const ordRaw = String(row.bid_ntce_ord ?? "00");
      const digits = ordRaw.replace(/\D/g, "") || "0";
      const v3 = digits.padStart(3, "0").slice(-3);
      const n = parseInt(v3, 10);
      const v2 = Number.isNaN(n) ? "00" : String(n).padStart(2, "0");
      const keys = [...new Set([ordRaw, digits, v3, v2, v3.slice(-2)])];
      const tenderId = resolve(row.bid_ntce_no, keys);
      if (!tenderId) continue;
      const { error } = await supabase
        .from("tender_award_summaries")
        .update({ tender_id: tenderId, updated_at: new Date().toISOString() })
        .eq("id", row.id);
      if (!error) relinked += 1;
    }
    console.log(`tender_id 재연결: ${relinked} / ${unlinked.length}`);
  }

  const { data: awards } = await supabase.from("tender_award_summaries").select("tender_id").not("tender_id", "is", null);
  const tenderIds = [...new Set((awards ?? []).map((a) => a.tender_id as string))];
  console.log(`업종 백필 대상 tenders: ${tenderIds.length}건`);

  const result = await runBackfillTenderIndustries(supabase, industries, {
    force: true,
    tenderIds,
    onProgress: (p) => console.log(p.message),
  });

  if (!result.ok) {
    console.error("백필 실패:", result.error);
    process.exit(1);
  }

  console.log(`raw 백필 — 처리 ${result.processed}건, 업종 매핑 ${result.updated}건`);

  const { data: awardRows } = await supabase
    .from("tender_award_summaries")
    .select("tender_id,bid_ntce_nm")
    .not("tender_id", "is", null);

  const titleByTender = new Map<string, string>();
  for (const row of awardRows ?? []) {
    const tid = row.tender_id as string;
    const title = String(row.bid_ntce_nm ?? "").trim();
    if (!title) continue;
    if (!titleByTender.has(tid)) titleByTender.set(tid, title);
  }

  const tenderIdList = [...titleByTender.keys()];
  let titleMapped = 0;
  const now = new Date().toISOString();

  for (let i = 0; i < tenderIdList.length; i += 50) {
    const chunk = tenderIdList.slice(i, i + 50);
    const { data: existingTi } = await supabase
      .from("tender_industries")
      .select("tender_id")
      .in("tender_id", chunk);
    const hasTi = new Set((existingTi ?? []).map((r) => r.tender_id));

    const insertRows: { tender_id: string; industry_code: string; match_source: string; raw_value: string }[] = [];
    const primaryUpdates: { id: string; code: string }[] = [];

    for (const tid of chunk) {
      if (hasTi.has(tid)) continue;
      const title = titleByTender.get(tid)!;
      const match = extractIndustryMatchesFromNoticeTitle(title, industries);
      if (!match.matches.length) continue;
      for (const m of match.matches) {
        insertRows.push({
          tender_id: tid,
          industry_code: m.code,
          match_source: m.match_source,
          raw_value: m.raw_value,
        });
      }
      primaryUpdates.push({ id: tid, code: match.matches[0]!.code });
    }

    if (insertRows.length) {
      await supabase.from("tender_industries").insert(insertRows);
    }
    for (const u of primaryUpdates) {
      await supabase
        .from("tenders")
        .update({
          primary_industry_code: u.code,
          industry_match_status: "text_estimated",
          industry_backfilled_at: now,
          updated_at: now,
        })
        .eq("id", u.id);
      titleMapped += 1;
    }
  }

  console.log(`공고명 키워드 백필 — 추가 매핑 ${titleMapped}건`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
