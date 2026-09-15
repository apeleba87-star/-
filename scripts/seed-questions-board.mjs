/**
 * 게시판 구색용 질문 시드 (~30)
 * - 2026-06 ~ 2026-09 날짜 분산
 * - 30~50대 문의 톤 (존댓말, 커뮤니티체 최소)
 * - 같은 고민 반복·변형, 수준 낮은 짧은 다수
 *
 * Usage:
 *   node scripts/seed-questions-board.mjs
 *   node scripts/seed-questions-board.mjs --reset
 */
import fs from "fs";
import { createClient } from "@supabase/supabase-js";

/** 전체 삭제 후 날짜순 id 재부여 */
const RESET = process.argv.includes("--reset");

/** 30~50대 현장·관리 톤의 가상 닉네임 (서로 다르게) */
const FAKE_MEMBER_LABELS = [
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
];

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  const k = line.slice(0, i).trim();
  if (!k || k.startsWith("#")) continue;
  env[k] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function slugify(value) {
  const base = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]+/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (base || "question").slice(0, 80);
}

/**
 * @typedef {{ title: string, body: string, at: string, views?: number, product?: string, contaminant?: string, material?: string, place?: string, answer?: { body: string, at: string, official?: boolean } }} SeedQ
 */

/** @type {SeedQ[]} */
const SEED = [
  // —— 사니칼 / 유리 물때 (반복 클러스터)
  {
    title: "사니칼 유리에 사용 문의",
    body: "샤워실 유리 물때 때문에요.\n사니칼 써도 되는지 궁금합니다.",
    at: "2026-06-03T09:42:00+09:00",
    views: 41,
    product: "kiehl-sanikal",
    contaminant: "limescale",
    material: "glass",
    place: "locker",
    answer: {
      body: "유리는 보통 가능합니다. 제품 안내 희석 비율을 지키시고, 실리콘·크롬에는 오래 두지 말고 바로 닦아내는 게 안전합니다. 대리석·천연석에는 사용하지 마세요.",
      at: "2026-06-03T14:10:00+09:00",
      official: true,
    },
  },
  {
    title: "사니칼로 물때 지워도 되는지요",
    body: "화장실 유리문 물때가 심합니다.\n사니칼 원액으로 해도 되나요 아니면 희석해야 하나요.",
    at: "2026-06-18T20:15:00+09:00",
    views: 28,
    product: "kiehl-sanikal",
    contaminant: "limescale",
    material: "glass",
  },
  {
    title: "산성세제 유리 물때",
    body: "키엘 사니칼 맞는지 모르겠는데 산성으로 유리 물때 제거한다 해서요.\n비율이 어떻게 되나요.",
    at: "2026-07-02T11:05:00+09:00",
    views: 19,
    product: "kiehl-sanikal",
    contaminant: "limescale",
  },
  {
    title: "샤워부스 물때 사니칼",
    body: "입주청소 하는데 샤워부스 유리 물때가 안 지워집니다.\n사니칼 추천 받아서 문의드립니다.",
    at: "2026-07-29T16:40:00+09:00",
    views: 33,
    product: "kiehl-sanikal",
    contaminant: "limescale",
    material: "glass",
    place: "locker",
    answer: {
      body: "희석해서 바르고 짧은 시간 둔 뒤 스퀴지로 밀어내는 방식이 일반적입니다. 원액은 제품 설명 확인 후 국소만 신중히 쓰세요.",
      at: "2026-07-30T09:20:00+09:00",
      official: false,
    },
  },
  {
    title: "사니칼 사용법 문의",
    body: "사니칼 사용법 알려주세요.",
    at: "2026-08-21T08:55:00+09:00",
    views: 12,
    product: "kiehl-sanikal",
  },

  // —— 산성 → 대리석/천연석 (반복 실수)
  {
    title: "사니칼 대리석에도 가능한가요",
    body: "화장실 바닥이 대리석인데 물때가 있어서요.\n사니칼 발라도 되는지 확인 부탁드립니다.",
    at: "2026-06-10T13:22:00+09:00",
    views: 56,
    product: "kiehl-sanikal",
    material: "marble",
    contaminant: "limescale",
    answer: {
      body: "대리석·천연석에는 산성 세제(사니칼 등)를 쓰지 않는 것이 안전합니다. 표면이 상할 수 있습니다. 중성 계열이나 석재용으로 문의해 주세요.",
      at: "2026-06-10T15:01:00+09:00",
      official: true,
    },
  },
  {
    title: "산성 세제 천연석 사용",
    body: "천연석 세면대인데 물때가 있습니다.\n산성 세제 써도 되는지요.",
    at: "2026-07-14T19:08:00+09:00",
    views: 22,
    contaminant: "limescale",
  },
  {
    title: "대리석 화장실 물때 어떻게 하나요",
    body: "사니칼은 안된다고 들어서요.\n그럼 뭐 써야 하나요.",
    at: "2026-08-05T10:30:00+09:00",
    views: 17,
    product: "kiehl-sanikal",
    material: "marble",
  },
  {
    title: "사니칼 타일에는 괜찮은지",
    body: "도기 타일 화장실입니다.\n사니칼 희석해서 써도 될까요.",
    at: "2026-09-02T21:12:00+09:00",
    views: 9,
    product: "kiehl-sanikal",
    material: "ceramic-tile",
  },

  // —— 글라스퀸 vs 글라스킹
  {
    title: "글라스퀸 글라스킹 차이",
    body: "사무실 유리 닦을건데 둘중 뭘 사야 하는지 모르겠습니다.",
    at: "2026-06-12T15:45:00+09:00",
    views: 47,
    product: "kiehl-glassqueen",
    place: "office",
    material: "glass",
    answer: {
      body: "일상 먼지·손때 위주면 글라스퀸, 물때·더 센 오염 쪽이면 글라스킹을 많이 봅니다. 현장 오염 종류 보시고 고르시면 됩니다.",
      at: "2026-06-12T17:20:00+09:00",
      official: true,
    },
  },
  {
    title: "유리세제 어떤거 쓰나요",
    body: "키엘 유리세제 종류가 여러개인것 같아서요.\n일반 사무실용으로 추천 부탁드립니다.",
    at: "2026-07-08T09:10:00+09:00",
    views: 25,
    product: "kiehl-glassqueen",
    place: "office",
  },
  {
    title: "글라스킹이랑 퀸 중에",
    body: "글라스킹이 더 센건가요?\n센게 좋은거 아닌가 해서요.",
    at: "2026-08-01T18:33:00+09:00",
    views: 31,
    product: "kiehl-glasking",
  },
  {
    title: "파티션 유리 청소 세제",
    body: "회사 파티션 유리입니다.\n글라스퀸이면 되나요.",
    at: "2026-09-05T12:00:00+09:00",
    views: 8,
    product: "kiehl-glassqueen",
    place: "office",
    material: "glass",
  },

  // —— 토네이도 / 희석 / 바닥
  {
    title: "토네이도 희석 비율 문의",
    body: "바닥세정기랑 같이 쓰려고 합니다.\n희석 비율 알려주세요.",
    at: "2026-06-20T07:50:00+09:00",
    views: 38,
    product: "kiehl-tornado",
    place: "shop",
    answer: {
      body: "일상은 제품표의 표준 희석, 오염이 심하면 안내된 강한 희석 구간을 참고하세요. 거품이 많으면 기계·배수에 부담될 수 있어 과하게 진하게 쓰지 않는 편이 좋습니다.",
      at: "2026-06-20T11:05:00+09:00",
      official: true,
    },
  },
  {
    title: "토네이도 비율이요",
    body: "토네이도 비율이요.",
    at: "2026-07-11T22:18:00+09:00",
    views: 14,
    product: "kiehl-tornado",
  },
  {
    title: "토네이도 원액으로 바닥",
    body: "때가 심해서 원액으로 문지르려고 합니다.\n괜찮나요.",
    at: "2026-08-09T14:27:00+09:00",
    views: 21,
    product: "kiehl-tornado",
    contaminant: "grease",
  },
  {
    title: "바닥세정기 세제 뭐쓰나요",
    body: "상가 로비 pvc 바닥입니다.\n키엘 토네이도 맞는지요.",
    at: "2026-08-28T10:02:00+09:00",
    views: 16,
    product: "kiehl-tornado",
    place: "shop",
  },
  {
    title: "토네이도 희석 다시 문의",
    body: "예전에 물어봤던것 같은데 기억이 안나서요.\n토네이도 일상청소 희석 다시 확인 부탁드립니다.",
    at: "2026-09-10T16:44:00+09:00",
    views: 6,
    product: "kiehl-tornado",
  },

  // —— 산텍스 / 변기
  {
    title: "산텍스 변기에 그대로 써도 되는지",
    body: "변기 안쪽 요석 때문에요.\n산텍스 원액으로 해도 되나요.",
    at: "2026-06-25T08:20:00+09:00",
    views: 29,
    product: "kiehl-santex",
    place: "restroom",
  },
  {
    title: "변기 세제 산텍스",
    body: "산텍스 사용법 문의드립니다.\n얼마나 두고 닦나요.",
    at: "2026-07-22T13:55:00+09:00",
    views: 18,
    product: "kiehl-santex",
    place: "restroom",
    answer: {
      body: "제품 안내의 접촉 시간을 지키시고, 주변 금속·줄눈에 튀면 바로 물로 닦아내는 게 좋습니다.",
      at: "2026-07-22T16:40:00+09:00",
      official: false,
    },
  },
  {
    title: "화장실 냄새 산텍스로 되나요",
    body: "냄새도 같이 잡히나요 아니면 다른 제품인가요.",
    at: "2026-09-01T09:33:00+09:00",
    views: 11,
    product: "kiehl-santex",
  },

  // —— 칼리넥스 / 기타 낮은 수준
  {
    title: "칼리넥스",
    body: "칼리넥스 어디에 쓰나요.",
    at: "2026-06-28T17:05:00+09:00",
    views: 20,
    product: "kiehl-kallinex",
  },
  {
    title: "칼리넥스 희석",
    body: "칼리넥스 희석해서 바닥 닦아도 되는지 문의합니다.",
    at: "2026-08-14T11:48:00+09:00",
    views: 13,
    product: "kiehl-kallinex",
  },

  // —— 그라셋 / 기름때
  {
    title: "주방 기름때 그라셋",
    body: "식당 주방 후드 기름때가 심합니다.\n그라셋 쓰면 되는지요.",
    at: "2026-07-05T06:40:00+09:00",
    views: 35,
    product: "kiehl-graset",
    contaminant: "grease",
    place: "kitchen",
  },
  {
    title: "기름때 세제 추천",
    body: "키엘중에 기름때용 뭐가 있나요.",
    at: "2026-08-18T19:22:00+09:00",
    views: 24,
    contaminant: "grease",
  },

  // —— 제네릭 / 빈약한 문의
  {
    title: "키엘 세제 문의",
    body: "입주청소 시작하려고 합니다.\n기본으로 뭐부터 구비하면 될까요.",
    at: "2026-06-07T12:30:00+09:00",
    views: 52,
  },
  {
    title: "희석비율 표 보는법",
    body: "제품에 1:100 이런식으로 나와있는데\n물 몇리터에 세제 얼마나 넣는지 잘 모르겠습니다.",
    at: "2026-07-19T15:16:00+09:00",
    views: 40,
    answer: {
      body: "1:100은 대략 물 1L에 원액 10ml 정도입니다. 제품마다 표기가 다를 수 있으니 해당 제품 라벨 기준을 우선하세요.",
      at: "2026-07-19T18:00:00+09:00",
      official: true,
    },
  },
  {
    title: "원액으로 쓰면 더 잘지워지나요",
    body: "희석보다 원액이 세니까 더 잘 지워지는거 아닌지요.\n현장마다 다르게 하던데 기준이 궁금합니다.",
    at: "2026-08-25T20:05:00+09:00",
    views: 27,
  },
  {
    title: "제품 구매처",
    body: "키엘 사니칼 어디서 사나요.\n온라인 가능한지요.",
    at: "2026-09-08T10:18:00+09:00",
    views: 15,
    product: "kiehl-sanikal",
  },
  {
    title: "정기청소 세제 구성",
    body: "사무실 주2회 정기청소 합니다.\n바닥이랑 화장실 위주로요.\n세제 구성 어떻게 잡으면 되는지 조언 부탁드립니다.",
    at: "2026-09-12T14:50:00+09:00",
    views: 7,
    place: "office",
  },
];

async function main() {
  const { data: profiles, error: pErr } = await sb
    .from("profiles")
    .select("id, display_name, role")
    .order("created_at", { ascending: true })
    .limit(12);

  if (pErr || !profiles?.length) {
    console.error("profiles 필요:", pErr?.message);
    process.exit(1);
  }

  const authors = profiles.map((p) => p.id);
  console.log(`authors: ${authors.length} (profiles.display_name 은 변경하지 않음)`);

  /** 날짜 오름차순 → id가 작을수록 오래된 글 */
  const ordered = [...SEED].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime(),
  );

  if (RESET) {
    console.log("RESET: deleting all questions…");
    const { error: delErr } = await sb.from("questions").delete().gte("id", 0);
    if (delErr) {
      console.error("delete failed:", delErr.message);
      process.exit(1);
    }
  }

  let inserted = 0;
  let skipped = 0;
  let answers = 0;
  let nextId = 1;

  if (!RESET) {
    const { data: maxRow } = await sb
      .from("questions")
      .select("id")
      .order("id", { ascending: false })
      .limit(1)
      .maybeSingle();
    nextId = Number(maxRow?.id ?? 0) + 1;
  }

  for (let i = 0; i < ordered.length; i++) {
    const s = ordered[i];
    const authorId = authors[i % authors.length];

    if (!RESET) {
      const { data: existing } = await sb
        .from("questions")
        .select("id")
        .eq("title", s.title)
        .maybeSingle();

      if (existing) {
        console.log("skip:", s.title);
        skipped += 1;
        continue;
      }
    }

    const slug = slugify(s.title);
    const assignedId = RESET ? i + 1 : nextId++;

    const label = FAKE_MEMBER_LABELS[i % FAKE_MEMBER_LABELS.length];
    const baseRow = {
      id: assignedId,
      author_id: authorId,
      title: s.title,
      body: s.body,
      slug,
      status: "published",
      created_at: s.at,
      updated_at: s.at,
    };

    /** author_label / view_count 컬럼이 아직 없을 수 있어 단계적으로 재시도 */
    const insertAttempts = [
      { ...baseRow, view_count: s.views ?? 0, author_label: label },
      { ...baseRow, view_count: s.views ?? 0 },
      { ...baseRow, author_label: label },
      baseRow,
    ];

    let q = null;
    let qErr = null;
    for (const row of insertAttempts) {
      const res = await sb.from("questions").insert(row).select("id, slug").single();
      q = res.data;
      qErr = res.error;
      if (!qErr && q) break;
      const msg = qErr?.message ?? "";
      const retryable =
        msg.includes("author_label") || msg.includes("view_count");
      if (!retryable) break;
    }

    if (qErr || !q) {
      console.error("fail:", s.title, qErr?.message);
      continue;
    }

    const questionId = Number(q.id);

    const entities = [];
    if (s.product) {
      entities.push({
        question_id: questionId,
        entity_type: "product",
        entity_id: s.product,
        is_primary: true,
      });
    }
    if (s.contaminant) {
      entities.push({
        question_id: questionId,
        entity_type: "contaminant",
        entity_id: s.contaminant,
        is_primary: false,
      });
    }
    if (s.material) {
      entities.push({
        question_id: questionId,
        entity_type: "material",
        entity_id: s.material,
        is_primary: false,
      });
    }
    if (s.place) {
      entities.push({
        question_id: questionId,
        entity_type: "place",
        entity_id: s.place,
        is_primary: false,
      });
    }
    if (entities.length) {
      const { error: lErr } = await sb.from("question_entity_links").insert(entities);
      if (lErr) console.error("links:", questionId, lErr.message);
    }

    if (s.answer) {
      const adminId =
        profiles.find((p) => p.role === "admin" || p.role === "editor")?.id ??
        authorId;
      const answerAuthor = s.answer.official
        ? adminId
        : authors[(i + 1) % authors.length];

      const { error: aErr } = await sb.from("question_answers").insert({
        question_id: questionId,
        author_id: answerAuthor,
        body: s.answer.body,
        is_official: Boolean(s.answer.official),
        status: "published",
        created_at: s.answer.at,
        updated_at: s.answer.at,
      });
      if (aErr) console.error("answer:", questionId, aErr.message);
      else answers += 1;
    }

    inserted += 1;
    console.log("ok:", questionId, s.at.slice(0, 10), s.title);
  }

  console.log(
    `\ndone reset=${RESET} inserted=${inserted} skipped=${skipped} answers=${answers} totalSeed=${SEED.length}`,
  );
  if (RESET) {
    console.log(
      "SQL로 시퀀스 맞추기: SELECT setval(pg_get_serial_sequence('public.questions','id'), (SELECT MAX(id) FROM public.questions));",
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
