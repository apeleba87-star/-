import Link from "next/link";
import KnowledgeHubSeedButton from "@/components/admin/KnowledgeHubSeedButton";
import AdminProductsPanel from "@/components/admin/AdminProductsPanel";
import { CATALOG_TOPICS, HUB_CATEGORIES } from "@/lib/knowledge-hub/catalog";
import {
  getCleaningKnowledgeDb,
  knowledgeStats,
  listContaminants,
  listMaterials,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { listAdminCatalogProducts } from "@/lib/knowledge-hub/product-catalog";
import { applySalesToProduct, getProductSalesMap } from "@/lib/knowledge-hub/product-sales";
import { enrichedGuidePathsForRecipe } from "@/lib/knowledge-hub/recipe-guide-linker";

function SectionTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: React.ReactNode[][];
}) {
  if (!rows.length) return null;
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
        <h2 className="font-bold text-slate-900">
          {title} <span className="text-sm font-normal text-slate-500">({rows.length})</span>
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-slate-500">
              {headers.map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((cells, i) => (
              <tr key={i} className="border-t border-slate-100">
                {cells.map((cell, j) => (
                  <td key={j} className="px-4 py-2 align-top">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function AdminKnowledgeHubContent() {
  const db = getCleaningKnowledgeDb();
  const stats = knowledgeStats();
  const [salesMap, catalog] = await Promise.all([getProductSalesMap(), listAdminCatalogProducts()]);
  const materials = listMaterials();
  const contaminants = listContaminants();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">지식 허브 (마스터)</h1>
        <p className="mt-1 text-sm text-slate-600">
          제품 추가·편집·삭제와 판매 링크를 관리합니다. 검색어 본문 편집은{" "}
          <Link href="/admin/solutions" className="font-semibold text-teal-800 hover:underline">
            검색어 솔루션
          </Link>
          에서 합니다.
        </p>
      </div>

      <Link
        href="/admin/solutions"
        className="flex items-center justify-between gap-4 rounded-2xl border-2 border-teal-800 bg-teal-50 px-5 py-4 transition hover:bg-teal-100"
      >
        <div>
          <p className="text-lg font-black text-teal-950">검색어 솔루션 편집</p>
          <p className="mt-0.5 text-sm text-teal-900/80">
            목록 → 편집하기 / 새로 만들기 · 한줄 요약·추천세제 별점·제거 단계
          </p>
        </div>
        <span className="shrink-0 text-sm font-bold text-teal-900">바로가기 →</span>
      </Link>

      <AdminProductsPanel
        products={catalog.map((p) => {
          const withSales = applySalesToProduct(p, salesMap);
          return {
            id: withSales.id,
            brand: withSales.brand,
            name: withSales.name,
            aliases: withSales.aliases ?? [],
            phType: withSales.phType,
            phApprox: withSales.phApprox ?? null,
            summary: withSales.summary ?? "",
            mainUse: withSales.mainUse ?? [],
            compatibleMaterialIds: withSales.compatibleMaterialIds ?? [],
            contaminantIds: withSales.contaminantIds ?? [],
            forbiddenMaterialIds: withSales.forbiddenMaterialIds ?? [],
            materialsRaw: withSales.materialsRaw ?? [],
            contaminantsRaw: withSales.contaminantsRaw ?? [],
            forbiddenRaw: withSales.forbiddenRaw ?? [],
            standardDilution: withSales.standardDilution ?? "",
            strongDilution: withSales.strongDilution ?? "",
            dwellTime: withSales.dwellTime ?? "",
            packSizes: withSales.packSizes ?? [],
            warnings: withSales.warnings ?? [],
            confidence: withSales.confidence,
            status: withSales.status ?? "active",
            salesUrl: withSales.salesUrl ?? null,
            salesLabel: withSales.salesLabel ?? null,
            catalogOrigin: p.catalogOrigin,
            hasDbRow: p.hasDbRow,
            isDeleted: p.isDeleted,
          };
        })}
        materials={materials.map((m) => ({ id: m.id, name: m.name }))}
        contaminants={contaminants.map((c) => ({ id: c.id, name: c.name }))}
      />

      <details className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-base font-black text-slate-900">
          현장 가이드 편집 링크 ({CATALOG_TOPICS.length})
        </summary>
        <p className="mt-2 text-sm text-slate-500">공개 가이드에서 ?edit=1 로 편집합니다.</p>
        <div className="mt-4 space-y-4">
          {HUB_CATEGORIES.map((cat) => {
            const topics = CATALOG_TOPICS.filter((t) => t.categorySlug === cat.slug);
            if (!topics.length) return null;
            return (
              <div key={cat.slug}>
                <p className="text-sm font-bold text-slate-700">{cat.name}</p>
                <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {topics.map((p) => (
                    <li key={p.path} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 font-medium text-slate-900">{p.h1}</span>
                      <Link href={`${p.path}?edit=1`} className="font-bold text-teal-700 hover:underline">
                        편집
                      </Link>
                      <Link href={p.path} className="text-slate-500 hover:underline">
                        보기
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-base font-black text-slate-900">
          마스터 목록 조회
        </summary>
        <p className="mt-2 text-sm text-slate-500">
          재질 {stats.materials} · 오염 {stats.contaminants} · 레시피 {stats.recipes} · 사례{" "}
          {stats.cases} · 규칙 {stats.rules}
        </p>
        <div className="mt-4 space-y-6">
          <SectionTable
            title="재질"
            headers={["이름", "ID", "위험도", "링크"]}
            rows={materials.map((m) => [
              m.name,
              <span key="id" className="font-mono text-xs">
                {m.id}
              </span>,
              m.riskLevel,
              <Link key="l" href={`/materials/${m.id}`} className="font-bold text-teal-700 hover:underline">
                보기
              </Link>,
            ])}
          />
          <SectionTable
            title="오염"
            headers={["이름", "ID", "유형", "링크"]}
            rows={contaminants.map((c) => [
              c.name,
              <span key="id" className="font-mono text-xs">
                {c.id}
              </span>,
              c.type,
              <Link key="l" href={`/pollution/${c.id}`} className="font-bold text-teal-700 hover:underline">
                보기
              </Link>,
            ])}
          />
          <SectionTable
            title="레시피"
            headers={["slug", "요약", "연결 가이드 수", "링크"]}
            rows={db.recipes.map((r) => [
              <span key="s" className="font-mono text-xs">
                {r.slug}
              </span>,
              r.summary.slice(0, 50) + (r.summary.length > 50 ? "…" : ""),
              String(enrichedGuidePathsForRecipe(r).length),
              <Link key="l" href={`/cleaning/${r.slug}`} className="font-bold text-teal-700 hover:underline">
                보기
              </Link>,
            ])}
          />
          <SectionTable
            title="사례 (원본 근거)"
            headers={["ID", "이름", "검증", "제품"]}
            rows={(db.cases ?? []).map((c) => [
              <span key="id" className="font-mono text-xs">
                {c.id}
              </span>,
              c.name,
              c.evidenceLevel,
              c.productNames.join(", ") || "—",
            ])}
          />
          <SectionTable
            title="팩트"
            headers={["ID", "내용", "연결 가이드"]}
            rows={db.facts.map((f) => [
              <span key="id" className="font-mono text-xs">
                {f.id}
              </span>,
              f.body.slice(0, 80) + (f.body.length > 80 ? "…" : ""),
              <span key="g" className="text-xs text-slate-500">
                {f.guidePaths?.length ? `${f.guidePaths.length}건` : "—"}
              </span>,
            ])}
          />
          <SectionTable
            title="Q&A"
            headers={["질문", "답변"]}
            rows={db.qaCases.map((q) => [
              q.question,
              q.answerSummary.slice(0, 100) + (q.answerSummary.length > 100 ? "…" : ""),
            ])}
          />
          <SectionTable
            title="규칙"
            headers={["제목", "내용"]}
            rows={db.rules.map((r) => [r.title, r.body])}
          />
        </div>
      </details>

      <details className="rounded-xl border border-slate-200 bg-white p-5">
        <summary className="cursor-pointer text-base font-black text-slate-900">도구</summary>
        <p className="mt-2 text-sm text-slate-500">시드·공개 사이트 바로가기 (일상 편집과 분리)</p>
        <div className="mt-4">
          <KnowledgeHubSeedButton />
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <Link href="/products" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
            공개 · 제품
          </Link>
          <Link href="/solutions" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
            공개 · 검색어 가이드
          </Link>
          <Link href="/materials" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
            공개 · 재질
          </Link>
          <Link href="/pollution" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
            공개 · 오염
          </Link>
          <Link href="/cleaning" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
            공개 · 레시피
          </Link>
          <Link href="/places" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
            공개 · 장소별
          </Link>
          <Link href="/materials" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
            공개 · 재질
          </Link>
          <Link href="/admin/materials" className="rounded-lg border px-3 py-1.5 font-bold text-teal-800 hover:bg-teal-50">
            관리 · 재질
          </Link>
        </div>
      </details>
    </div>
  );
}
