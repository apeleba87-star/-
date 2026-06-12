import PublicJobRegionPicker from "@/components/jobs/public/PublicJobRegionPicker";
import PublicJobShareButton from "@/components/jobs/public/PublicJobShareButton";
import type { JobPublicRegionDraft } from "@/lib/jobs-public/job-region-scope";
import type { JobPublicRegionPreference } from "@/lib/jobs-public/region-preference-shared";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import { Suspense } from "react";

type Props = {
  currentSido: string;
  currentSigungu: string | null;
  jobCount: number;
  shareDraft: JobPublicRegionDraft;
  pref: JobPublicRegionPreference;
  localPay: PublicJobOpeningListItem | null;
  nationalPay: PublicJobOpeningListItem | null;
};

function ShareFallback() {
  return (
    <div className="h-12 w-full max-w-xs animate-pulse rounded-xl bg-slate-100 sm:w-48" aria-hidden />
  );
}

export default function PublicJobRegionSection({
  currentSido,
  currentSigungu,
  jobCount,
  shareDraft,
  pref,
  localPay,
  nationalPay,
}: Props) {
  return (
    <div className="space-y-3">
      <PublicJobRegionPicker
        currentSido={currentSido}
        currentSigungu={currentSigungu}
        jobCount={jobCount}
      />
      <Suspense fallback={<ShareFallback />}>
        <PublicJobShareButton
          draft={shareDraft}
          pref={pref}
          localPay={localPay}
          nationalPay={nationalPay}
          localCount={jobCount}
          className="w-full sm:w-auto"
        />
      </Suspense>
    </div>
  );
}
