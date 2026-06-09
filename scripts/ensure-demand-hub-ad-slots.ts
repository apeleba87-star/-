/**
 * 입주레이더 home_ad_slots 반영 (마이그레이션 159·164와 동일)
 *   npx tsx scripts/ensure-demand-hub-ad-slots.ts
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
    key: "radar_pulse_below",
    name: "입주레이더 · 전국 펄스 아래 (지역 찾기 위)",
    slot_type: "direct" as const,
  },
  {
    key: "radar_empty_state",
    name: "입주레이더 · 지역 미선택 빈 화면",
    slot_type: "direct" as const,
  },
  {
    key: "radar_table_below",
    name: "입주레이더 · 지표 상세 표 아래 (로그인)",
    slot_type: "direct" as const,
  },
  {
    key: "radar_regional_fallback",
    name: "입주레이더 · 지역 광고 대체 (직거래 없을 때)",
    slot_type: "google" as const,
  },
];

async function main() {
  loadEnvFile(".env.local");
  const { createServiceSupabase } = await import("../lib/supabase-server");
  const sb = createServiceSupabase();

  for (const slot of SLOTS) {
    const { error } = await sb.from("home_ad_slots").upsert(
      {
        key: slot.key,
        name: slot.name,
        enabled: false,
        slot_type: slot.slot_type,
      },
      { onConflict: "key" }
    );
    if (error) {
      console.error(`${slot.key}: 실패 —`, error.message);
    } else {
      console.log(`${slot.key}: OK — ${slot.name}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
