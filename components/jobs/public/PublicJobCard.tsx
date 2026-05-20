import Link from "next/link";
import { closingLabel } from "@/lib/jobs-public-ingest/worknet/normalize-row";
import { parseWorkRegion } from "@/lib/jobs-public-ingest/worknet/region-parse";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

type Props = {
  job: PublicJobOpeningListItem;
};

export default function PublicJobCard({ job }: Props) {
  const region = parseWorkRegion(job.region_text ?? "", {
    title: job.title,
    company: job.company,
  }).regionLabel;
  const closing = closingLabel(job.closing_at ? new Date(job.closing_at) : null);
  const preset = job.preset_label ?? "청소·용역";

  return (
    <li>
      <Link
        href={`/jobs/public/${job.id}`}
        className="block rounded-2xl border-2 border-slate-200 bg-white p-5 transition-colors hover:border-slate-400"
      >
        <p className="text-base font-medium text-slate-600">{preset}</p>
        <h3 className="mt-1 text-xl font-bold leading-snug text-slate-900">{job.title}</h3>
        <p className="mt-3 text-2xl font-extrabold text-blue-900">
          {job.pay_display || PUBLIC_JOBS_COPY.payNegotiable}
        </p>
        <p className="mt-2 text-lg text-slate-700">
          📍 {region}
          {job.company ? ` · ${job.company}` : ""}
        </p>
        <p className="mt-1 text-base text-slate-600">
          {job.holiday_label ? `${job.holiday_label} · ` : ""}
          {job.career_label ? `경력 ${job.career_label} · ` : ""}
          {closing}
        </p>
      </Link>
    </li>
  );
}
