"use client";

import { useSearchParams } from "next/navigation";
import { useMemo } from "react";
import PublicJobFeed from "@/components/jobs/public/PublicJobFeed";
import PublicJobPagination from "@/components/jobs/public/PublicJobPagination";
import PublicJobSortChips from "@/components/jobs/public/PublicJobSortChips";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import {
  clampPublicJobPage,
  parsePublicJobPage,
  slicePublicJobPage,
} from "@/lib/jobs-public/public-job-pagination";
import {
  parsePublicJobSort,
  sortPublicJobList,
} from "@/lib/jobs-public/public-job-sort";

type Props = {
  jobs: PublicJobOpeningListItem[];
  fallbackJobs?: PublicJobOpeningListItem[];
  jobCount: number;
};

export default function PublicJobsFeedSection({
  jobs,
  fallbackJobs = [],
  jobCount,
}: Props) {
  const searchParams = useSearchParams();
  const sort = parsePublicJobSort(searchParams?.get("sort"));

  const sortedJobs = useMemo(
    () => sortPublicJobList(jobs, sort),
    [jobs, sort]
  );

  const page = useMemo(
    () => clampPublicJobPage(parsePublicJobPage(searchParams?.get("page")), sortedJobs.length),
    [searchParams, sortedJobs.length]
  );

  const pageJobs = useMemo(
    () => slicePublicJobPage(sortedJobs, page),
    [sortedJobs, page]
  );

  return (
    <>
      <PublicJobSortChips currentSort={sort} jobCount={jobCount} />
      <PublicJobFeed
        jobs={pageJobs}
        fallbackJobs={fallbackJobs}
        showEmpty={sortedJobs.length === 0}
      />
      {sortedJobs.length > 0 ? (
        <PublicJobPagination page={page} totalCount={sortedJobs.length} />
      ) : null}
    </>
  );
}
