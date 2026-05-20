import Link from "next/link";
import PublicJobCard from "@/components/jobs/public/PublicJobCard";
import PublicJobRegionPicker from "@/components/jobs/public/PublicJobRegionPicker";
import PublicJobSpotlightSection from "@/components/jobs/public/PublicJobSpotlightSection";
import Work24Attribution from "@/components/jobs/public/Work24Attribution";
import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";
import { getJobPublicRegionPreference } from "@/lib/jobs-public/region-preference";
import {
  fetchPublicJobList,
  fetchSpotlightSnapshot,
  filterLocalJobs,
  formatSyncedAt,
} from "@/lib/jobs-public/queries";
import { createClient } from "@/lib/supabase-server";

export const revalidate = 300;

export const metadata = {
  title: "청소·용역 채용 | 클린아이덱스",
  description: "고용24 워크넷 청소·용역 채용정보 — 우리 지역과 급여 높은 곳을 한눈에",
};

export default async function PublicJobsPage() {
  const supabase = createClient();
  const pref = await getJobPublicRegionPreference();
  const [snapshot, allJobs] = await Promise.all([
    fetchSpotlightSnapshot(supabase, pref.scopeKey),
    fetchPublicJobList(supabase, { limit: 80, orderByPay: true }),
  ]);

  const scopedJobs = filterLocalJobs(allJobs, pref);
  const localJobs = scopedJobs.slice(0, 15);
  const payJobs = (scopedJobs.length > 0 ? scopedJobs : allJobs).slice(0, 15);
  const syncedAt = snapshot?.computed_at ?? allJobs[0]?.last_synced_at ?? null;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 pb-16">
      <header>
        <h1 className="text-3xl font-bold text-slate-900">{PUBLIC_JOBS_COPY.pageTitle}</h1>
        <p className="mt-3 text-lg leading-relaxed text-slate-700">{PUBLIC_JOBS_COPY.pageLead}</p>
        <div className="mt-5">
          <PublicJobRegionPicker
            currentLabel={pref.label}
            currentSido={pref.sido}
            currentSigungu={pref.sigungu}
          />
        </div>
        <p className="mt-3 text-base text-slate-500">
          {PUBLIC_JOBS_COPY.syncedPrefix} · {formatSyncedAt(syncedAt)}
        </p>
      </header>

      <div className="mt-8">
        <PublicJobSpotlightSection snapshot={snapshot} />
      </div>

      <section className="mt-10" aria-labelledby="feed-local">
        <h2 id="feed-local" className="text-2xl font-bold text-slate-900">
          {PUBLIC_JOBS_COPY.feedLocalTitle}
        </h2>
        {localJobs.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {localJobs.map((job) => (
              <PublicJobCard key={job.id} job={job} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-lg text-slate-600">{PUBLIC_JOBS_COPY.feedEmpty}</p>
        )}
      </section>

      <section className="mt-10" aria-labelledby="feed-pay">
        <h2 id="feed-pay" className="text-2xl font-bold text-slate-900">
          {PUBLIC_JOBS_COPY.feedPayTitle}
        </h2>
        <p className="mt-1 text-base text-slate-500">{PUBLIC_JOBS_COPY.paySortNote}</p>
        {payJobs.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {payJobs.map((job) => (
              <PublicJobCard key={`pay-${job.id}`} job={job} />
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-lg text-slate-600">{PUBLIC_JOBS_COPY.feedEmpty}</p>
        )}
      </section>

      <p className="mt-8 text-center">
        <Link href="/jobs" className="text-lg font-semibold text-blue-800 underline">
          {PUBLIC_JOBS_COPY.platformJobsLink}
        </Link>
      </p>

      <Work24Attribution />
    </main>
  );
}
