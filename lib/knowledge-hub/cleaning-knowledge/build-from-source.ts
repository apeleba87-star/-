/**
 * 문서 근거 knowledge DB 빌더.
 * source/*.parsed.json + 원문에서 추출한 Rule만 사용. 임의 레시피/문장 금지.
 */
import type {
  CleaningKnowledgeDb,
  KnowledgeCaseEvidence,
  KnowledgeContaminant,
  KnowledgeMaterial,
  KnowledgeProduct,
  KnowledgeRecipe,
  KnowledgeRule,
  PHType,
  SourceRef,
} from "@/lib/knowledge-hub/cleaning-knowledge/types";
import productsJson from "@/lib/knowledge-hub/cleaning-knowledge/source/products.parsed.json";
import { normalizeDilutionLabel } from "@/lib/knowledge-hub/dilution-label";
import casesJson from "@/lib/knowledge-hub/cleaning-knowledge/source/cases.parsed.json";
import productProceduresJson from "@/lib/knowledge-hub/cleaning-knowledge/source/product-procedures.parsed.json";

type ParsedProduct = {
  id: string;
  brand: string;
  name: string;
  aliases?: string[];
  summary?: string | null;
  phApprox?: string | null;
  phType?: string;
  dilutions?: string[];
  standardDilution?: string | null;
  strongDilution?: string | null;
  packSizes?: string[];
  mainUse?: string[];
  placeHints?: string[];
  materialsRaw?: string[];
  contaminantsRaw?: string[];
  forbiddenRaw?: string[];
  compatibleMaterialIds?: string[];
  contaminantIds?: string[];
  forbiddenMaterialIds?: string[];
  warnings?: string[];
  sourceRefs?: { doc: string; caseId?: string; note?: string }[];
  status?: string;
};

type ParsedCase = {
  id: string;
  name: string;
  categoryMajor: string;
  categoryMid?: string;
  categoryMinor?: string;
  facility?: string | null;
  area?: string | null;
  materialRaw?: string | null;
  contaminantRaw?: string | null;
  productNames: string[];
  productIds: string[];
  dilution?: string | null;
  dwell?: string | null;
  tools?: string[];
  result?: string | null;
  evidenceLevel: string;
  steps?: { order?: string; stage: string; content?: string }[];
  warnings?: string[];
  materialIds?: string[];
  contaminantIds?: string[];
  sourceRefs: { doc: string; caseId?: string; note?: string }[];
};

const SRC_KIEHL = { title: "독일 키엘 세제 리스트업", note: "사용자 제공 문서" };
const SRC_CASES = { title: "청소 사례 데이터", note: "사용자 제공 문서" };
const SRC_KNOWLEDGE = { title: "청소 지식 원문", author: "찰리브라운", note: "카페 원문에서 원칙만 추출" };

const BASE_MATERIALS: KnowledgeMaterial[] = [
  { id: "porcelain", name: "도기·자기(변기·세면대)", riskLevel: "low", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "ceramic-tile", name: "타일(자기·포세린)", riskLevel: "low", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "grout", name: "줄눈·석회질", riskLevel: "medium", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "stainless", name: "스테인레스", riskLevel: "medium", notes: "결 방향 따라 작업. 거친 수세미·스크래퍼 주의. 코팅·등급별 사전 테스트. 식품 접촉면은 충분히 헹굼.", sourceRefs: [{ doc: "kiehl-list", note: "비녹신·그라셋 등 금속 표면" }, { doc: "manual", note: "그라셋 표면 청소 요령" }] },
  { id: "chrome-faucet", name: "크롬·수전", riskLevel: "medium", sourceRefs: [{ doc: "kiehl-list" }] },
  {
    id: "marble",
    name: "대리석·라임스톤",
    riskLevel: "very_high",
    notes: "산성·강한 알칼리에 취약",
    sourceRefs: [{ doc: "cleaning-knowledge" }, { doc: "kiehl-list" }],
  },
  { id: "granite", name: "화강석", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "epoxy-floor", name: "에폭시 코팅 바닥", riskLevel: "medium", notes: "습식 후 마른 밀대 마무리. 넓은 식품공장 바닥은 배수·분산·헹굼을 고려.", sourceRefs: [{ doc: "kiehl-list" }, { doc: "manual", note: "그라셋 바닥 청소 요령" }] },
  { id: "laminate-wood", name: "강마루·강화마루·목재", riskLevel: "medium", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "silicone", name: "실리콘(줄·창틀)", riskLevel: "high", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "glass", name: "유리", riskLevel: "low", notes: "원액형은 분무 후 마른 천으로 바로. 희석형은 스퀴지·마른 천 마무리. 거친 수세미 주의.", sourceRefs: [{ doc: "kiehl-list" }, { doc: "manual", note: "글라스퀸·토네이도 유리 청소 요령" }] },
  { id: "pvc-deco", name: "데코타일·리놀륨·합성수지", riskLevel: "low", aliases: ["데코타일"], notes: "일상 세정 후 마른 밀대(사각맙)로 마무리하면 자국이 적다.", sourceRefs: [{ doc: "kiehl-list" }, { doc: "manual", note: "토네이도 바닥 청소 요령" }] },
  {
    id: "aluminum",
    name: "알루미늄",
    riskLevel: "high",
    notes: "강알칼리 시 변색",
    sourceRefs: [{ doc: "cleaning-knowledge" }],
  },
  { id: "brass-bronze", name: "청동·황동", riskLevel: "high", notes: "산성 주의", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "concrete", name: "콘크리트·시멘트", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "exterior-wall", name: "외벽·베란다 콘크리트 면", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-cases" }] },
  { id: "enamel", name: "에나멜(욕조)", riskLevel: "high", notes: "산성 취약", sourceRefs: [{ doc: "cleaning-knowledge" }, { doc: "kiehl-list" }] },
  { id: "leather", name: "가죽", riskLevel: "high", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-LEATHER-001" }, { doc: "kiehl-list" }] },
  { id: "carpet", name: "카펫·섬유", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-RIVAS-001" }, { doc: "kiehl-list" }] },
  { id: "painted-wall", name: "도장·페인트 벽면", riskLevel: "high", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-STICKER-001" }] },
  { id: "plastic", name: "플라스틱(PVC·PP·PE·아크릴)", riskLevel: "medium", notes: "ABS·용제 민감 재질은 사전 테스트", sourceRefs: [{ doc: "kiehl-list" }] },
];

const BASE_CONTAMINANTS: KnowledgeContaminant[] = [
  { id: "limescale", name: "요석·석회·백화", type: "inorganic", phDirection: "alkaline", notes: "요석이 명시된 석회질. 석회·백화만이면 lime-deposit", sourceRefs: [{ doc: "kiehl-list" }, { doc: "cleaning-knowledge" }] },
  { id: "lime-deposit", name: "석회·백화", type: "inorganic", phDirection: "alkaline", notes: "요석 없이 석회·백화만 문서에 있을 때. 「물때」만이면 water-spot", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "water-spot", name: "물때", type: "inorganic", notes: "유리·수전 등의 물 자국. 요석·석회와 별도 표기", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "soap-scum", name: "비누찌꺼기", type: "mixed", notes: "욕실 비누때·비누막", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "grease", name: "기름때·유기 오염", type: "organic", phDirection: "acidic", sourceRefs: [{ doc: "kiehl-list" }, { doc: "cleaning-knowledge" }] },
  { id: "mold", name: "곰팡이", type: "microbial", notes: "락스 표백과 근절은 별개", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "rust", name: "녹", type: "inorganic", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "burnt-residue", name: "탄찌·그을음", type: "organic", sourceRefs: [{ doc: "cleaning-cases" }] },
  { id: "stain-discoloration", name: "찌든 때·변색·오점", type: "mixed", sourceRefs: [{ doc: "cleaning-cases" }] },
  { id: "cement-residue", name: "백시멘트·시공 잔재", type: "inorganic", sourceRefs: [{ doc: "kiehl-list" }, { doc: "cleaning-cases" }] },
  { id: "construction-dust", name: "공사 먼지·분진", type: "inorganic", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "nicotine", name: "담배·니코틴 찌꺼기", type: "organic", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "adhesive", name: "스티커·접착 잔유물", type: "surface_damage", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-STICKER-001" }] },
  { id: "paint-residue", name: "페인트 잔유물", type: "surface_damage", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-PAINT-001" }] },
  { id: "odor", name: "악취", type: "organic", notes: "표면·배수·트랩 기인. 향으로만 덮지 않음", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "dust", name: "먼지", type: "inorganic", notes: "천장·환풍기·공사 분진과 구분: construction-dust", sourceRefs: [{ doc: "cleaning-knowledge" }] },
];

const SOURCE_RULES: KnowledgeRule[] = [
  {
    id: "rule-material-contaminant-first",
    title: "장소가 아니라 재질×오염으로 선택",
    body: "화장실·주방 등 장소 라벨보다 세정할 재질과 오염원을 기준으로 제품을 판단한다.",
    severity: "warning",
    confidence: "high",
    sources: [SRC_KNOWLEDGE],
    sourceRefs: [{ doc: "cleaning-knowledge", note: "산성 세정제 이야기" }],
  },
  {
    id: "rule-pretest",
    title: "눈에 띄지 않는 곳 사전 테스트",
    body: "확신이 없으면 구석 등 잘 안 보이는 부위에 살짝 테스트한 뒤 본 작업을 한다. 키엘사도 권장.",
    severity: "warning",
    confidence: "high",
    sources: [SRC_KNOWLEDGE],
    sourceRefs: [{ doc: "cleaning-knowledge", note: "알칼리성 세제 이야기" }],
  },
  {
    id: "rule-no-mix-bleach-acid",
    title: "락스와 산성 세제 혼합 금지",
    body: "락스(치아염소산나트륨)와 산성 세제를 섞으면 유독 가스가 발생한다. 절대 혼합하지 않는다.",
    severity: "critical",
    confidence: "high",
    sources: [SRC_KNOWLEDGE, SRC_CASES],
    sourceRefs: [
      { doc: "cleaning-knowledge" },
      { doc: "cleaning-cases", caseId: "SAFETY-BLEACH-MIXING-001" },
    ],
  },
  {
    id: "rule-acid-vs-alkaline",
    title: "무기물·석회는 산성, 기름때는 알칼리성",
    body: "석회·백화·시멘트 잔여물은 산성, 기름때·눅은 때는 알칼리성으로 접근하는 것이 기본 컨셉이다.",
    severity: "info",
    confidence: "high",
    sources: [SRC_KNOWLEDGE],
    sourceRefs: [{ doc: "cleaning-knowledge" }],
  },
  {
    id: "rule-aluminum-alkaline",
    title: "알루미늄에 강알칼리 주의",
    body: "알루미늄은 알칼리성 세제에 검게 변색될 수 있다.",
    severity: "critical",
    confidence: "high",
    sources: [SRC_KNOWLEDGE],
    sourceRefs: [{ doc: "cleaning-knowledge" }],
  },
  {
    id: "rule-marble-acid",
    title: "대리석·라임스톤에 산성 금지",
    body: "대리석·라임스톤 등 방해석 재질에는 산성 세제를 쓰지 않는다.",
    severity: "critical",
    confidence: "high",
    sources: [SRC_KNOWLEDGE],
    sourceRefs: [{ doc: "cleaning-knowledge" }],
  },
  {
    id: "rule-bleach-not-mold-root",
    title: "락스는 곰팡이 표백일 뿐 근절이 아님",
    body: "락스는 곰팡이를 하얗게 보이게 할 뿐 근본 제거가 아니며, 시간이 지나면 다시 필 수 있다.",
    severity: "warning",
    confidence: "high",
    sources: [SRC_KNOWLEDGE],
    sourceRefs: [{ doc: "cleaning-knowledge" }],
  },
];

function guidePathsForCase(c: ParsedCase): string[] {
  const hay = `${c.name} ${c.categoryMajor} ${c.facility ?? ""} ${c.area ?? ""} ${c.materialRaw ?? ""} ${c.contaminantRaw ?? ""}`;
  const paths: string[] = [];
  if (/입주/.test(hay)) paths.push("/services/move-in/overview", "/services/move-in/dust");
  if (/화장실|욕실|샤워/.test(hay)) paths.push("/services/office-regular/restroom", "/services/move-in/bathroom");
  if (/주방|기름/.test(hay)) paths.push("/services/commercial-regular/kitchen", "/guides/oil-stainless");
  if (/유리|물때|샤워부스/.test(hay)) paths.push("/guides/water-glass");
  if (/바닥|계단/.test(hay)) paths.push("/services/stairs-regular/overview", "/services/office-regular/floor");
  if (/카페트|카펫/.test(hay)) paths.push("/guides/carpet-stain");
  if (/석회|시멘트|건축/.test(hay)) paths.push("/services/renovation/overview", "/services/move-in/dust");
  if (/곰팡이|줄눈|옥시칼/.test(hay)) paths.push("/guides/mold-tile");
  if (/사무실|엘리베이터/.test(hay)) paths.push("/services/office-regular/overview", "/services/building-regular/elevator");
  if (/스티커|테이프|접착/.test(hay)) paths.push("/services/move-in/tape");
  return [...new Set(paths)];
}

function uniqueStrings(arr: string[]): string[] {
  return [...new Set(arr.map((s) => s.trim()).filter(Boolean))];
}

/** 문서 원문 오염 문구 → ID. 「물때」만 있으면 water-spot. 석회·백화만이면 lime-deposit (요석으로 확대 금지) */
function contaminantIdsFromRaw(raw: string[]): string[] {
  const ids: string[] = [];
  for (const t of raw) {
    const s = t.trim();
    if (!s) continue;
    if (/요석/.test(s)) ids.push("limescale");
    else if (/석회|백화/.test(s)) ids.push("lime-deposit");
    else if (/물때|경수/.test(s)) ids.push("water-spot");
    else if (/비누/.test(s)) ids.push("soap-scum");
    else if (/기름|유분|구리스|눅은/.test(s)) ids.push("grease");
    else if (/곰팡이/.test(s)) ids.push("mold");
    else if (/녹|철분/.test(s)) ids.push("rust");
    else if (/탄때|탄찌|그을음|탄 찌/.test(s)) ids.push("burnt-residue");
    else if (/스티커|접착|목공풀|테이프|라벨/.test(s)) ids.push("adhesive");
    else if (/페인트|니스|왁스|타르|껌|레진|본드|수액/.test(s)) ids.push("paint-residue");
    else if (/매직|마커|볼펜|사인펜|네임펜|연필|크레파스|펜 자국|잉크/.test(s)) ids.push("stain-discoloration");
    else if (/찌든|변색|흑변|묵은|오점|잡티|얼룩|손때/.test(s)) ids.push("stain-discoloration");
    else if (/시멘트|백시멘트/.test(s)) ids.push("cement-residue");
    else if (/먼지|분진/.test(s)) ids.push("construction-dust");
    else if (/니코틴|담배/.test(s)) ids.push("nicotine");
    else if (/염분|해풍/.test(s)) ids.push("water-spot");
  }
  return uniqueStrings(ids);
}

/** 리스트업 파서가 특징·마케팅 문구를 오염 배열에 섞은 경우 제외 */
function filterContaminantPhrases(raw: string[]): string[] {
  return uniqueStrings(raw).filter((s) => {
    if (/^\(※/.test(s)) return true; // 사용 팁 원문 유지
    if (/제거 우수|부착 감소|보호 효과|광택 효과|거품이|희석 사용|인증|무향|무염|비산성|약알칼리|중성|CLP|위험물|특징/.test(s)) {
      return false;
    }
    if (contaminantIdsFromRaw([s]).length) return true;
    return /오염|때|먼지|얼룩|찌든|잔유|잔여|녹|곰팡이|니코틴|페인트|시멘트|백화|석회|요석|비누|기름|탄|염분|해풍|잡티|지문|생활|매직|마커|펜|풀|테이프|자국|철분/.test(
      s
    );
  });
}

/** 문서 원문 재질 문구 → ID (문서에 적힌 표현만) */
function materialIdsFromRaw(raw: string[]): string[] {
  const ids: string[] = [];
  for (const t of raw) {
    const s = t.trim();
    if (!s) continue;
    if (/대리석|라임스톤|라임석|쥐라/.test(s)) ids.push("marble");
    else if (/화강/.test(s)) ids.push("granite");
    else if (/도기\s*타일|자기\s*타일/.test(s)) ids.push("ceramic-tile");
    else if (/도기|변기|세면대|소변기|위생도기/.test(s)) ids.push("porcelain");
    else if (/타일|세라믹|포세린|코토|클링커|테라조|도자기/.test(s)) ids.push("ceramic-tile");
    else if (/줄눈/.test(s)) ids.push("grout");
    else if (/유리|거울|샤워부스|유리세라믹|인덕션/.test(s)) ids.push("glass");
    else if (/스테인리스|스테인레스/.test(s)) ids.push("stainless");
    else if (/크롬|수전|수도꼭지/.test(s)) ids.push("chrome-faucet");
    else if (/에나멜/.test(s)) ids.push("enamel");
    else if (/알루미늄/.test(s)) ids.push("aluminum");
    else if (/황동|청동|구리|브라스/.test(s)) ids.push("brass-bronze");
    else if (/목재|마루|파케|강화마루|강마루|라미네이트|합판|쪽마루/.test(s)) ids.push("laminate-wood");
    // 데코·리놀·PVC 바닥만 — 단독 「PVC」「합성수지」「비닐」은 창틀·기타와 혼동되어 제외
    else if (/리놀륨|데코타일|PVC\s*계?\s*데코|PVC\s*바닥|비닐\s*바닥|탄성\s*바닥/.test(s)) ids.push("pvc-deco");
    else if (/플라스틱|PP|PE|아크릴|ABS|PVC\s*창/.test(s)) ids.push("plastic");
    else if (/가죽/.test(s)) ids.push("leather");
    // 「섬유」단독은 카펫·직물 외 일반 금지 문구와 혼동 → 구체 표현만
    else if (/카페트|카펫|어닝|텐트|직물|타일카펫|패브릭|합성섬유/.test(s)) ids.push("carpet");
    else if (/콘크리트|시멘트(?!\s*잔)/.test(s)) ids.push("concrete");
    else if (/도장|페인트\s*벽|벽면/.test(s) && /도장|페인트/.test(s)) ids.push("painted-wall");
    else if (/에폭시/.test(s)) ids.push("epoxy-floor");
    else if (/실리콘/.test(s)) ids.push("silicone");
    else if (/외벽|베란다/.test(s)) ids.push("exterior-wall");
  }
  return uniqueStrings(ids);
}

/**
 * 금지 문구 → ID. 허용 매핑보다 넓게 잡아 「합성수지」「섬유」 등 포괄 금지도 반영.
 * 조건부 금지(코팅·손상·민감 등)는 전면 금지 ID로 올리지 않음.
 */
function isConditionalForbidPhrase(s: string): boolean {
  return /코팅|손상|민감|보호필름|새\s|함침|변색\s*우려|시험되지|확인\s*할\s*수\s*없는|사전\s*테스트|일부/.test(
    s
  );
}

function forbiddenMaterialIdsFromRaw(raw: string[], opts?: { includeConditional?: boolean }): string[] {
  const includeConditional = opts?.includeConditional ?? false;
  const ids: string[] = [];
  for (const t of raw) {
    const s = t.trim();
    if (!s) continue;
    if (!includeConditional && isConditionalForbidPhrase(s)) continue;

    ids.push(...materialIdsFromRaw([s]));
    if (/리놀륨|데코타일|합성수지|비닐\s*바닥|PVC\s*바닥|탄성\s*바닥|PVC/.test(s)) {
      ids.push("pvc-deco");
    }
    if (/합성수지|플라스틱|아크릴|ABS/.test(s)) ids.push("plastic");
    if (/섬유|직물|카페트|카펫/.test(s)) ids.push("carpet");
    if (/크롬|수전/.test(s)) ids.push("chrome-faucet");
    if (/에나멜|욕조/.test(s)) ids.push("enamel");
    if (/스테인리스|스테인레스/.test(s)) ids.push("stainless");
    if (/대리석|라임스톤|라임석|방해석|천연석/.test(s)) ids.push("marble");
    if (/목재|마루|원목|라미네이트/.test(s)) ids.push("laminate-wood");
    if (/알루미늄/.test(s)) ids.push("aluminum");
    if (/황동|청동|구리/.test(s)) ids.push("brass-bronze");
    if (/유리|거울/.test(s)) ids.push("glass");
  }
  return uniqueStrings(ids);
}

/** 전면 금지(비조건부)만 — 재질 허브 목록 필터용 */
export function productHardForbidsMaterial(
  forbiddenRaw: string[] | undefined,
  materialId: string
): boolean {
  return forbiddenMaterialIdsFromRaw(forbiddenRaw ?? [], { includeConditional: false }).includes(
    materialId
  );
}

/** 리스트업 표에만 있고 상세 카드가 없는 제품 — 폴백 (재파싱 후 대개 비움) */
const LIST_TABLE_ENRICHMENT: Record<
  string,
  { summary: string; mainUse: string[]; contaminantsRaw: string[]; materialsRaw?: string[]; standardDilution?: string }
> = {};

function toProduct(p: ParsedProduct): KnowledgeProduct {
  const phType = (p.phType as PHType) || "unknown";
  const materialsRaw = uniqueStrings(p.materialsRaw ?? []);
  const contaminantsRaw = filterContaminantPhrases(p.contaminantsRaw ?? []);
  const forbiddenRaw = uniqueStrings(p.forbiddenRaw ?? []);
  const table = LIST_TABLE_ENRICHMENT[p.id];
  const mergedContaminantsRaw = contaminantsRaw.length
    ? contaminantsRaw
    : filterContaminantPhrases(table?.contaminantsRaw ?? []);
  const mergedMaterialsRaw = materialsRaw.length ? materialsRaw : table?.materialsRaw ?? [];
  const mappedContaminantIds = contaminantIdsFromRaw(mergedContaminantsRaw);
  const mappedMaterialIds = materialIdsFromRaw(mergedMaterialsRaw);
  /** 주의 노출용(조건부 금지 포함) */
  const mappedForbiddenIds = forbiddenMaterialIdsFromRaw(forbiddenRaw, { includeConditional: true });
  /** 호환 목록에서 뺄 때 — 조건부 금지는 전면 제외로 쓰지 않음 */
  const hardForbiddenIds = new Set(forbiddenMaterialIdsFromRaw(forbiddenRaw, { includeConditional: false }));
  const compatibleMaterialIds = (
    mappedMaterialIds.length ? mappedMaterialIds : p.compatibleMaterialIds ?? []
  ).filter((id) => !hardForbiddenIds.has(id));

  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    aliases: p.aliases,
    phType,
    phApprox: p.phApprox,
    summary: p.summary ?? table?.summary,
    mainUse: p.mainUse?.length ? p.mainUse : table?.mainUse ?? p.placeHints?.slice(0, 8) ?? [],
    compatibleMaterialIds,
    contaminantIds: mappedContaminantIds.length ? mappedContaminantIds : p.contaminantIds,
    forbiddenMaterialIds: mappedForbiddenIds.length ? mappedForbiddenIds : p.forbiddenMaterialIds,
    placeHints: p.placeHints,
    materialsRaw: mergedMaterialsRaw,
    contaminantsRaw: mergedContaminantsRaw,
    forbiddenRaw,
    standardDilution: normalizeDilutionLabel(p.standardDilution ?? table?.standardDilution),
    strongDilution: normalizeDilutionLabel(p.strongDilution) ?? undefined,
    packSizes: p.packSizes,
    warnings: p.warnings ?? [],
    confidence: p.status === "draft" && !table && !p.summary ? "medium" : p.status === "draft" ? "medium" : "high",
    status: table && p.status === "draft" ? "active" : ((p.status as KnowledgeProduct["status"]) ?? "active"),
    salesUrl: null,
    sources: p.sourceRefs?.some((s) => s.doc === "cleaning-cases") && !p.summary && !table ? [SRC_CASES] : [SRC_KIEHL],
    sourceRefs: (p.sourceRefs ?? []) as SourceRef[],
  };
}

function enrichProductsFromCases(products: KnowledgeProduct[], cases: ParsedCase[]): KnowledgeProduct[] {
  return products.map((p) => {
    const hasDetail = Boolean(p.summary || (p.contaminantsRaw?.length ?? 0) || (p.materialsRaw?.length ?? 0) || p.standardDilution);
    if (hasDetail) return p;
    const related = cases.filter((c) => c.productIds?.includes(p.id));
    if (!related.length) return p;
    const primary = related[0];
    const contRaw = uniqueStrings(related.map((c) => c.contaminantRaw).filter(Boolean) as string[]);
    const matRaw = uniqueStrings(related.map((c) => c.materialRaw).filter(Boolean) as string[]);
    return {
      ...p,
      summary: `사례 「${primary.name}」에서 사용된 제품입니다. 상세 스펙은 아직 수록되지 않았습니다.`,
      mainUse: uniqueStrings([primary.categoryMajor, primary.area].filter(Boolean) as string[]),
      contaminantsRaw: contRaw,
      materialsRaw: matRaw,
      contaminantIds: contaminantIdsFromRaw(contRaw),
      compatibleMaterialIds: materialIdsFromRaw(matRaw),
      standardDilution: normalizeDilutionLabel(
        primary.dilution && primary.dilution !== "미확인"
          ? `사례 기재: ${primary.dilution}`
          : p.standardDilution
      ),
      status: "draft",
      confidence: "medium",
      sources: [SRC_CASES],
    };
  });
}

function toCaseEvidence(c: ParsedCase): KnowledgeCaseEvidence {
  return {
    id: c.id,
    name: c.name,
    categoryMajor: c.categoryMajor,
    categoryMid: c.categoryMid,
    categoryMinor: c.categoryMinor,
    facility: c.facility ?? undefined,
    area: c.area ?? undefined,
    productNames: c.productNames,
    productIds: c.productIds?.length ? c.productIds : undefined,
    materialRaw: c.materialRaw ?? undefined,
    contaminantRaw: c.contaminantRaw ?? undefined,
    materialIds: c.materialIds?.length ? c.materialIds : undefined,
    contaminantIds: c.contaminantIds?.length ? c.contaminantIds : undefined,
    dilution: c.dilution && c.dilution !== "미확인" ? c.dilution : undefined,
    dwell: c.dwell ?? undefined,
    tools: c.tools?.length ? c.tools : undefined,
    steps: c.steps?.length
      ? c.steps.map((s) => ({
          order: s.order,
          stage: s.stage,
          content: s.content,
        }))
      : undefined,
    warnings: c.warnings?.length ? c.warnings : undefined,
    evidenceLevel: c.evidenceLevel as KnowledgeCaseEvidence["evidenceLevel"],
    result: c.result ?? undefined,
    sourceRefs: c.sourceRefs as SourceRef[],
  };
}

function slugify(parts: string[]) {
  return parts.join("-").replace(/[^a-z0-9-]+/gi, "-").toLowerCase().replace(/-+/g, "-").slice(0, 80);
}

/**
 * 파서가 놓친 재질·오염을 사례 원문 필드(materialRaw/contaminantRaw/area/name)로만 보강.
 * 임의 추정 금지 — 문서에 적힌 표현만 매핑.
 */
const CASE_LINK_OVERRIDES: Record<string, { materialId?: string; contaminantId?: string; note: string }> = {
  "CASE-TORNADO-001": {
    materialId: "glass",
    contaminantId: "grease",
    note: "사례 area「유리창…」, contaminant「기름때·니코틴」",
  },
  "CASE-DOPOMAT-001": {
    materialId: "granite",
    contaminantId: "grease",
    note: "사례 materialRaw「석재」, contaminant「식용기름」",
  },
  "CASE-AXONFORTE-002": {
    materialId: "stainless",
    contaminantId: "grease",
    note: "사례 area「후드 필터」, contaminant「기름때」",
  },
  "CASE-RIVAS-001": {
    materialId: "carpet",
    contaminantId: "stain-discoloration",
    note: "사례 materialRaw「카페트」, contaminant「오점」",
  },
  "CASE-GRASET-001": {
    materialId: "stainless",
    contaminantId: "grease",
    note: "사례 materialRaw「식품 가공기계」, contaminant「기름때」",
  },
  "CASE-DOPOMAT-INTENSO-001": {
    materialId: "stainless",
    contaminantId: "stain-discoloration",
    note: "사례 materialRaw「스테인리스」, contaminant「원인 불명 오염 자국」",
  },
};

function resolveCaseLinks(c: ParsedCase): { materialId?: string; contaminantId?: string } {
  const override = CASE_LINK_OVERRIDES[c.id];
  const fromRaw = c.contaminantRaw ? contaminantIdsFromRaw([c.contaminantRaw]) : [];
  return {
    materialId: c.materialIds?.[0] ?? override?.materialId,
    contaminantId: fromRaw[0] ?? c.contaminantIds?.[0] ?? override?.contaminantId,
  };
}

function recipesFromCases(cases: ParsedCase[]): KnowledgeRecipe[] {
  const recipes: KnowledgeRecipe[] = [];
  for (const raw of cases) {
    const c =
      raw.id === "CASE-CORVETT-001"
        ? {
            ...raw,
            productNames: ["키엘 코베트", "키엘 베리프롭"],
            productIds: ["kiehl-kobet", "kiehl-veryprop"],
          }
        : raw;
    if (c.evidenceLevel !== "field_case") continue;
    const productId = c.productIds?.[0];
    if (!productId) continue;
    const { materialId, contaminantId } = resolveCaseLinks(c);
    if (!materialId || !contaminantId) continue;

    const steps =
      (c.steps?.length ?? 0) > 0
        ? (c.steps ?? []).map((s) => (s.content ? `${s.stage}: ${s.content}` : s.stage)).filter(Boolean)
        : [];
    if (!steps.length) continue;

    const warnings = (c.warnings ?? []).filter((w) => w.length > 2 && !["위험대상", "위험내용"].includes(w));
    // warnings from case parser alternate risk target / content — keep pairs as "target: content" roughly
    const warnClean: string[] = [];
    for (let i = 0; i < warnings.length; i++) {
      const a = warnings[i];
      const b = warnings[i + 1];
      if (b && !/^(높음|중간|낮음)$/.test(a) && /^(높음|중간|낮음)$/.test(warnings[i + 2] ?? "")) {
        warnClean.push(`${a} — ${b} (${warnings[i + 2]})`);
        i += 2;
      } else if (!/^(높음|중간|낮음|예방방법)$/.test(a)) {
        warnClean.push(a);
      }
    }

    recipes.push({
      id: `recipe-from-${c.id.toLowerCase()}`,
      slug: slugify([materialId, contaminantId, productId.replace(/^kiehl-/, "")]),
      seoTitle: c.name,
      field: c.categoryMajor || c.area || "현장",
      materialId,
      contaminantId,
      productId,
      secondaryProductIds: c.productIds.slice(1),
      caseIds: [c.id],
      evidenceLevel: "field_case",
      dilution: c.dilution && c.dilution !== "미확인" ? c.dilution : "사례에 희석비 미기재 — 제품 스펙·샘플 테스트",
      dwellTime: c.dwell && c.dwell !== "미확인" ? c.dwell : "사례 기준 확인",
      tools: c.tools ?? [],
      steps,
      warnings: warnClean.slice(0, 8),
      summary: [c.name, c.result].filter(Boolean).join(". "),
      confidence: "high",
      guidePaths: guidePathsForCase(c),
      sources: [SRC_CASES],
      sourceRefs: c.sourceRefs as SourceRef[],
    });
  }
  return recipes;
}

type ParsedProcedure = {
  id: string;
  slug: string;
  seoTitle: string;
  field: string;
  materialId: string;
  contaminantId: string;
  productId: string;
  dilution: string;
  dwellTime: string;
  tools: string[];
  steps: string[];
  warnings: string[];
  summary: string;
  confidence: "high" | "medium" | "low";
  sourceRefs: SourceRef[];
};

/** 제품 사용법 문서에서 정리한 적용 사례(레시피). 사례 문서와 별도. */
function recipesFromProductProcedures(): KnowledgeRecipe[] {
  const SRC_PROC = { title: "제품 사용법 요약", note: "문서·판매처 사용법에서 필드만 추출" };
  return (productProceduresJson as ParsedProcedure[]).map((p) => ({
    id: p.id,
    slug: p.slug,
    seoTitle: p.seoTitle,
    field: p.field,
    materialId: p.materialId,
    contaminantId: p.contaminantId,
    productId: p.productId,
    evidenceLevel: "product_spec" as const,
    dilution: p.dilution,
    dwellTime: p.dwellTime,
    tools: p.tools,
    steps: p.steps,
    warnings: p.warnings,
    summary: p.summary,
    confidence: p.confidence,
    sources: [SRC_PROC],
    sourceRefs: p.sourceRefs,
  }));
}

/** 사례 레시피 + 제품 사용법 레시피. 동일 slug면 사용법(상세) 우선. */
function mergeRecipes(fromCases: KnowledgeRecipe[], fromProcedures: KnowledgeRecipe[]): KnowledgeRecipe[] {
  const map = new Map<string, KnowledgeRecipe>();
  for (const r of fromCases) map.set(r.slug, r);
  for (const r of fromProcedures) map.set(r.slug, r);
  return [...map.values()];
}

export function buildKnowledgeFromSourceDocs(): CleaningKnowledgeDb {
  const parsedCases = casesJson as ParsedCase[];
  let products = (productsJson as ParsedProduct[]).map(toProduct);
  products = enrichProductsFromCases(products, parsedCases);
  const cases = parsedCases.map(toCaseEvidence);
  const recipes = mergeRecipes(recipesFromCases(parsedCases), recipesFromProductProcedures());

  return {
    version: 3,
    updatedAt: new Date().toISOString().slice(0, 10),
    materials: BASE_MATERIALS,
    contaminants: BASE_CONTAMINANTS,
    products,
    facts: [], // 원문 분해 Fact는 rules로 우선; 임의 fact 생성 안 함
    recipes,
    qaCases: [],
    rules: SOURCE_RULES,
    cases,
  };
}

export const SOURCE_DOC_KNOWLEDGE: CleaningKnowledgeDb = buildKnowledgeFromSourceDocs();
