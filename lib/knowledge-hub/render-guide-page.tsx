import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CleaningGuideView from "@/components/knowledge-hub/CleaningGuideView";
import { fetchCoupangByKeyword } from "@/lib/knowledge-hub/coupang-products";
import { getCatalogTopicByPath, getCategory } from "@/lib/knowledge-hub/catalog";
import { getGuideByPath, isOperator } from "@/lib/knowledge-hub/queries";
import type { CleaningGuideWithProducts } from "@/lib/knowledge-hub/types";
import { createServerSupabase } from "@/lib/supabase-server";
import { buildPageMetadata, getBaseUrl } from "@/lib/seo";

export const revalidate = 86400;

export async function buildGuideMetadata(path: string): Promise<Metadata> {
  const guide = await getGuideByPath(path);
  if (!guide) return { title: "가이드를 찾을 수 없습니다" };

  const meta = buildPageMetadata({
    title: guide.seo_title,
    description: guide.seo_description,
    path,
  });

  if (!guide.indexable || !guide.published_at) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

async function resolveCoupangUrls(guide: CleaningGuideWithProducts): Promise<Record<string, string>> {
  const urls: Record<string, string> = {};
  await Promise.all(
    guide.products.map(async (p) => {
      if (p.source_url) {
        urls[p.id] = p.source_url;
        return;
      }
      // 쿠팡 자동 조회는 지연·실패가 잦아 가이드 렌더를 막지 않음 (판매 링크는 관리자 등록 URL만)
      if (p.coupang_keyword) {
        try {
          const products = await Promise.race([
            fetchCoupangByKeyword(p.coupang_keyword),
            new Promise<never>((_, reject) => setTimeout(() => reject(new Error("coupang-timeout")), 2500)),
          ]);
          if (products[0]?.productUrl) urls[p.id] = products[0].productUrl;
        } catch {
          /* ignore */
        }
      }
    })
  );
  return urls;
}

function buildJsonLd(guide: CleaningGuideWithProducts, baseUrl: string) {
  const stepsBlock = guide.body_json.blocks.find((b) => b.type === "steps");
  const faqBlock = guide.body_json.blocks.find((b) => b.type === "faq");
  const topicMeta = getCatalogTopicByPath(guide.path);
  const category = topicMeta ? getCategory(topicMeta.categorySlug) : undefined;
  const hubPath = category?.hubPath ?? "/services";
  const hubName = category?.name ?? "청소 가이드";
  const rootName = category?.slug === "pollution" ? "오염·재질" : "청소 가이드";
  const rootPath = category?.slug === "pollution" ? "/guides" : "/services";

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      name: guide.h1,
      description: guide.seo_description,
      url: `${baseUrl}${guide.path}`,
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "클린아이덱스", item: baseUrl },
        { "@type": "ListItem", position: 2, name: rootName, item: `${baseUrl}${rootPath}` },
        { "@type": "ListItem", position: 3, name: hubName, item: `${baseUrl}${hubPath}` },
        { "@type": "ListItem", position: 4, name: guide.h1, item: `${baseUrl}${guide.path}` },
      ],
    },
  ];

  if (stepsBlock && stepsBlock.type === "steps") {
    graph.push({
      "@type": "HowTo",
      name: guide.h1,
      description: guide.body_json.intro,
      step: stepsBlock.steps.map((s, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: s.title,
        text: s.body,
      })),
    });
  }

  if (faqBlock && faqBlock.type === "faq" && faqBlock.items.length) {
    graph.push({
      "@type": "FAQPage",
      mainEntity: faqBlock.items.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}

export async function renderGuidePage(path: string, searchParams?: { edit?: string }) {
  const guide = await getGuideByPath(path);
  if (!guide) notFound();

  const authSupabase = await createServerSupabase();
  const {
    data: { user },
  } = await authSupabase.auth.getUser();
  const canEdit = searchParams?.edit === "1" && user ? await isOperator(user.id) : false;

  const coupangUrls = await resolveCoupangUrls(guide);
  const baseUrl = getBaseUrl();
  const jsonLd = buildJsonLd(guide, baseUrl);

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="page-shell py-6 sm:py-10">
        {canEdit ? (
          <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900">
            운영 편집 모드 — 블록 옆 [편집]으로 내용을 수정할 수 있습니다.
          </p>
        ) : null}
        <CleaningGuideView guide={guide} canEdit={canEdit} coupangUrls={coupangUrls} />
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </main>
  );
}
