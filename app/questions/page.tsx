import type { Metadata } from "next";
import Link from "next/link";
import QuestionsBoardTable from "@/components/questions/QuestionsBoardTable";
import ReportListPagination from "@/components/report/ReportListPagination";
import {
  QUESTIONS_LIST_PAGE_SIZE,
  questionNewPath,
} from "@/lib/questions/constants";
import { getQuestionPlaceLabel } from "@/lib/questions/places";
import { listPublishedQuestions } from "@/lib/questions/queries";
import { getMergedProductById } from "@/lib/knowledge-hub/product-catalog";
import {
  getContaminantById,
  getMaterialById,
} from "@/lib/knowledge-hub/cleaning-knowledge/get-knowledge";
import {
  clampReportListPage,
  parseReportListPage,
} from "@/lib/report/report-list-pagination";
import { buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

type Props = {
  searchParams: Promise<{
    product?: string;
    contaminant?: string;
    material?: string;
    place?: string;
    page?: string;
  }>;
};

function buildQuestionsPageHref(
  page: number,
  sp: {
    product?: string;
    contaminant?: string;
    material?: string;
    place?: string;
  },
): string {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (sp.product) params.set("product", sp.product);
  if (sp.contaminant) params.set("contaminant", sp.contaminant);
  if (sp.material) params.set("material", sp.material);
  if (sp.place) params.set("place", sp.place);
  const q = params.toString();
  return q ? `/questions?${q}` : "/questions";
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const hasFilter = Boolean(
    sp.product || sp.contaminant || sp.material || sp.place,
  );
  const meta = buildPageMetadata({
    title: "청소 질문",
    description: "제품·오염·재질·장소별 청소 질문과 답변.",
    path: "/questions",
  });
  if (hasFilter) {
    return { ...meta, robots: { index: false, follow: true } };
  }
  return meta;
}

export default async function QuestionsListPage({ searchParams }: Props) {
  const sp = await searchParams;
  const requested = parseReportListPage(sp.page);

  const first = await listPublishedQuestions({
    productId: sp.product,
    contaminantId: sp.contaminant,
    materialId: sp.material,
    placeId: sp.place,
    page: 1,
  });

  const page = clampReportListPage(
    requested,
    first.total,
    QUESTIONS_LIST_PAGE_SIZE,
  );

  const { items, total } =
    page === 1
      ? first
      : await listPublishedQuestions({
          productId: sp.product,
          contaminantId: sp.contaminant,
          materialId: sp.material,
          placeId: sp.place,
          page,
        });

  let filterLabel: string | null = null;
  if (sp.product) {
    const p = await getMergedProductById(sp.product);
    filterLabel = p ? `제품: ${p.name}` : `제품: ${sp.product}`;
  } else if (sp.contaminant) {
    const c = getContaminantById(sp.contaminant);
    filterLabel = c ? `오염: ${c.name}` : `오염: ${sp.contaminant}`;
  } else if (sp.material) {
    const m = getMaterialById(sp.material);
    filterLabel = m ? `재질: ${m.name}` : `재질: ${sp.material}`;
  } else if (sp.place) {
    filterLabel = `장소: ${getQuestionPlaceLabel(sp.place) ?? sp.place}`;
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
        <nav className="mb-6 text-sm font-medium text-slate-500">
          <Link href="/" className="hover:text-teal-700">
            홈
          </Link>
          <span className="mx-2">/</span>
          <span className="text-slate-800">청소 질문</span>
        </nav>

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
              청소 질문
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
              제품·오염·재질·장소에 대해 묻고 답합니다.
            </p>
          </div>
          <Link
            href={questionNewPath()}
            className="rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-teal-800"
          >
            질문하기
          </Link>
        </div>

        {filterLabel ? (
          <p className="mt-4 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700">
            필터 · {filterLabel}{" "}
            <Link href="/questions" className="ml-2 text-teal-800 hover:underline">
              해제
            </Link>
          </p>
        ) : null}

        <QuestionsBoardTable items={items} />

        <ReportListPagination
          page={page}
          totalCount={total}
          pageSize={QUESTIONS_LIST_PAGE_SIZE}
          buildHref={(p) => buildQuestionsPageHref(p, sp)}
        />
      </div>
    </main>
  );
}
