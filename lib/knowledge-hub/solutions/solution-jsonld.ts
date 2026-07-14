import type { AssembledSolution } from "@/lib/knowledge-hub/solutions/get-solutions";

export function buildSolutionJsonLd(data: AssembledSolution, baseUrl: string) {
  const url = `${baseUrl}${data.path}`;
  const { content, page, placeLabel, spaceLabel, partLabel } = data;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "WebPage",
      "@id": `${url}#webpage`,
      name: page.title,
      description: content.summary,
      url,
      inLanguage: "ko-KR",
    },
    {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "클린아이덱스", item: baseUrl },
        { "@type": "ListItem", position: 2, name: "검색어 가이드", item: `${baseUrl}/solutions` },
        {
          "@type": "ListItem",
          position: 3,
          name: `${placeLabel} ${spaceLabel}`,
          item: `${baseUrl}/solutions`,
        },
        { "@type": "ListItem", position: 4, name: page.title, item: url },
      ],
    },
  ];

  if (content.methodSteps.length) {
    graph.push({
      "@type": "HowTo",
      "@id": `${url}#howto`,
      name: page.title,
      description: content.summary,
      inLanguage: "ko-KR",
      step: content.methodSteps.map((text, i) => ({
        "@type": "HowToStep",
        position: i + 1,
        name: `${i + 1}단계`,
        text,
      })),
      ...(content.recommendations.some((r) => r.href)
        ? {
            tool: content.recommendations
              .filter((r) => r.href)
              .map((r) => ({
                "@type": "HowToTool",
                name: r.label,
              })),
          }
        : {}),
    });
  }

  if (content.ifFails.length || content.cautions.length) {
    const faq: { q: string; a: string }[] = [];
    if (content.ifFails.length) {
      faq.push({
        q: `${partLabel} ${data.contaminantName} 제거가 안 되면?`,
        a: `다음을 의심해 보세요. ${content.ifFails.join(", ")}.`,
      });
    }
    if (content.cautions.length) {
      faq.push({
        q: `${page.title} 주의사항은?`,
        a: content.cautions.join(". ") + ".",
      });
    }
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    });
  }

  return { "@context": "https://schema.org", "@graph": graph };
}
