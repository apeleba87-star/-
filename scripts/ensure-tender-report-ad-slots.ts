/**
 * 입찰 리포트 인라인 광고 슬롯 DB 반영 + 쿠팡 API 캐시 갱신
 *   npx tsx scripts/ensure-tender-report-ad-slots.ts
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

const SLOTS = [
  {
    key: "tender_report_budget_below",
    name: "입찰 리포트 · 예산 상위 공고 아래",
    coupang_config: {
      source: { type: "search" as const, keyword: "청소용품" },
      limit: 3,
      subId: "tender_report_budget_below",
      imageSize: "512x512",
    },
  },
  {
    key: "tender_report_premium_core_below",
    name: "입찰 리포트 · 프리미엄 당일 핵심 아래",
    coupang_config: {
      source: { type: "search" as const, keyword: "청소용품" },
      limit: 3,
      subId: "tender_report_premium_core_below",
      imageSize: "512x512",
    },
  },
];

async function main() {
  loadEnvFile(".env.local");
  const { createServiceSupabase } = await import("../lib/supabase-server");
  const { refreshCoupangAdSlot } = await import("../lib/coupang-partners/refresh");

  const sb = createServiceSupabase();

  for (const slot of SLOTS) {
    const { error } = await sb.from("home_ad_slots").upsert(
      {
        key: slot.key,
        name: slot.name,
        enabled: true,
        slot_type: "coupang_api",
        script_content: null,
        coupang_config: slot.coupang_config,
      },
      { onConflict: "key" }
    );
    if (error) {
      console.error(`슬롯 ${slot.key} 실패:`, error.message);
      continue;
    }
    const refresh = await refreshCoupangAdSlot(slot.key);
    console.log(
      `${slot.key}: OK · 상품 ${refresh.productCount ?? 0}건${refresh.error ? ` (${refresh.error})` : ""}`
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
