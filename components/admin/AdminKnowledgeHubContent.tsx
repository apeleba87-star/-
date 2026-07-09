import Link from "next/link";
import KnowledgeHubSeedButton from "@/components/admin/KnowledgeHubSeedButton";
import { CATALOG_TOPICS, HUB_CATEGORIES } from "@/lib/knowledge-hub/catalog";
import {
  getCleaningKnowledgeDb,
  knowledgeStats,
  listContaminants,
  listMaterials,
  listProducts,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
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

export default function AdminKnowledgeHubContent() {
  const db = getCleaningKnowledgeDb();
  const stats = knowledgeStats();
  const products = listProducts();
  const materials = listMaterials();
  const contaminants = listContaminants();

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">지식 허브 콘텐츠</h1>
          <p className="mt-1 text-sm text-slate-600">
            가이드 {CATALOG_TOPICS.length} · 제품 {stats.products} · 재질 {materials.length} · 오염{" "}
            {contaminants.length} · 레시피 {stats.recipes} · 팩트 {stats.facts}
          </p>
          <p className="mt-2 text-xs text-slate-500">
            가이드 편집: 목록에서 「편집」→ 페이지에서 ?edit=1 · 시드 후 DB 내용이 저장됩니다.
          </p>
        </div>
        <KnowledgeHubSeedButton />
      </div>

      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: "현장 가이드", href: "#guides", count: CATALOG_TOPICS.length },
          { label: "제품", href: "#products", count: products.length },
          { label: "재질", href: "#materials", count: materials.length },
          { label: "오염", href: "#contaminants", count: contaminants.length },
          { label: "레시피", href: "#recipes", count: stats.recipes },
          { label: "팩트", href: "#facts", count: stats.facts },
        ].map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="rounded-xl border border-slate-200 bg-white p-4 text-center hover:border-teal-300"
          >
            <p className="text-2xl font-black text-teal-700">{item.count}</p>
            <p className="text-sm font-medium text-slate-700">{item.label}</p>
          </a>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link href="/products" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
          공개 · 제품
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
        <Link href="/services" className="rounded-lg border px-3 py-1.5 font-bold text-slate-700 hover:bg-slate-50">
          공개 · 현장
        </Link>
      </div>

      <div id="guides" className="space-y-6 scroll-mt-20">
        <h2 className="text-lg font-black text-slate-900">현장·오염 가이드</h2>
        {HUB_CATEGORIES.map((cat) => {
          const topics = CATALOG_TOPICS.filter((t) => t.categorySlug === cat.slug);
          return (
            <section key={cat.slug} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <h3 className="font-bold text-slate-900">{cat.name}</h3>
              </div>
              <table className="min-w-full text-sm">
                <tbody>
                  {topics.map((p) => (
                    <tr key={p.path} className="border-t border-slate-100">
                      <td className="px-4 py-2 font-medium">{p.h1}</td>
                      <td className="px-4 py-2 text-slate-500">{p.path}</td>
                      <td className="px-4 py-2">
                        <Link href={`${p.path}?edit=1`} className="font-bold text-teal-700 hover:underline">
                          편집
                        </Link>
                        <span className="mx-2 text-slate-300">|</span>
                        <Link href={p.path} className="text-slate-600 hover:underline">
                          보기
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          );
        })}
      </div>

      <SectionTable
        title="제품"
        headers={["이름", "ID", "용도", "링크"]}
        rows={products.map((p) => [
          p.name,
          <span key="id" className="font-mono text-xs">
            {p.id}
          </span>,
          p.mainUse.slice(0, 2).join(" · "),
          <Link key="l" href={`/products/${p.id}`} className="font-bold text-teal-700 hover:underline">
            보기
          </Link>,
        ])}
      />

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
        rows={db.qaCases.map((q) => [q.question, q.answerSummary.slice(0, 100) + (q.answerSummary.length > 100 ? "…" : "")])}
      />

      <SectionTable
        title="규칙"
        headers={["제목", "내용"]}
        rows={db.rules.map((r) => [r.title, r.body])}
      />
    </div>
  );
}
