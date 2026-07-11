import Link from "next/link";
import { ArrowRight, ListChecks, Sparkles } from "lucide-react";
import EditableBlock from "@/components/knowledge-hub/EditableBlock";
import EntityRichText from "@/components/knowledge-hub/EntityRichText";
import GuideProductCard from "@/components/knowledge-hub/GuideProductCard";
import RecipeSummaryList from "@/components/knowledge-hub/RecipeSummaryList";
import type { CleaningGuideWithProducts, GuideBlock } from "@/lib/knowledge-hub/types";
import { inquiryPathForType, type InquiryType } from "@/lib/knowledge-hub/mvp-pages";
import { getCatalogTopicByPath, getCategory } from "@/lib/knowledge-hub/catalog";
import { getPollutionCrossLinks } from "@/lib/knowledge-hub/pollution-cross-links";
type Props = {
  guide: CleaningGuideWithProducts;
  canEdit: boolean;
  coupangUrls: Record<string, string>;
};

function sectionBoxClass(tone?: string) {
  if (tone === "summary") return "border-teal-200 bg-teal-50/70";
  if (tone === "caution") return "border-rose-200 bg-rose-50/70";
  return "border-white bg-white";
}

function renderBlock(
  block: GuideBlock,
  guide: CleaningGuideWithProducts,
  canEdit: boolean,
  coupangUrls: Record<string, string>
) {
  if (block.type === "section") {
    return (
      <section
        id={block.id}
        key={block.id}
        className={`scroll-mt-24 rounded-3xl border p-5 sm:p-6 ${sectionBoxClass(block.tone)}`}
      >
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
        <EditableBlock
          guideSlug={guide.slug}
          blockId={block.id}
          field="paragraphs"
          value={block.paragraphs}
          canEdit={canEdit}
          className="mt-4 space-y-4 text-base leading-8 text-slate-700"
        />
      </section>
    );
  }

  if (block.type === "checklist") {
    return (
      <section id={block.id} key={block.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
        <EditableBlock
          guideSlug={guide.slug}
          blockId={block.id}
          field="items"
          value={block.items}
          canEdit={canEdit}
          className="mt-4"
        />
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
      <section id={block.id} key={block.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
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
      <section id={block.id} key={block.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
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
    return (
      <section id={block.id} key={block.id} className="scroll-mt-24 rounded-3xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
        <h2 className="text-xl font-black text-slate-950 sm:text-2xl">{block.title}</h2>
        <p className="mt-2 text-xs text-slate-500">아래 제품 페이지에서 희석·주의사항을 확인하세요.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {guide.products.map((p) => {
            const isInternal = p.source_url?.startsWith("/");
            const href =
              isInternal && p.source_url
                ? p.source_url
                : p.source_type === "smartstore" && p.source_url
                  ? p.source_url
                  : coupangUrls[p.id] ?? `/go/p/${p.id}?from=guide&slug=${guide.slug}`;
            return (
              <GuideProductCard
                key={p.id}
                product={p}
                href={href}
                internalLink={Boolean(isInternal)}
                canEdit={canEdit}
                coupangLabel={p.coupang_keyword ?? undefined}
              />
            );
          })}
        </div>
      </section>
    );
  }

  return null;
}

function inquiryTypeForGuide(guide: CleaningGuideWithProducts): InquiryType {
  if (guide.guide_type === "problem" || guide.service_slug === "pollution") return "none";
  if (guide.service_slug === "move-in") return "move_in";
  return "regular";
}

function guideBadgeLabel(guide: CleaningGuideWithProducts): string {
  if (guide.guide_type === "problem") return "오염·재질 가이드";
  if (guide.guide_type === "service_supplies") return "약품·장비";
  return "청소 가이드";
}
export default function CleaningGuideView({ guide, canEdit, coupangUrls }: Props) {
  const body = guide.body_json;
  const inquiryType = inquiryTypeForGuide(guide);
  const inquiryPath = inquiryPathForType(inquiryType);
  const inquiryLabel = inquiryType === "move_in" ? "입주청소 견적 받기" : "정기청소 견적 받기";
  const topicMeta = getCatalogTopicByPath(guide.path);
  const category = topicMeta ? getCategory(topicMeta.categorySlug) : undefined;
  const hubHref = category?.hubPath ?? "/services";
  const hubLabel = category?.name ?? "가이드";
  const pollutionLinks =
    guide.guide_type !== "problem"
      ? getPollutionCrossLinks(`${guide.h1} ${body.intro} ${topicMeta?.focus ?? ""}`, guide.path)
      : [];

  return (
    <article className="mx-auto max-w-3xl">
      <nav className="mb-6 text-sm font-medium text-slate-500">
        <Link href="/" className="hover:text-teal-700">
          홈
        </Link>
        <span className="mx-2">/</span>
        <Link href={category?.slug === "pollution" ? "/guides" : "/services"} className="hover:text-teal-700">
          {category?.slug === "pollution" ? "오염·재질" : "가이드"}
        </Link>
        <span className="mx-2">/</span>
        <Link href={hubHref} className="hover:text-teal-700">
          {hubLabel}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-slate-800">{guide.h1}</span>
      </nav>

      <header className="mb-8">
        <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
          {guideBadgeLabel(guide)}
        </span>        <h1 className="mt-4 text-3xl font-black leading-tight text-slate-950 sm:text-4xl">{guide.h1}</h1>
        {body.intro ? (
          <EditableBlock
            guideSlug={guide.slug}
            blockId="_intro"
            field="text"
            value={body.intro}
            canEdit={canEdit}
            className="mt-5 text-lg leading-8 text-slate-600"
          />
        ) : null}
        {body.summary?.length ? (
          <ul className="mt-6 space-y-2 rounded-2xl border border-teal-100 bg-teal-50/50 p-4">
            {body.summary.map((s) => (
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
            {body.toc.map((item, i) => (
              <li key={item}>
                <a
                  href={`#${body.blocks[i]?.id ?? `s-${i}`}`}
                  className="text-sm font-bold text-teal-800 hover:underline"
                >
                  {i + 1}. {item}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="space-y-6">{body.blocks.map((b) => renderBlock(b, guide, canEdit, coupangUrls))}</div>

      {inquiryPath ? (
        <section className="mt-10 rounded-3xl bg-gradient-to-br from-slate-900 to-teal-900 p-6 text-white sm:p-8">
          <div className="flex items-center gap-2 text-teal-200">
            <Sparkles className="h-5 w-5" aria-hidden />
            <span className="text-sm font-bold">청소 문의</span>
          </div>
          <h2 className="mt-3 text-2xl font-black">전문업체 문의하기</h2>
          <p className="mt-2 text-sm leading-7 text-slate-200">지금 보고 계신 가이드 내용을 바탕으로 견적을 안내합니다.</p>
          <Link
            href={`${inquiryPath}?ref=${guide.service_slug}&path=${encodeURIComponent(guide.path)}`}
            className="mt-5 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 sm:w-auto"
          >
            전문업체 문의하기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </section>
      ) : null}

      {pollutionLinks.length ? (
        <section className="mt-10 rounded-3xl border border-violet-200 bg-violet-50/60 p-5 sm:p-6">
          <h2 className="text-lg font-black text-slate-900">오염·얼룩 제거 가이드</h2>
          <p className="mt-1 text-sm text-slate-600">이 구역 청소와 함께 자주 찾는 오염 제거 방법입니다.</p>
          <ul className="mt-3 space-y-2">
            {pollutionLinks.map((t) => (
              <li key={t.path}>
                <Link href={t.path} className="text-base font-bold text-violet-800 hover:underline">
                  {t.h1}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {body.relatedPaths?.length ? (
        <section className="mt-10">
          <h2 className="text-lg font-black text-slate-900">관련 가이드</h2>
          <ul className="mt-3 space-y-2">
            {body.relatedPaths.map((p) => {
              const related = getCatalogTopicByPath(p);
              return (
                <li key={p}>
                  <Link href={p} className="text-base font-bold text-teal-700 hover:underline">
                    {related?.h1 ?? p}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}    </article>
  );
}
