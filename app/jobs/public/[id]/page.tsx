import Link from "next/link";
import { notFound } from "next/navigation";
import Work24Attribution from "@/components/jobs/public/Work24Attribution";
import { closingLabel } from "@/lib/jobs-public-ingest/worknet/normalize-row";
import { parseWorkRegion } from "@/lib/jobs-public-ingest/worknet/region-parse";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { fetchPublicJobByAuthNo } from "@/lib/jobs-public/queries";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 300;

type Props = { params: Promise<{ id: string }> };

async function loadOpening(id: string) {
  const supabase = createClient();
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid) {
    const { data } = await supabase
      .from("public_job_openings")
      .select("*")
      .eq("id", id)
      .eq("is_open", true)
      .maybeSingle();
    return data;
  }
  return fetchPublicJobByAuthNo(supabase, id);
}

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const row = await loadOpening(id);
  return {
    title: row?.title ? `${row.title} | 채용 공고` : "채용 공고",
  };
}

export default async function PublicJobDetailPage({ params }: Props) {
  const { id } = await params;
  const job = await loadOpening(id);
  if (!job) notFound();

  const region = parseWorkRegion(job.region_text ?? "", {
    title: job.title as string,
    company: job.company as string | null,
  }).regionLabel;
  const closing = closingLabel(job.closing_at ? new Date(job.closing_at) : null);
  const externalUrl = (job.external_url as string)?.trim();
  const payMin = job.pay_min_won != null ? Number(job.pay_min_won) : null;
  const payMax = job.pay_max_won != null ? Number(job.pay_max_won) : null;
  const hasPayRange =
    payMin != null &&
    payMax != null &&
    payMax - payMin >= 100_000;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-16">
      <Link
        href="/jobs/public"
        className="text-lg font-medium text-blue-800 underline"
      >
        ← 목록으로
      </Link>

      <header className="mt-6 rounded-2xl border-2 border-slate-200 bg-white p-6">
        <p className="text-base font-medium text-slate-600">
          {job.preset_label ?? "청소·용역"}
        </p>
        <h1 className="mt-2 text-2xl font-bold leading-snug text-slate-900">{job.title}</h1>
        <p className="mt-4 text-3xl font-extrabold text-blue-900">
          {job.pay_display || PUBLIC_JOBS_COPY.payNegotiable}
        </p>
        {job.sal_tp_nm && job.pay_display && !job.pay_display.includes(job.sal_tp_nm) ? (
          <p className="mt-1 text-base text-slate-500">고용24 임금형태: {job.sal_tp_nm}</p>
        ) : null}
        {hasPayRange ? (
          <p className="mt-2 text-base leading-relaxed text-slate-600">
            이 공고는 모집 직무마다 급여가 다릅니다. (예: 7시간 근무와 8시간 근무). 자세한 금액은 아래
            「채용정보 제공사이트로 이동」에서 확인하세요.
          </p>
        ) : null}
        <ul className="mt-4 space-y-2 text-lg text-slate-800">
          <li>📍 {region}</li>
          {job.company ? <li>🏢 {job.company}</li> : null}
          <li>📅 {closing}</li>
          {job.holiday_label ? <li>근무형태: {job.holiday_label}</li> : null}
          {job.career_label ? <li>경력: {job.career_label}</li> : null}
        </ul>
      </header>

      {externalUrl ? (
        <div className="mt-8">
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-[56px] w-full items-center justify-center rounded-2xl bg-blue-800 px-6 text-xl font-bold text-white"
          >
            {PUBLIC_JOBS_COPY.externalCta}
          </a>
          <p className="mt-2 text-center text-base text-slate-600">
            {PUBLIC_JOBS_COPY.externalCtaSub}
          </p>
        </div>
      ) : null}

      <p className="mt-6 text-base text-slate-600">{PUBLIC_JOBS_COPY.sourceNote}</p>

      <Work24Attribution />
    </main>
  );
}
