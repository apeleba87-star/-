import Link from "next/link";
import {
  getReportListPageItems,
  REPORT_LIST_PAGE_SIZE,
  reportListPageCount,
} from "@/lib/report/report-list-pagination";

type Props = {
  page: number;
  totalCount: number;
  buildHref: (page: number) => string;
  pageSize?: number;
  /** 한 번에 보여 줄 페이지 번호 개수 (기본 10) */
  maxVisiblePages?: number;
};

const pageNumClass =
  "inline-flex min-h-9 min-w-9 items-center justify-center px-1.5 text-sm font-medium tabular-nums";

export default function ReportListPagination({
  page,
  totalCount,
  buildHref,
  pageSize = REPORT_LIST_PAGE_SIZE,
  maxVisiblePages = 10,
}: Props) {
  const pageCount = reportListPageCount(totalCount, pageSize);
  if (pageCount <= 1) return null;

  const pageClamped = Math.min(Math.max(1, page), pageCount);
  const sliceStart = (pageClamped - 1) * pageSize;
  const pageItems = getReportListPageItems(pageClamped, pageCount, maxVisiblePages);

  const edgeLink =
    "text-sm text-slate-600 hover:text-teal-700 hover:underline disabled:pointer-events-none disabled:text-slate-300 disabled:no-underline";

  return (
    <nav
      className="mx-auto mt-8 max-w-3xl rounded-xl border border-slate-200/90 bg-white px-3 py-4 shadow-sm sm:px-4"
      aria-label="리포트 목록 페이지"
    >
      <div className="flex flex-col items-center gap-3">
        <div className="flex flex-wrap items-center justify-center gap-x-1 gap-y-2">
          {pageClamped > 1 ? (
            <Link href={buildHref(1)} className={`${edgeLink} px-2`}>
              처음
            </Link>
          ) : (
            <span className={`${edgeLink} cursor-default px-2`}>처음</span>
          )}
          {pageClamped > 1 ? (
            <Link href={buildHref(pageClamped - 1)} className={`${edgeLink} px-2`}>
              이전
            </Link>
          ) : (
            <span className={`${edgeLink} cursor-default px-2`}>이전</span>
          )}

          <ol className="mx-1 flex list-none flex-wrap items-center justify-center gap-0.5 p-0">
            {pageItems.map((item, idx) =>
              item === "ellipsis" ? (
                <li key={`ellipsis-${idx}`} className={`${pageNumClass} text-slate-400`} aria-hidden>
                  …
                </li>
              ) : item === pageClamped ? (
                <li key={item}>
                  <span
                    className={`${pageNumClass} rounded border border-teal-600 bg-teal-600 font-bold text-white`}
                    aria-current="page"
                  >
                    {item}
                  </span>
                </li>
              ) : (
                <li key={item}>
                  <Link
                    href={buildHref(item)}
                    className={`${pageNumClass} rounded text-slate-700 hover:bg-slate-100 hover:text-teal-800`}
                  >
                    {item}
                  </Link>
                </li>
              ),
            )}
          </ol>

          {pageClamped < pageCount ? (
            <Link href={buildHref(pageClamped + 1)} className={`${edgeLink} px-2`}>
              다음
            </Link>
          ) : (
            <span className={`${edgeLink} cursor-default px-2`}>다음</span>
          )}
          {pageClamped < pageCount ? (
            <Link href={buildHref(pageCount)} className={`${edgeLink} px-2`}>
              마지막
            </Link>
          ) : (
            <span className={`${edgeLink} cursor-default px-2`}>마지막</span>
          )}
        </div>

        <p className="text-xs text-slate-500 tabular-nums">
          {sliceStart + 1}–{Math.min(sliceStart + pageSize, totalCount)} / 전체 {totalCount.toLocaleString("ko-KR")}건
        </p>
      </div>
    </nav>
  );
}
