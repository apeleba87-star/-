/**
 * 키엘 지식 전체 내보내기 (다른 AI 입력용)
 * 사용: node scripts/export-kiehl-knowledge.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const SRC = path.join(ROOT, "lib/knowledge-hub/cleaning-knowledge/source");
const OUT = path.join(ROOT, "exports");

const products = JSON.parse(fs.readFileSync(path.join(SRC, "products.parsed.json"), "utf8"));
const procedures = JSON.parse(fs.readFileSync(path.join(SRC, "product-procedures.parsed.json"), "utf8"));
const cases = JSON.parse(fs.readFileSync(path.join(SRC, "cases.parsed.json"), "utf8"));

const isKiehlProduct = (p) => {
  const id = String(p.id || "");
  const brand = String(p.brand || "");
  const name = String(p.name || "");
  return id.startsWith("kiehl-") || /키엘|kiehl/i.test(brand) || /키엘|kiehl/i.test(name);
};

const kiehlProducts = products.filter(isKiehlProduct);
const kiehlIds = new Set(kiehlProducts.map((p) => p.id));
const kiehlProcedures = procedures.filter((r) => kiehlIds.has(r.productId));
const kiehlCases = cases.filter((c) => {
  const s = JSON.stringify(c);
  return (
    /kiehl|키엘/i.test(s) ||
    (c.productIds || []).some((id) => kiehlIds.has(id)) ||
    (c.productNames || []).some((n) => /키엘|kiehl/i.test(String(n)))
  );
});

const byProduct = {};
for (const p of kiehlProducts) {
  byProduct[p.id] = {
    product: p,
    procedures: kiehlProcedures.filter((r) => r.productId === p.id),
    cases: kiehlCases.filter(
      (c) =>
        (c.productIds || []).includes(p.id) ||
        (c.productNames || []).some((n) => {
          const nn = String(n);
          return nn.includes(p.name) || (/키엘|kiehl/i.test(nn) && nn.includes(String(p.name || "").replace(/^키엘\s*/, "")));
        })
    ),
  };
}

const exportDoc = {
  meta: {
    title: "클린아이덱스 — 독일 키엘(Kiehl) 세제 지식 전체 내보내기",
    purpose: "다른 AI/작업용 입력 데이터. 문서·파싱 소스 기준.",
    generatedAt: new Date().toISOString(),
    sourceFiles: [
      "lib/knowledge-hub/cleaning-knowledge/source/products.parsed.json",
      "lib/knowledge-hub/cleaning-knowledge/source/product-procedures.parsed.json",
      "lib/knowledge-hub/cleaning-knowledge/source/cases.parsed.json",
    ],
    counts: {
      products: kiehlProducts.length,
      procedures: kiehlProcedures.length,
      cases: kiehlCases.length,
    },
    notes: [
      "제품 필드는 리스트업 문서 파싱 결과입니다.",
      "절차(procedures)는 제품별 사용·희석·주의 작업 절차입니다.",
      "사례(cases)는 현장 근거 사례로, 키엘 제품이 언급되거나 연결된 항목입니다.",
      "판매 링크·관리자 오버레이는 포함하지 않았습니다.",
    ],
  },
  products: kiehlProducts,
  procedures: kiehlProcedures,
  cases: kiehlCases,
  byProductId: byProduct,
};

function bul(list) {
  if (!list?.length) return "(없음)";
  return list.map((x) => `- ${String(x)}`).join("\n");
}

const md = [];
md.push("# 독일 키엘(Kiehl) 세제 지식 전체 내보내기");
md.push("");
md.push("> 클린아이덱스 소스 기준. 다른 AI 입력용.");
md.push(`> 생성: ${exportDoc.meta.generatedAt}`);
md.push(
  `> 제품 ${kiehlProducts.length} · 절차 ${kiehlProcedures.length} · 사례 ${kiehlCases.length}`
);
md.push("");
md.push("---");
md.push("");
md.push("## 목차 (제품)");
for (const p of kiehlProducts) {
  md.push(`- [${p.name}](#${p.id}) (\`${p.id}\`)`);
}
md.push("");
md.push("---");
md.push("");
md.push("## 제품 상세");
md.push("");

for (const p of kiehlProducts) {
  const pack = byProduct[p.id];
  md.push(`### ${p.name}`);
  md.push("");
  md.push(`- **id**: \`${p.id}\``);
  md.push(`- **brand**: ${p.brand ?? ""}`);
  if (p.aliases?.length) md.push(`- **aliases**: ${p.aliases.join(", ")}`);
  md.push(`- **phType**: ${p.phType ?? ""}${p.phApprox ? ` (${p.phApprox})` : ""}`);
  md.push(`- **confidence**: ${p.confidence ?? ""}`);
  if (p.status) md.push(`- **status**: ${p.status}`);
  if (p.summary) md.push(`- **summary**: ${p.summary}`);
  md.push(`- **standardDilution**: ${p.standardDilution ?? "(없음)"}`);
  md.push(`- **strongDilution**: ${p.strongDilution ?? "(없음)"}`);
  md.push(`- **dwellTime**: ${p.dwellTime ?? "(없음)"}`);
  if (p.packSizes?.length) md.push(`- **packSizes**: ${p.packSizes.join(", ")}`);
  md.push("");
  md.push("#### 주요 용도");
  md.push(bul(p.mainUse));
  md.push("");
  md.push("#### 적용 재질 (원문)");
  md.push(bul(p.materialsRaw));
  md.push("");
  md.push("#### 제거 오염 (원문)");
  md.push(bul(p.contaminantsRaw));
  md.push("");
  md.push("#### 사용 불가 (원문)");
  md.push(bul(p.forbiddenRaw));
  md.push("");
  md.push("#### 주의사항");
  md.push(bul(p.warnings));
  md.push("");
  if (p.compatibleMaterialIds?.length) {
    md.push("#### 매핑 materialIds");
    md.push(bul(p.compatibleMaterialIds));
    md.push("");
  }
  if (p.contaminantIds?.length) {
    md.push("#### 매핑 contaminantIds");
    md.push(bul(p.contaminantIds));
    md.push("");
  }
  if (p.forbiddenMaterialIds?.length) {
    md.push("#### 매핑 forbiddenMaterialIds");
    md.push(bul(p.forbiddenMaterialIds));
    md.push("");
  }

  md.push(`#### 관련 절차 (${pack.procedures.length})`);
  if (!pack.procedures.length) md.push("(없음)");
  for (const r of pack.procedures) {
    md.push("");
    md.push(`##### ${r.title || r.slug || r.id}`);
    if (r.slug) md.push(`- slug: \`${r.slug}\``);
    if (r.summary) md.push(`- summary: ${r.summary}`);
    if (r.dilution) md.push(`- dilution: ${r.dilution}`);
    if (r.dwellTime) md.push(`- dwellTime: ${r.dwellTime}`);
    if (r.materialId) md.push(`- materialId: \`${r.materialId}\``);
    if (r.contaminantId) md.push(`- contaminantId: \`${r.contaminantId}\``);
    if (r.steps?.length) {
      md.push("- steps:");
      r.steps.forEach((s, i) => md.push(`  ${i + 1}. ${s}`));
    }
    if (r.warnings?.length) {
      md.push("- warnings:");
      r.warnings.forEach((w) => md.push(`  - ${w}`));
    }
  }
  md.push("");
  md.push(`#### 관련 사례 (${pack.cases.length})`);
  if (!pack.cases.length) md.push("(없음)");
  for (const c of pack.cases) {
    md.push("");
    md.push(`##### ${c.name || c.id}`);
    md.push(`- id: \`${c.id}\``);
    if (c.evidenceLevel) md.push(`- evidenceLevel: ${c.evidenceLevel}`);
    if (c.productNames?.length) md.push(`- productNames: ${c.productNames.join(", ")}`);
    if (c.summary) md.push(`- summary: ${c.summary}`);
    if (c.outcome) md.push(`- outcome: ${c.outcome}`);
    if (c.body) md.push(`- body: ${c.body}`);
    if (c.steps?.length) {
      md.push("- steps:");
      c.steps.forEach((s, i) => {
        if (typeof s === "string") md.push(`  ${i + 1}. ${s}`);
        else {
          const title = s.title || s.name || "";
          const body = s.body || s.detail || s.text || "";
          md.push(`  ${i + 1}. ${title}${body ? `: ${body}` : ""}`.trim());
        }
      });
    }
  }
  md.push("");
  md.push("---");
  md.push("");
}

md.push("## 부록: 사례 전체 목록");
md.push("");
for (const c of kiehlCases) {
  const names = c.productNames?.length ? ` [${c.productNames.join(", ")}]` : "";
  md.push(`- \`${c.id}\` — ${c.name || ""}${names}`);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "kiehl-knowledge-full.json"), JSON.stringify(exportDoc, null, 2), "utf8");
fs.writeFileSync(path.join(OUT, "kiehl-knowledge-full.md"), md.join("\n"), "utf8");

console.log("OK", {
  products: kiehlProducts.length,
  procedures: kiehlProcedures.length,
  cases: kiehlCases.length,
  json: path.join(OUT, "kiehl-knowledge-full.json"),
  md: path.join(OUT, "kiehl-knowledge-full.md"),
});
