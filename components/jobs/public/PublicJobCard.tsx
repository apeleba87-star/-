import Link from "next/link";
import { formatClosingCardMeta } from "@/lib/jobs-public/format-closing";
import { publicJobRowMeta } from "@/lib/jobs-public/public-job-row-meta";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import type { PublicJobPayDisplayMode } from "@/lib/jobs-public/pay-display-mode";
import { cn } from "@/lib/utils";

type Props = {
  job: PublicJobOpeningListItem;
  large?: boolean;
  payMode?: PublicJobPayDisplayMode;
  /** 목록 줄무늬 안에 넣을 때 — 테두리·그림자 없음 */
  embedded?: boolean;
};

export default function PublicJobCard({
  job,
  large = false,
  payMode = "monthly",
  embedded = false,
}: Props) {
  const meta = publicJobRowMeta(job, { payMode });
  const metaLine = [
    formatClosingCardMeta(job.closing_at),
    job.career_label ? `경력 ${job.career_label}` : null,
    job.holiday_label,
  ]
    .filter(Boolean)
    .join(" · ");

  const linkClass = embedded
    ? "block p-4 transition-colors hover:bg-slate-100/50"
    : "block rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-colors hover:border-slate-300 hover:bg-slate-50/50";

  const content = (
    <Link href={meta.detailHref} className={linkClass}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className={cn("font-semibold text-slate-900 line-clamp-2", large ? "text-lg" : "text-base")}>
              {meta.title}
            </p>
            <p
              className={cn(
                "mt-1.5 font-extrabold tabular-nums text-blue-900",
                large ? "text-2xl sm:text-3xl" : "text-xl sm:text-2xl"
              )}
            >
              {meta.pay}
            </p>
            <p className={cn("mt-1.5 font-semibold text-slate-700", large ? "text-lg" : "text-base")}>
              {meta.region}
              <span className="mx-1.5 text-slate-300">·</span>
              {meta.preset}
            </p>
            {metaLine ? (
              <p className={cn("mt-1 text-slate-600", large ? "text-base" : "text-sm")}>{metaLine}</p>
            ) : null}
            {meta.company ? (
              <p className={cn("mt-0.5 text-slate-500", large ? "text-base" : "text-sm")}>{meta.company}</p>
            ) : null}
          </div>
          <span
            className={cn(
              "inline-flex shrink-0 min-h-[44px] items-center rounded-xl border-2 border-slate-200 bg-white px-4 font-semibold text-slate-800",
              large ? "text-base" : "text-sm"
            )}
          >
            {PUBLIC_JOBS_COPY.cardDetailCta}
          </span>
        </div>
    </Link>
  );

  return embedded ? content : <li>{content}</li>;
}
