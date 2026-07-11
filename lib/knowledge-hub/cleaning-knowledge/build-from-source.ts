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
import casesJson from "@/lib/knowledge-hub/cleaning-knowledge/source/cases.parsed.json";

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
  { id: "stainless", name: "스테인레스", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "chrome-faucet", name: "크롬·수전", riskLevel: "medium", sourceRefs: [{ doc: "kiehl-list" }] },
  {
    id: "marble",
    name: "대리석·라임스톤",
    riskLevel: "very_high",
    notes: "산성·강한 알칼리에 취약 (원문·리스트업)",
    sourceRefs: [{ doc: "cleaning-knowledge" }, { doc: "kiehl-list" }],
  },
  { id: "granite", name: "화강석", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "epoxy-floor", name: "에폭시 코팅 바닥", riskLevel: "medium", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "laminate-wood", name: "강마루·강화마루·목재", riskLevel: "medium", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "silicone", name: "실리콘(줄·창틀)", riskLevel: "high", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "glass", name: "유리", riskLevel: "low", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "pvc-deco", name: "데코타일·리놀륨·합성수지", riskLevel: "low", aliases: ["데코타일"], sourceRefs: [{ doc: "kiehl-list" }] },
  {
    id: "aluminum",
    name: "알루미늄",
    riskLevel: "high",
    notes: "강알칼리 시 변색 (원문)",
    sourceRefs: [{ doc: "cleaning-knowledge" }],
  },
  { id: "brass-bronze", name: "청동·황동", riskLevel: "high", notes: "산성 주의 (원문)", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "concrete", name: "콘크리트·시멘트", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "exterior-wall", name: "외벽·베란다 콘크리트 면", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-cases" }] },
  { id: "enamel", name: "에나멜(욕조)", riskLevel: "high", notes: "산성 취약 (원문·리스트업)", sourceRefs: [{ doc: "cleaning-knowledge" }, { doc: "kiehl-list" }] },
  { id: "leather", name: "가죽", riskLevel: "high", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-LEATHER-001" }] },
  { id: "carpet", name: "카펫·섬유", riskLevel: "medium", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-RIVAS-001" }] },
  { id: "painted-wall", name: "도장·페인트 벽면", riskLevel: "high", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-STICKER-001" }] },
];

const BASE_CONTAMINANTS: KnowledgeContaminant[] = [
  { id: "limescale", name: "요석·석회·물때", type: "inorganic", phDirection: "alkaline", sourceRefs: [{ doc: "kiehl-list" }, { doc: "cleaning-knowledge" }] },
  { id: "soap-scum", name: "비누찌꺼기", type: "mixed", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "grease", name: "기름때·유기 오염", type: "organic", phDirection: "acidic", sourceRefs: [{ doc: "kiehl-list" }, { doc: "cleaning-knowledge" }] },
  { id: "mold", name: "곰팡이", type: "microbial", notes: "락스 표백과 근절은 별개 (원문)", sourceRefs: [{ doc: "cleaning-knowledge" }] },
  { id: "rust", name: "녹", type: "inorganic", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "burnt-residue", name: "탄찌·그을음", type: "organic", sourceRefs: [{ doc: "cleaning-cases" }] },
  { id: "stain-discoloration", name: "찌든 때·변색·오점", type: "mixed", sourceRefs: [{ doc: "cleaning-cases" }] },
  { id: "cement-residue", name: "백시멘트·시공 잔재", type: "inorganic", sourceRefs: [{ doc: "kiehl-list" }, { doc: "cleaning-cases" }] },
  { id: "construction-dust", name: "공사 먼지·분진", type: "inorganic", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "nicotine", name: "담배·니코틴 찌꺼기", type: "organic", sourceRefs: [{ doc: "kiehl-list" }] },
  { id: "adhesive", name: "스티커·접착 잔유물", type: "surface_damage", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-STICKER-001" }] },
  { id: "paint-residue", name: "페인트 잔유물", type: "surface_damage", sourceRefs: [{ doc: "cleaning-cases", caseId: "CASE-PAINT-001" }] },
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

function toProduct(p: ParsedProduct): KnowledgeProduct {
  const phType = (p.phType as PHType) || "unknown";
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    aliases: p.aliases,
    phType,
    phApprox: p.phApprox,
    summary: p.summary ?? undefined,
    mainUse: p.mainUse?.length ? p.mainUse : p.placeHints?.slice(0, 8) ?? [],
    compatibleMaterialIds: p.compatibleMaterialIds,
    contaminantIds: p.contaminantIds,
    forbiddenMaterialIds: p.forbiddenMaterialIds,
    placeHints: p.placeHints,
    standardDilution: p.standardDilution ?? undefined,
    strongDilution: p.strongDilution ?? undefined,
    packSizes: p.packSizes,
    warnings: p.warnings ?? [],
    confidence: p.status === "draft" ? "medium" : "high",
    status: (p.status as KnowledgeProduct["status"]) ?? "active",
    salesUrl: null,
    sources: p.sourceRefs?.some((s) => s.doc === "cleaning-cases") ? [SRC_CASES] : [SRC_KIEHL],
    sourceRefs: (p.sourceRefs ?? []) as SourceRef[],
  };
}

function toCaseEvidence(c: ParsedCase): KnowledgeCaseEvidence {
  return {
    id: c.id,
    name: c.name,
    categoryMajor: c.categoryMajor,
    categoryMid: c.categoryMid,
    categoryMinor: c.categoryMinor,
    productNames: c.productNames,
    materialRaw: c.materialRaw ?? undefined,
    contaminantRaw: c.contaminantRaw ?? undefined,
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
  return {
    materialId: c.materialIds?.[0] ?? override?.materialId,
    contaminantId: c.contaminantIds?.[0] ?? override?.contaminantId,
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

/** 제품 상세에 적힌 사용방법을 레시피로 올리지 않음 — 스펙만 제품에 둠.
 *  사례에서만 Recipe 생성. */

export function buildKnowledgeFromSourceDocs(): CleaningKnowledgeDb {
  const products = (productsJson as ParsedProduct[]).map(toProduct);
  const cases = (casesJson as ParsedCase[]).map(toCaseEvidence);
  const recipes = recipesFromCases(casesJson as ParsedCase[]);

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
