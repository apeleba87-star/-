"use client";

import { Suspense } from "react";
import PublicJobRegionSection from "@/components/jobs/public/PublicJobRegionSection";
import PublicJobRegionUrlSync from "@/components/jobs/public/PublicJobRegionUrlSync";
type Props = {
  currentSido: string;
  currentSigungu: string | null;
  jobCount: number;
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
