import Link from "next/link";
import { ListChecks } from "lucide-react";
import EntityRichText from "@/components/knowledge-hub/EntityRichText";
import RecipeSummaryList from "@/components/knowledge-hub/RecipeSummaryList";
import { getCatalogTopicByPath } from "@/lib/knowledge-hub/catalog";
import type { GuideBodyJson, GuideBlock } from "@/lib/knowledge-hub/types";

type Props = {
  h1: string;
  badge?: string;
  intro?: string;
  summary?: string[];
  body: GuideBodyJson;
  breadcrumb: { href: string; label: string }[];
  footer?: React.ReactNode;
};

function sectionBoxClass(tone?: string) {
  if (tone === "caution") return "border-rose-200 bg-rose-50/70";
  if (tone === "summary") return "border-teal-200 bg-teal-50/70";
  return "border-white bg-white";
}

function renderBlock(block: GuideBlock) {
  if (block.type === "section") {
    return (
      <section key={block.id} id={block.id} className={`scroll-mt-24 rounded-3xl border p-5 sm:p-6 ${sectionBoxClass(block.tone)}`}>
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
        <div className="mt-4 space-y-4 text-base leading-8 text-slate-700">
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
      <section key={block.id} id={block.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-950">{block.title}</h2>
        <ul className="mt-4 space-y-2">
          {block.items.map((item) => (
            <li key={item} className="flex gap-2 text-slate-700">
              <span className="text-teal-600">✓</span>
              <EntityRichText text={item} />
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
      <section key={block.id} id={block.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
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
      <section key={block.id} id={block.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
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
    return null;
  }
  return null;
}

export default function KnowledgeDbPageView({ h1, badge, intro, summary, body, breadcrumb, footer }: Props) {
  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-6 text-sm font-medium text-slate-500">
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

      <header className="mb-8">
        {badge ? (
          <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
            {badge}
          </span>
        ) : null}
        <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{h1}</h1>
        {intro ? <p className="mt-5 text-lg leading-8 text-slate-600">{intro}</p> : null}
        {summary?.length ? (
          <ul className="mt-6 space-y-2 rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
            {summary.map((s) => (
              <li key={s} className="text-sm font-medium text-teal-900">
                {s}
              </li>
            ))}
          </ul>
        ) : null}
      </header>

      {body.toc?.length ? (
        <nav className="mb-8 rounded-3xl border border-slate-200 bg-white p-5" aria-label="목차">
          <div className="mb-3 flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-slate-700" aria-hidden />
            <h2 className="text-lg font-black">목차</h2>
          </div>
          <ol className="grid gap-2 sm:grid-cols-2">
            {body.toc.map((item) => (
              <li key={item}>
                <a href={`#${body.blocks.find((b) => b.title === item)?.id ?? ""}`} className="text-sm font-bold text-teal-800 hover:underline">
                  {item}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="space-y-6">{body.blocks.map((b) => renderBlock(b))}</div>

      {body.relatedPaths?.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-black text-slate-900">관련 현장 가이드</h2>
          <ul className="mt-3 space-y-2">
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
