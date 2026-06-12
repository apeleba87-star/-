"use client";

import PublicJobFeed from "@/components/jobs/public/PublicJobFeed";
import PublicJobPagination from "@/components/jobs/public/PublicJobPagination";
import PublicJobSortChips from "@/components/jobs/public/PublicJobSortChips";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import type { PublicJobSort } from "@/lib/jobs-public/public-job-sort";

type Props = {
  jobs: PublicJobOpeningListItem[];
  fallbackJobs?: PublicJobOpeningListItem[];
  jobCount: number;
  page: number;
  totalCount: number;
  sort: PublicJobSort;
};

export default function PublicJobsFeedSection({
  jobs,
  fallbackJobs = [],
  jobCount,
  page,
  totalCount,
  sort,
}: Props) {
  return (
    <>
      <PublicJobSortChips currentSort={sort} jobCount={jobCount} />
      <PublicJobFeed
        jobs={jobs}
        fallbackJobs={fallbackJobs}
        showEmpty={totalCount === 0}
      />
      {totalCount > 0 ? (
        <PublicJobPagination page={page} totalCount={totalCount} />
      ) : null}
    </>
  );
}
