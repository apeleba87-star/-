"use client";

import { Suspense } from "react";
import PublicJobRegionSection from "@/components/jobs/public/PublicJobRegionSection";
import PublicJobRegionUrlSync from "@/components/jobs/public/PublicJobRegionUrlSync";
import type { JobPublicRegionDraft } from "@/lib/jobs-public/job-region-scope";
import type { JobPublicRegionPreference } from "@/lib/jobs-public/region-preference-shared";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";

type Props = {
  currentSido: string;
  currentSigungu: string | null;
  jobCount: number;
  shareDraft: JobPublicRegionDraft;
  pref: JobPublicRegionPreference;
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
};

export default function PublicJobRegionWithShare(props: Props) {
  return (
    <>
      <Suspense fallback={null}>
        <PublicJobRegionUrlSync />
      </Suspense>
      <PublicJobRegionSection {...props} />
    </>
  );
}
