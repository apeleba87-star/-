import Link from "next/link";
import { ArrowRight, CheckCircle2, Home, ListChecks } from "lucide-react";

type MoveSeoBlogContent = {
  kind?: string;
  place?: string;
  title?: string;
  intro?: string;
  summary?: string[];
  toc?: string[];
  sections?: {
    id: string;
    title: string;
    paragraphs: string[];
    tone?: "default" | "summary" | "caution" | "examples";
  }[];
  cta?: {
    title: string;
    description: string;
    href: string;
    label: string;
  };
};

type MoveSeoBlogSection = NonNullable<MoveSeoBlogContent["sections"]>[number];

type Props = {
  title: string;
  excerpt: string | null;
  body: string | null;
  publishedAt: string | null;
  content: unknown;
};

function isMoveSeoBlogContent(value: unknown): value is MoveSeoBlogContent {
  if (!value || typeof value !== "object") return false;
  const content = value as MoveSeoBlogContent;
  return Array.isArray(content.sections) && content.sections.length > 0;
}

function splitFallbackParagraphs(body: string | null): string[] {
  return (body ?? "")
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function sectionBoxClass(tone?: MoveSeoBlogSection["tone"]) {
  if (tone === "summary") return "border-teal-200 bg-teal-50/70";
  if (tone === "caution") return "border-rose-200 bg-rose-50/70";
  if (tone === "examples") return "border-slate-200 bg-slate-50/80";
  return "border-white bg-white";
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function SummaryCards({ rows }: { rows: string[] }) {
  if (!rows.length) return null;
  return (
    <section className="my-8 rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-50 via-white to-emerald-50 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-teal-600 text-white">
          <Home className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-700">실거래 요약</p>
          <h2 className="text-lg font-black text-slate-950">한눈에 보는 가격 정보</h2>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {rows.map((row) => {
          const [label, ...rest] = row.split(":");
          return (
            <div key={row} className="rounded-2xl border border-white/80 bg-white/85 p-4 shadow-sm">
              <p className="text-xs font-bold text-slate-500">{rest.length ? label.trim() : "요약"}</p>
              <p className="mt-1 text-base font-extrabold leading-snug text-slate-950">
                {(rest.length ? rest.join(":") : row).trim()}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function TocBox({ toc, sections }: { toc: string[]; sections: NonNullable<MoveSeoBlogContent["sections"]> }) {
  const items = toc.length ? toc : sections.map((section) => section.title);
  if (!items.length) return null;
  return (
    <nav className="my-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" aria-label="이사 블로그 목차">
      <div className="mb-4 flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <ListChecks className="h-4 w-4" aria-hidden />
        </span>
        <h2 className="text-lg font-black text-slate-950">목차</h2>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => {
          const section = sections[index];
          return (
            <a
              key={`${item}-${index}`}
              href={section ? `#${section.id}` : undefined}
              className="group flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm font-bold text-slate-700 transition hover:border-teal-200 hover:bg-teal-50 hover:text-teal-800"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-black text-teal-700 shadow-sm ring-1 ring-slate-100 group-hover:ring-teal-200">
                {index + 1}
              </span>
              <span>{item}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export default function MoveSeoBlogPostView({ title, excerpt, body, publishedAt, content }: Props) {
  const structured = isMoveSeoBlogContent(content) ? content : null;
  const sections: MoveSeoBlogSection[] =
    structured?.sections ??
    splitFallbackParagraphs(body).map((paragraph, index) => ({
      id: `section-${index + 1}`,
      title: index === 0 ? "이사 정보 요약" : `확인 포인트 ${index + 1}`,
      paragraphs: paragraph.split("\n").filter(Boolean),
    }));

  return (
    <article className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
      <div className="mb-8 border-b border-slate-100 pb-7">
        <span className="inline-flex rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700 ring-1 ring-teal-100">
          이사정보
        </span>
        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          {title}
        </h1>
        {publishedAt ? <time className="mt-3 block text-sm font-medium text-slate-500">{formatDate(publishedAt)}</time> : null}
        {excerpt ? <p className="mt-5 text-lg leading-8 text-slate-600">{excerpt}</p> : null}
        {structured?.intro ? (
          <p className="mt-5 rounded-2xl bg-slate-50 p-4 text-base leading-8 text-slate-700">
            {structured.intro}
          </p>
        ) : null}
      </div>

      <SummaryCards rows={structured?.summary ?? []} />
      <TocBox toc={structured?.toc ?? []} sections={sections} />

      <div className="space-y-10">
        {sections.map((section) => (
          <section
            id={section.id}
            key={section.id}
            className={`scroll-mt-24 rounded-3xl border p-5 sm:p-6 ${sectionBoxClass(section.tone)}`}
          >
            <h2 className="text-2xl font-black leading-tight tracking-tight text-slate-950 sm:text-3xl">
              {section.title}
            </h2>
            <div className="mt-5 space-y-5 text-base leading-8 text-slate-700">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-10 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-900 p-6 text-white shadow-xl sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-teal-200">
              <CheckCircle2 className="h-5 w-5" aria-hidden />
              <span className="text-sm font-bold">다음 단계</span>
            </div>
            <h2 className="text-2xl font-black">
              {structured?.cta?.title ?? "내 예산으로 갈 수 있는 동네를 바로 확인하세요"}
            </h2>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-200">
              {structured?.cta?.description ??
                "보증금과 월세 조건을 입력하면 최근 실거래가 기준으로 갈 수 있는 지역과 주택 유형을 찾아볼 수 있습니다."}
            </p>
          </div>
          <Link
            href={structured?.cta?.href ?? "/move"}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950 shadow-lg transition hover:bg-teal-50"
          >
            {structured?.cta?.label ?? "이사검색 바로가기"}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    </article>
  );
}
