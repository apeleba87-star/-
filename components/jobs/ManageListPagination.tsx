import Link from "next/link";
import { MANAGE_LIST_PAGE_SIZE } from "@/lib/jobs/manage-list-scope";

type Base = "/jobs/manage" | "/jobs/manage/archive";

type Props = {
  page: number;
  totalCount: number;
  basePath: Base;
  /** e.g. { scope: "all", view: "list" } — only non-empty values are appended */
  extra: Record<string, string | undefined>;
};

export default function ManageListPagination({ page, totalCount, basePath, extra }: Props) {
  const pageCount = totalCount === 0 ? 0 : Math.max(1, Math.ceil(totalCount / MANAGE_LIST_PAGE_SIZE));
  if (pageCount <= 1) return null;

  const buildHref = (p: number) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(extra)) {
      if (v) q.set(k, v);
    }
    if (p > 1) q.set("page", String(p));
    const s = q.toString();
    return s ? `${basePath}?${s}` : basePath;
  };

  const pageClamped = Math.min(Math.max(1, page), pageCount);

  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span>
        {(pageClamped - 1) * MANAGE_LIST_PAGE_SIZE + 1}–{Math.min(pageClamped * MANAGE_LIST_PAGE_SIZE, totalCount)} /{" "}
        {totalCount}건
      </span>
      <div className="flex items-center gap-2">
        <Link
          href={pageClamped <= 1 ? "#" : buildHref(pageClamped - 1)}
          className={pageClamped <= 1 ? "pointer-events-none text-slate-300" : "font-medium text-blue-600 hover:underline"}
          aria-disabled={pageClamped <= 1}
        >
          이전
        </Link>
        <span className="text-slate-500">
          {pageClamped} / {pageCount}
        </span>
        <Link
          href={pageClamped >= pageCount ? "#" : buildHref(pageClamped + 1)}
          className={
            pageClamped >= pageCount ? "pointer-events-none text-slate-300" : "font-medium text-blue-600 hover:underline"
          }
          aria-disabled={pageClamped >= pageCount}
        >
          다음
        </Link>
      </div>
    </div>
  );
}
