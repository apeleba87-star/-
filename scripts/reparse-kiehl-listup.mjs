/**
 * 독일 키엘 세제 리스트업.txt → products.parsed.json 전수 재파싱
 * 임의 추정 금지 — 문서 섹션 헤더 사이의 원문만 사용
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const SRC = path.join(ROOT, "tmp-docx-extract", "독일 키엘 세제 리스트업.txt");
const OUT = path.join(ROOT, "lib", "knowledge-hub", "cleaning-knowledge", "source", "products.parsed.json");
const CASES = path.join(ROOT, "lib", "knowledge-hub", "cleaning-knowledge", "source", "cases.parsed.json");

/** 기존 사례 ID와 호환 유지 (철자 변형 포함) */
const CATALOG = [
  { id: "kiehl-sanikal", names: ["사니칼", "Sanikal"], match: /사니칼\s*\(|^사니칼$/ },
  { id: "kiehl-kallinex", names: ["칼리넥스", "Calinex"], match: /칼리넥스\s*\(|^칼리넥스$/ },
  { id: "kiehl-glasking", names: ["글라스킹", "GlasKing"], match: /글라스킹\s*\(|^글라스킹$/ },
  { id: "kiehl-glassqueen", names: ["글라스퀸", "GlasQueen"], match: /글라스퀸\s*\(|^글라스퀸$/ },
  { id: "kiehl-tornado", names: ["토네이도", "Tornado"], match: /토네이도\s*\(|^토네이도$/ },
  { id: "kiehl-veryprop", names: ["베리프롭", "Veriprop"], match: /베리프롭\s*\(|^베리프롭$/ },
  { id: "kiehl-clarida-uni", names: ["클라리다 유니", "Clarida Uni"], match: /클라리다\s*유니|Clarida\s*Uni/i },
  { id: "kiehl-exonforte", names: ["엑손 포르테", "엑손포르테", "Xon Forte"], match: /엑손\s*포르테|Xon\s*forte/i },
  { id: "kiehl-kobet", names: ["코베트", "Corvett"], match: /^코베트|Corvett/i },
  { id: "kiehl-tablefit", names: ["테이블피트", "Tablefit"], match: /Tablefit|테이블피트/i },
  { id: "kiehl-parketto-clean", names: ["파케토 클린", "파케토클린", "Parketto clean"], match: /파케토\s*클린|Parketto\s*clean/i },
  { id: "kiehl-torvan", names: ["토르반", "Torvan"], match: /토르반|Torvan/i },
  { id: "kiehl-powerfix-gel", names: ["파워픽스 젤", "Powerfix Gel"], match: /파워픽스\s*젤|Powerfix/i },
  { id: "kiehl-santex", names: ["산텍스", "Santex"], match: /^산텍스$|산텍스,/ },
  { id: "kiehl-jet", names: ["제트", "Jet"], match: /^제트$|^제트\s*$|제트\(Jet\)|^제트,/ },
  { id: "kiehl-jet-active", names: ["제트 액티브", "Jet Active"], match: /제트\s*액티브|Jet\s*Active/i },
  { id: "kiehl-graset", names: ["그라셋", "Grasset"], match: /그라셋|Grasset/i },
  { id: "kiehl-vinoxin", names: ["비녹신", "Vinoxin"], match: /^비녹신|Vinoxin/i },
  { id: "kiehl-eloxa-prima", names: ["엘록사 프리마", "Eloxa Prima"], match: /엘록사\s*프리마|Eloxa\s*Prima/i },
  { id: "kiehl-ruginoff", names: ["루긴오프", "RuginOff"], match: /루긴오프|RuginOff/i },
  { id: "kiehl-econa", names: ["에코나", "Econa"], match: /에코나\s*콘젠|Econa/i },
  { id: "kiehl-avenis-foam", names: ["아베니스 폼", "아비니스 폼", "Avenis"], match: /아베니스\s*폼|아비니스\s*폼|Avenis/i },
  { id: "kiehl-carp-deta", names: ["카프데타", "Carp-Deta"], match: /카프데타|Carp-?Deta/i },
  { id: "kiehl-rivas", names: ["리바스", "Rivas"], match: /Rivas|리바스/i },
  { id: "kiehl-rivamat", names: ["리바마트", "Rivamat"], match: /Rivamat|리바마트/i },
  { id: "kiehl-orange-pro", names: ["오렌지프로", "Orange Pro"], match: /Orange\s*Pro|오렌지프로/i },
  { id: "kiehl-parketto-care", names: ["파케토 케어", "Parketto Care"], match: /Parketto\s*Care|파케토\s*케어/i },
  { id: "kiehl-presto", names: ["프레스토", "Presto"], match: /Presto|프레스토/i },
];

/** 사례만 있고 리스트업 상세 카드 없음 */
const CASE_ONLY = [
  { id: "kiehl-extrafit", name: "키엘 엑스트라피트", aliases: ["엑스트라피트", "Extrafit"] },
  { id: "kiehl-oxycal", name: "키엘 옥시칼", aliases: ["옥시칼", "Oxycal"] },
  { id: "kiehl-dopomat", name: "도포마트", aliases: ["도포마트", "Dopomat"] },
  { id: "kiehl-binoxin-eco", name: "비녹스에코", aliases: ["비녹스에코", "Binoxin Eco", "비녹스 에코"] },
];

const SECTION_STOP = new Set([
  "제품명",
  "제품 기본정보",
  "항목",
  "내용",
  "분류",
  "한줄 설명",
  "제품 설명",
  "주요 특징",
  "핵심 특징",
  "주요 용도",
  "핵심 추천 용도",
  "적용 재질",
  "적용 가능한 재질",
  "적용 대상",
  "사용 가능한 장소",
  "사용 가능 장소",
  "제거 가능한 오염",
  "비적용 대상",
  "비적용 또는 주의 대상",
  "비적용 권장",
  "사용 불가",
  "사용 금지 재질",
  "희석비",
  "추천 희석비",
  "추천 사용 방법",
  "사용 방법",
  "표준 사용량",
  "권장 장비",
  "작업 핵심 포인트",
  "함께 사용하면 좋은 제품",
  "성분",
  "pH",
  "안전정보",
  "안전정보(MSDS)",
  "사용상 주의사항",
  "응급조치",
  "보관",
  "인증",
  "인증 및 기타",
  "검색 태그",
  "검색 키워드",
  "장점",
  "단점",
  "특징",
  "냄새",
  "제조사",
  "제품 규격",
  "희석형태",
  "폼건 사용",
  "전문가용",
  "향",
  "상황",
  "추천 제품",
  "작업",
  "사용 전 확인이 필요한 표면",
  "제트와 제트 액티브의 차이",
]);

const MATERIAL_KEYWORDS = /타일|유리|거울|스테인리스|크롬|황동|알루미늄|에나멜|리놀륨|방수|도기|세라믹|포세린|플라스틱|PVC|가죽|목재|마루|카페트|섬유|석재|대리석|인조석|금속|화이트보드|책상|욕조|세면대|샤워|인덕션|싱크|냄비|프라이팬|도장|아크릴|PP|PE|철|구리|벽면|바닥|오븐|그릴|후드|환풍/;
const CONTAMINANT_KEYWORDS =
  /때|오염|석회|요석|백화|비누|기름|탄|녹|먼지|얼룩|찌든|묵은|물때|접착|스티커|매직|펜|마커|자국|페인트|시멘트|니코틴|곰팡이|소변|침전|잔유|잔여|풀|테이프|왁스|껌|타르|니스|레진|본드|수액|철분/;

function unique(arr) {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

function inferPhType(phApprox, text) {
  const hay = `${phApprox || ""} ${text || ""}`.toLowerCase();
  if (/강산|strong.?acid|약\s*ph\s*[01]\b|ph\s*[≈~약]*\s*[01](\.\d)?\b/.test(hay) || /원액 약 0\.|원액 약 1\b/.test(hay))
    return "strong_acid";
  if (/산성|acid|ph\s*[≈~약]*\s*[1-3]\b|약\s*ph\s*[1-3]\b/.test(hay)) return "acid";
  if (/강알칼리|strong.?alk|ph\s*[≈~약]*\s*1[3-4]|약\s*ph\s*1[3-4]/.test(hay)) return "strong_alkaline";
  if (/알칼리|alkaline|약알칼리|ph\s*[≈~약]*\s*(9|1[0-2])/.test(hay)) return "alkaline";
  if (/약알칼리|weak.?alk|ph\s*[≈~약]*\s*8|약\s*ph\s*8/.test(hay)) return "weak_alkaline";
  if (/중성|neutral|ph\s*[≈~약]*\s*7/.test(hay)) return "neutral";
  if (/산화|oxidiz|표백/.test(hay)) return "oxidizing";
  return "unknown";
}

function collectUntil(lines, startIdx, stopLabels = SECTION_STOP) {
  const out = [];
  for (let i = startIdx; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) {
      if (out.length) break;
      continue;
    }
    if (stopLabels.has(t)) break;
    // next product title heuristics
    if (i > startIdx && /^(Tablefit|Rivas|Rivamat|Orange Pro|Presto|Kiehl Parketto)/i.test(t)) break;
    out.push(t);
  }
  return out;
}

function findSection(lines, labels) {
  const set = Array.isArray(labels) ? labels : [labels];
  for (let i = 0; i < lines.length; i++) {
    if (set.includes(lines[i].trim())) return i;
  }
  return -1;
}

function sliceBody(lines, fromLabel, toLabels) {
  const start = findSection(lines, fromLabel);
  if (start < 0) return [];
  return collectUntil(lines, start + 1, new Set([...(toLabels || []), ...SECTION_STOP]));
}

function filterList(items, kind) {
  const re = kind === "material" ? MATERIAL_KEYWORDS : CONTAMINANT_KEYWORDS;
  return unique(items).filter((s) => {
    if (s.length > 60) return false;
    if (/^(욕실|주방|기타|금속|바닥|표면|금속 및|사용|작업|추천)/.test(s) && s.length < 8 && !re.test(s))
      return false;
    // keep category headers that are also materials
    if (kind === "material") return re.test(s) || /^(플라스틱|금속|가죽|목재|타일|유리)$/.test(s);
    if (/제거 우수|부착 감소|보호 효과|광택 효과|거품|희석 사용|인증|무향|무염|특징|약알칼리|중성|CLP|위험물|독일 제조|전문가용|경제|저사용|고농축|원액 사용|걸쭉/.test(s))
      return false;
    return re.test(s) || /일반 오염|생활오염|손때/.test(s);
  });
}

function extractDilutions(lines) {
  const dil = [];
  const idx = findSection(lines, ["희석비", "추천 희석비", "추천 사용 방법"]);
  const window = idx >= 0 ? lines.slice(idx, idx + 40) : lines;
  for (const raw of window) {
    const t = raw.trim();
    if (/1\s*:\s*\d+/.test(t) || /원액/.test(t)) {
      if (t.length < 80 && !/검색|태그|키워드/.test(t)) dil.push(t);
    }
  }
  // also scan for "일반 유리청소: 1:100" style in whole body
  for (const raw of lines) {
    const t = raw.trim();
    if (/^.+:\s*1\s*:\s*\d+/.test(t) && t.length < 60) dil.push(t);
  }
  return unique(dil).slice(0, 12);
}

/** 원액 전용 표기 → "원액 사용" 통일 */
function normalizeDilutionLabel(raw) {
  if (raw == null) return null;
  const t = String(raw).trim();
  if (!t) return null;
  if (/1\s*:\s*\d/.test(t)) return t;
  if (/또는\s*희석|희석\s*사용\s*가능|희석\s*가능/.test(t) && /원액/.test(t)) return t;
  if (
    t === "원액" ||
    t === "원액 사용" ||
    /희석하지\s*않|원액\s*그대로|원액형|원액을?\s*직접|반드시\s*원액|원액으로\s*사용/.test(t)
  ) {
    return "원액 사용";
  }
  if (/^원액/.test(t) && t.length <= 24 && !/[~～-]/.test(t)) return "원액 사용";
  return t;
}

function extractPh(lines) {
  const idx = findSection(lines, "pH");
  if (idx < 0) {
    const hit = lines.find((l) => /원액\s*약\s*[\d.]+/.test(l) && /pH|알칼리|산/.test(l));
    return hit ? hit.trim() : null;
  }
  const parts = collectUntil(lines, idx + 1).slice(0, 6);
  if (!parts.length) return null;
  return parts.join(" / ").replace(/\s+/g, " ").slice(0, 120);
}

function extractPackSizes(lines) {
  const packs = [];
  for (const l of lines) {
    const m = l.match(/\b(\d+(?:\.\d+)?\s*(?:ml|L|㎖))\b/gi);
    if (m) packs.push(...m.map((x) => x.replace(/\s+/g, "").replace("㎖", "ml")));
  }
  // common patterns "1L, 10L"
  for (const l of lines) {
    if (/제품규격|제품 규격|규격/.test(l)) continue;
    if (/^\d+L$|^\d+ml$/i.test(l.trim())) packs.push(l.trim());
  }
  return unique(packs).slice(0, 8);
}

function extractWarnings(lines) {
  const warns = [];
  for (const label of ["사용상 주의사항", "단점", "비적용 대상", "비적용 또는 주의 대상", "사용 금지 재질", "사용 불가"]) {
    const items = sliceBody(lines, label);
    for (const s of items) {
      if (s.length > 2 && s.length < 100) warns.push(s);
    }
  }
  const tip = lines.filter((l) => l.trim().startsWith("※")).map((l) => l.trim());
  return unique([...warns.slice(0, 12), ...tip.slice(0, 3)]);
}

function displayName(cat, bodyLines) {
  // Prefer "Name (English)" from first lines
  for (const l of bodyLines.slice(0, 8)) {
    const t = l.trim();
    if (/^[가-힣A-Za-z].{0,40}\([^)]+\)$/.test(t)) return t;
    if (/^[A-Za-z][A-Za-z0-9\s\-]+\([^)]+\)$/.test(t)) return t;
  }
  const ko = cat.names[0];
  const en = cat.names.find((n) => /[A-Za-z]/.test(n));
  return en ? `${ko}(${en})` : ko;
}

function parseStructuredCard(lines) {
  const nameIdx = findSection(lines, "제품명");
  const name = nameIdx >= 0 ? lines[nameIdx + 1]?.trim() : null;
  const summary =
    sliceBody(lines, "한줄 설명").join(" ") ||
    sliceBody(lines, "제품 설명").slice(0, 3).join(" ");
  const materialsRaw = filterList(
    [
      ...sliceBody(lines, "적용 재질"),
      ...sliceBody(lines, "적용 가능한 재질"),
      ...sliceBody(lines, "적용 대상"),
    ],
    "material"
  );
  const contaminantsRaw = filterList(sliceBody(lines, "제거 가능한 오염"), "contaminant");
  const forbiddenRaw = unique([
    ...sliceBody(lines, "사용 불가"),
    ...sliceBody(lines, "사용 금지 재질"),
    ...sliceBody(lines, "비적용 대상"),
  ]).filter((s) => s.length < 80);
  const placeHints = unique([
    ...sliceBody(lines, "주요 용도"),
    ...sliceBody(lines, "사용 가능 장소"),
    ...sliceBody(lines, "사용 가능한 장소"),
    ...sliceBody(lines, "핵심 추천 용도"),
  ]).filter((s) => s.length < 40).slice(0, 20);
  const dilutions = extractDilutions(lines);
  const phApprox = extractPh(lines);
  const packSizes = extractPackSizes(lines);
  const warnings = extractWarnings(lines);
  return {
    name,
    summary: summary || null,
    materialsRaw,
    contaminantsRaw,
    forbiddenRaw,
    placeHints,
    dilutions,
    standardDilution: normalizeDilutionLabel(dilutions[0] || null),
    strongDilution: normalizeDilutionLabel(
      dilutions.find((d) => /원액|1\s*:\s*[1-9]\b|1\s*:\s*1[0-9]\b/.test(d)) || null
    ),
    phApprox,
    packSizes,
    warnings,
    mainUse: placeHints.slice(0, 12),
  };
}

/**
 * 문서 감사로 확정한 상세 카드 시작 라인 (1-based → 0-based).
 * 자동 휴리스틱보다 우선 — 검색태그/교차언급에 오탐되지 않게 함.
 */
const CARD_STARTS_1BASED = [
  { id: "kiehl-sanikal", line: 67 },
  { id: "kiehl-kallinex", line: 412 },
  { id: "kiehl-glasking", line: 603 },
  { id: "kiehl-glassqueen", line: 777 },
  { id: "kiehl-tornado", line: 944 },
  { id: "kiehl-veryprop", line: 1141 },
  { id: "kiehl-clarida-uni", line: 1340 },
  { id: "kiehl-exonforte", line: 1542 },
  { id: "kiehl-kobet", line: 1777 },
  { id: "kiehl-tablefit", line: 1981 },
  { id: "kiehl-parketto-clean", line: 2175 },
  { id: "kiehl-torvan", line: 2476 },
  { id: "kiehl-powerfix-gel", line: 2866 },
  { id: "kiehl-santex", line: 3269 },
  { id: "kiehl-jet", line: 3673 },
  { id: "kiehl-jet-active", line: 4112 },
  { id: "kiehl-graset", line: 4581 },
  { id: "kiehl-vinoxin", line: 5123 },
  { id: "kiehl-eloxa-prima", line: 5624 },
  { id: "kiehl-ruginoff", line: 6058 },
  { id: "kiehl-econa", line: 6374 },
  { id: "kiehl-avenis-foam", line: 6628 },
  { id: "kiehl-carp-deta", line: 7027 },
  { id: "kiehl-rivas", line: 7289 },
  { id: "kiehl-rivamat", line: 7505 },
  { id: "kiehl-orange-pro", line: 7721 },
  { id: "kiehl-parketto-care", line: 7923 },
  { id: "kiehl-presto", line: 8086 },
];

function findProductBlocks(allLines) {
  const hits = CARD_STARTS_1BASED.map((c) => {
    const start = c.line - 1;
    const title = allLines[start]?.trim() || allLines[start + 1]?.trim() || c.id;
    return { id: c.id, start, title: title.slice(0, 60) };
  });
  return hits.map((h, idx) => ({
    ...h,
    end: idx + 1 < hits.length ? hits[idx + 1].start : allLines.length,
  }));
}

function buildProduct(cat, blockLines) {
  const parsed = parseStructuredCard(blockLines);
  const name = parsed.name || displayName(cat, blockLines);
  const aliases = unique([name, ...cat.names, name.replace(/[()]/g, " ").trim()]);
  const bodyText = blockLines.join("\n");
  const phApprox = parsed.phApprox;
  return {
    id: cat.id,
    brand: "Kiehl",
    name,
    aliases,
    summary: parsed.summary,
    phApprox,
    phType: inferPhType(phApprox, bodyText),
    dilutions: parsed.dilutions,
    standardDilution: parsed.standardDilution,
    strongDilution: parsed.strongDilution && parsed.strongDilution !== parsed.standardDilution ? parsed.strongDilution : null,
    packSizes: parsed.packSizes,
    mainUse: parsed.mainUse,
    placeHints: parsed.placeHints,
    materialsRaw: parsed.materialsRaw,
    contaminantsRaw: parsed.contaminantsRaw,
    forbiddenRaw: parsed.forbiddenRaw,
    compatibleMaterialIds: [],
    contaminantIds: [],
    forbiddenMaterialIds: [],
    warnings: parsed.warnings,
    sourceRefs: [{ doc: "kiehl-list", note: name }],
    status: "active",
  };
}

function caseOnlyStub(def, cases) {
  const related = cases.filter((c) => (c.productIds || []).includes(def.id));
  return {
    id: def.id,
    brand: "Kiehl",
    name: def.name,
    aliases: def.aliases,
    summary: null,
    phApprox: null,
    phType: "unknown",
    dilutions: [],
    standardDilution: null,
    strongDilution: null,
    packSizes: [],
    mainUse: [],
    placeHints: [],
    materialsRaw: [],
    contaminantsRaw: [],
    forbiddenRaw: [],
    compatibleMaterialIds: [],
    contaminantIds: [],
    forbiddenMaterialIds: [],
    warnings: [],
    sourceRefs: related[0]
      ? [{ doc: "cleaning-cases", caseId: related[0].id, note: "사례에서 언급된 제품 (리스트업 상세 카드 없음)" }]
      : [{ doc: "cleaning-cases", note: "사례에서 언급된 제품 (리스트업 상세 카드 없음)" }],
    status: "draft",
  };
}

function main() {
  const text = fs.readFileSync(SRC, "utf8");
  const lines = text.split(/\r?\n/);
  const cases = JSON.parse(fs.readFileSync(CASES, "utf8"));
  const blocks = findProductBlocks(lines);

  console.log("Found detail blocks:", blocks.length);
  for (const b of blocks) console.log(`  ${b.id}\tL${b.start + 1}-${b.end}\t${b.title}`);

  const byId = new Map();
  for (const b of blocks) {
    const cat = CATALOG.find((c) => c.id === b.id);
    const body = lines.slice(b.start, b.end);
    const product = buildProduct(cat, body);
    // Prefer richer block if duplicate
    const prev = byId.get(b.id);
    if (!prev || (product.summary?.length || 0) > (prev.summary?.length || 0)) {
      byId.set(b.id, product);
    }
  }

  const missing = CATALOG.filter((c) => !byId.has(c.id));
  if (missing.length) {
    console.warn("MISSING from parse:", missing.map((m) => m.id).join(", "));
  }

  // Order: catalog order, then case-only
  const products = [
    ...CATALOG.map((c) => byId.get(c.id)).filter(Boolean),
    ...CASE_ONLY.map((d) => caseOnlyStub(d, cases)),
  ];

  fs.writeFileSync(OUT, JSON.stringify(products, null, 2) + "\n", "utf8");
  console.log("\nWrote", products.length, "products →", path.relative(ROOT, OUT));
  for (const p of products) {
    console.log(
      [p.status, p.id, (p.summary || "").slice(0, 40), `mat=${p.materialsRaw.length}`, `cont=${p.contaminantsRaw.length}`].join("\t")
    );
  }
}

main();
