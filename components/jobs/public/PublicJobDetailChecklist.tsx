import type { JobDetailApplyGuideItem } from "@/lib/jobs-public/detail-page-context";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { ChevronDown } from "lucide-react";

type Props = {
  items: JobDetailApplyGuideItem[];
};

/** 접어 두었다가 펼치는 짧은 확인 목록 */
export default function PublicJobDetailChecklist({ items }: Props) {
  if (items.length === 0) return null;

  return (
    <details className="group mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <summary className="flex min-h-[52px] cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="text-base font-semibold text-slate-900">
          {PUBLIC_JOBS_COPY.detailApplyGuideTitle}
        </span>
        <ChevronDown
          className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180"
          aria-hidden
        />
      </summary>
      <ul className="space-y-2 border-t border-slate-100 px-4 py-3">
        {items.map((item) => (
          <li key={item.title} className="flex gap-2.5 text-sm leading-relaxed text-slate-700">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden />
            <span>
              <span className="font-semibold text-slate-900">{item.title}</span>
              {item.body ? <span className="text-slate-600"> · {item.body}</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}
