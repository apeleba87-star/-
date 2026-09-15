import Link from "next/link";
import { questionPath } from "@/lib/questions/constants";
import type { QuestionListItem } from "@/lib/questions/types";

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

type Props = {
  items: QuestionListItem[];
};

export default function QuestionsBoardTable({ items }: Props) {
  if (items.length === 0) {
    return (
      <p className="mt-10 text-sm text-slate-500">등록된 질문이 없습니다.</p>
    );
  }

  return (
    <ul className="mt-8 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {items.map((q) => {
        const answers = Number(q.answer_count ?? 0);
        const hasAnswers = answers > 0;
        const views = Number(q.view_count ?? 0).toLocaleString("ko-KR");
        const author = q.author_display_name?.trim() || "회원";

        return (
          <li key={q.id}>
            <Link
              href={questionPath(q.id, q.slug)}
              className="group flex items-center gap-3 px-4 py-3.5 transition hover:bg-slate-50/90 sm:gap-4 sm:px-5 sm:py-4"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-teal-800 sm:text-base">
                  <span className="mr-2 inline-block align-middle text-xs font-normal tabular-nums text-slate-400">
                    {q.id}
                  </span>
                  {q.title}
                </p>
                {q.primary_product_name ? (
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {q.primary_product_name}
                  </p>
                ) : null}
                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                  <span className="font-medium text-slate-600">{author}</span>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                  <span>{formatDate(q.created_at)}</span>
                  <span className="text-slate-300" aria-hidden>
                    ·
                  </span>
                  <span>조회 {views}</span>
                </p>
              </div>

              <div
                className={`flex h-[52px] w-[52px] shrink-0 flex-col items-center justify-center rounded-xl sm:h-[56px] sm:w-[56px] ${
                  hasAnswers
                    ? "bg-teal-50 text-teal-800"
                    : "bg-slate-50 text-slate-400"
                }`}
                aria-label={`답변 ${answers}`}
              >
                <span
                  className={`text-lg font-bold tabular-nums leading-none sm:text-xl ${
                    hasAnswers ? "text-teal-800" : "text-slate-500"
                  }`}
                >
                  {answers}
                </span>
                <span className="mt-1 text-[10px] font-medium leading-none tracking-tight">
                  답변
                </span>
              </div>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
