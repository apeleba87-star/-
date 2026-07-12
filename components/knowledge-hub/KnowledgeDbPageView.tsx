import Link from "next/link";
import { ChevronRight } from "lucide-react";
import EntityRichText from "@/components/knowledge-hub/EntityRichText";
import ProductPhBadge from "@/components/knowledge-hub/ProductPhBadge";
import RecipeSummaryList from "@/components/knowledge-hub/RecipeSummaryList";
import { getCatalogTopicByPath } from "@/lib/knowledge-hub/catalog";
import { getProductById } from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import { RISK_LEVEL_KO } from "@/lib/knowledge-hub/korean-labels";
import type { GuideBodyJson, GuideBlock } from "@/lib/knowledge-hub/types";

type Props = {
  h1: string;
  badge?: string;
  intro?: string;
  summary?: string[];
  riskLevel?: string;
  body: GuideBodyJson;
  breadcrumb: { href: string; label: string }[];
  footer?: React.ReactNode;
};

function sectionBoxClass(tone?: string) {
  if (tone === "caution") return "border-rose-200 bg-rose-50/70";
  if (tone === "summary") return "border-teal-200 bg-teal-50/70";
  return "border-slate-200 bg-white";
}

function riskChipClass(risk: string): string {
  if (risk === "low") return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  if (risk === "medium") return "bg-amber-50 text-amber-900 ring-amber-200";
  if (risk === "high") return "bg-orange-50 text-orange-900 ring-orange-200";
  if (risk === "very_high") return "bg-rose-50 text-rose-900 ring-rose-200";
  return "bg-slate-100 text-slate-700 ring-slate-200";
}

function productChips(p: NonNullable<ReturnType<typeof getProductById>>): string[] {
  const raw = p.contaminantsRaw?.length ? p.contaminantsRaw : p.mainUse;
  return raw
    .map((s) => s.trim())
    .filter((t) => {
      if (!t) return false;
      if (/^\(※|^※/.test(t)) return false;
      if (t.length > 14) return false;
      return true;
    })
    .slice(0, 3);
}

function renderBlock(block: GuideBlock) {
  if (block.type === "section") {
    return (
      <section
        key={block.id}
        id={block.id}
        className={`scroll-mt-24 rounded-2xl border p-5 sm:p-6 ${sectionBoxClass(block.tone)}`}
      >
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
        <div className="mt-3 space-y-3 text-base leading-7 text-slate-800">
          {block.paragraphs.map((p) => (
            <p key={p}>
              <EntityRichText text={p} />
            </p>
          ))}
        </div>
      </section>
    );
  }
  if (block.type === "checklist") {
    return (
      <section
        key={block.id}
        id={block.id}
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-black text-slate-950">{block.title}</h2>
        <ul className="mt-3 space-y-2">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2 text-slate-800">
              <span className="text-teal-600">✓</span>
              <EntityRichText text={item} />
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (block.type === "links") {
    if (!block.items.length) return null;
    return (
      <section
        key={block.id}
        id={block.id}
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-black text-slate-950">{block.title}</h2>
        <ul className="mt-3 divide-y divide-slate-100">
          {block.items.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="flex min-h-[52px] items-center justify-between gap-3 py-3 transition hover:text-teal-800"
              >
                <span className="min-w-0">
                  <span className="block break-keep font-bold text-slate-900">{item.label}</span>
                  {item.note ? (
                    <span className="mt-0.5 block truncate text-sm text-slate-500">{item.note}</span>
                  ) : null}
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    );
  }
  if (block.type === "recipes") {
    return (
      <RecipeSummaryList
        key={block.id}
        id={block.id}
        title={block.title}
        recipeSlugs={block.recipeSlugs}
        subtitle={block.subtitle}
      />
    );
  }
  if (block.type === "steps") {
    return (
      <section
        key={block.id}
        id={block.id}
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-black text-slate-950">{block.title}</h2>
        <ol className="mt-4 space-y-4">
          {block.steps.map((step, i) => (
            <li key={step.title} className="flex gap-4 rounded-2xl bg-slate-50 p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-600 text-lg font-black text-white">
                {i + 1}
              </span>
              <div>
                <p className="font-bold text-slate-900">
                  <EntityRichText text={step.title} />
                </p>
                <p className="mt-1 text-base leading-relaxed text-slate-700">
                  <EntityRichText text={step.body} />
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    );
  }
  if (block.type === "faq") {
    return (
      <section
        key={block.id}
        id={block.id}
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-black text-slate-950">{block.title}</h2>
        <dl className="mt-4 space-y-4">
          {block.items.map((item) => (
            <div key={item.q} className="rounded-2xl bg-slate-50 p-4">
              <dt className="font-bold text-slate-900">{item.q}</dt>
              <dd className="mt-2 text-base leading-relaxed text-slate-700">
                <EntityRichText text={item.a} />
              </dd>
            </div>
          ))}
        </dl>
      </section>
    );
  }
  if (block.type === "products") {
    const ids = block.productIds ?? [];
    if (!ids.length) return null;
    return (
      <section
        key={block.id}
        id={block.id}
        className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6"
      >
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
        {block.subtitle ? <p className="mt-2 text-sm text-slate-600">{block.subtitle}</p> : null}
        <ul className="mt-4 grid gap-3">
          {ids.map((id) => {
            const p = getProductById(id);
            if (!p) return null;
            const chips = productChips(p);
            return (
              <li key={id}>
                <Link
                  href={`/products/${id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50/80 p-4 transition hover:border-teal-300 hover:bg-white sm:p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-teal-800">{p.brand}</p>
                      <p className="mt-1 break-keep text-lg font-black text-slate-950">{p.name}</p>
                    </div>
                    <ProductPhBadge phApprox={p.phApprox} size="sm" />
                  </div>
                  {p.standardDilution ? (
                    <p className="mt-3 text-base font-black text-slate-900">
                      희석 <span className="text-teal-800">{p.standardDilution}</span>
                    </p>
                  ) : null}
                  {chips.length ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {chips.map((c) => (
                        <li
                          key={c}
                          className="rounded-lg bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                        >
                          {c}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    );
  }
  return null;
}

export default function KnowledgeDbPageView({
  h1,
  badge,
  intro,
  summary,
  riskLevel,
  body,
  breadcrumb,
  footer,
}: Props) {
  const toc = body.toc?.length && body.toc.length > 3 ? body.toc : null;
  const pageSummary = summary?.length ? summary : body.summary;

  return (
    <article className="mx-auto max-w-2xl">
      <nav className="mb-5 text-sm font-medium text-slate-500">
        <Link href="/" className="hover:text-teal-700">
          홈
        </Link>
        {breadcrumb.map((b) => (
          <span key={b.href}>
            <span className="mx-2">/</span>
            <Link href={b.href} className="hover:text-teal-700">
              {b.label}
            </Link>
          </span>
        ))}
        <span className="mx-2">/</span>
        <span className="text-slate-800">{h1}</span>
      </nav>

      <header className="mb-6">
        <div className="flex flex-wrap items-center gap-2">
          {badge ? (
            <span className="inline-flex rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
              {badge}
            </span>
          ) : null}
          {riskLevel ? (
            <span
              className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ring-1 ${riskChipClass(riskLevel)}`}
            >
              위험도 {RISK_LEVEL_KO[riskLevel] ?? riskLevel}
              {riskLevel === "high" || riskLevel === "very_high" ? " · 사전 테스트" : ""}
            </span>
          ) : null}
        </div>
        <h1 className="mt-3 break-keep text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          {h1}
        </h1>
        {intro ? <p className="mt-3 text-base leading-7 text-slate-600">{intro}</p> : null}
        {pageSummary?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {pageSummary.map((s) => (
              <span
                key={s}
                className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-slate-800 ring-1 ring-slate-200"
              >
                {s}
              </span>
            ))}
          </div>
        ) : null}
      </header>

      {toc ? (
        <nav className="mb-6 flex flex-wrap gap-2" aria-label="목차">
          {toc.map((item) => {
            const id = body.blocks.find((b) => b.title === item)?.id ?? "";
            return (
              <a
                key={item}
                href={`#${id}`}
                className="rounded-full bg-white px-3 py-1.5 text-sm font-bold text-teal-800 ring-1 ring-slate-200 hover:ring-teal-400"
              >
                {item}
              </a>
            );
          })}
        </nav>
      ) : null}

      <div className="space-y-4">{body.blocks.map((b) => renderBlock(b))}</div>

      {body.relatedPaths?.length ? (
        <section className="mt-8">
          <h2 className="text-lg font-black text-slate-900">장소별 가이드</h2>
          <ul className="mt-3 space-y-1">
            {body.relatedPaths.map((p) => {
              const topic = getCatalogTopicByPath(p);
              return (
                <li key={p}>
                  <Link href={p} className="text-base font-bold text-teal-700 hover:underline">
                    {topic?.h1 ?? p}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {footer}
    </article>
  );
}
