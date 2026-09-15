/**
 * 1) 시드로 덮어쓴 profiles.display_name 복구 (auth metadata / 이메일)
 * 2) 기존 질문에 author_label 가상 닉네임 부여
 *
 * Usage: node scripts/restore-question-seed-nicks.mjs
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

const FAKE = [
  "현장팀장박씨",
  "정기청소김",
  "입주청소77",
  "사무실관리A",
  "상가청소달인",
  "화장실전문",
  "바닥세정팀",
  "유리닦이프로",
  "시설관리오",
  "빌딩미화반",
  "미화팀리더K",
  "현장실장이",
  "계약청소B",
  "로비관리자",
  "세면장케어",
  "키엘쓰는사장님",
  "학원청소담당",
  "병원미화팀",
  "공장청소반장",
  "인테리어마감",
  "주2회정기",
  "물때고민중",
  "희석비율문의",
  "산텍스사용자",
  "토네이도현장",
  "글라스퀸쓰임",
  "대리석주의",
  "입주팀매니저",
  "상가주간청소",
  "야간미화원",
  "청소연구소장", // 과거 시드명도 복구 대상
];

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  if (!k || k.startsWith("#")) continue;
  env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const fakeSet = new Set(FAKE);

function nickFromUser(u) {
  const meta = u.user_metadata || u.raw_user_meta_data || {};
  const fromMeta =
    meta.display_name || meta.name || meta.full_name || meta.nickname || null;
  if (fromMeta && String(fromMeta).trim() && !fakeSet.has(String(fromMeta).trim())) {
    return String(fromMeta).trim().slice(0, 40);
  }
  const email = u.email || "";
  const local = email.split("@")[0]?.trim();
  if (local) return local.slice(0, 40);
  return `회원${String(u.id).slice(0, 6)}`;
}

async function listAllUsers() {
  const out = [];
  let page = 1;
  for (;;) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const batch = data?.users ?? [];
    out.push(...batch);
    if (batch.length < 200) break;
    page += 1;
    if (page > 50) break;
  }
  return out;
}

async function main() {
  const users = await listAllUsers();
  const byId = new Map(users.map((u) => [u.id, u]));
  console.log("auth users:", users.length);

  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id, display_name, email")
    .in("display_name", FAKE);

  if (pErr) {
    console.error("profiles:", pErr.message);
    process.exit(1);
  }

  console.log("fake nick profiles:", profiles?.length ?? 0);
  for (const p of profiles ?? []) {
    const u = byId.get(p.id);
    if (!u) {
      console.warn("no auth user for", p.id, p.display_name);
      continue;
    }
    const restored = nickFromUser(u);
    // unique collision: append short id
    let candidate = restored;
    const { error: uErr } = await sb
      .from("profiles")
      .update({ display_name: candidate })
      .eq("id", p.id);
    if (uErr?.message?.includes("unique") || uErr?.code === "23505") {
      candidate = `${restored}_${String(p.id).slice(0, 4)}`;
      const retry = await sb
        .from("profiles")
        .update({ display_name: candidate })
        .eq("id", p.id);
      if (retry.error) {
        console.error("restore fail", p.id, retry.error.message);
        continue;
      }
    } else if (uErr) {
      console.error("restore fail", p.id, uErr.message);
      continue;
    }
    console.log("restored", p.display_name, "→", candidate);
  }

  const { data: qs, error: qErr } = await sb
    .from("questions")
    .select("id, title, author_label")
    .order("id", { ascending: true });

  if (qErr) {
    console.error("questions:", qErr.message);
    process.exit(1);
  }

  let labeled = 0;
  for (let i = 0; i < (qs ?? []).length; i++) {
    const q = qs[i];
    const label = FAKE[i % (FAKE.length - 1)]; // 청소연구소장 제외 순환
    const { error } = await sb
      .from("questions")
      .update({ author_label: label })
      .eq("id", q.id);
    if (error) {
      console.error("label", q.id, error.message);
      continue;
    }
    labeled += 1;
    console.log("label", q.id, label);
  }

  console.log(`\ndone restored_profiles=${profiles?.length ?? 0} labeled=${labeled}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
