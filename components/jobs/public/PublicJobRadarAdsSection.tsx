"use client";

import PublicJobRadarNationalBanner from "@/components/jobs/public/PublicJobRadarNationalBanner";
import PublicJobRadarRegionalBanner from "@/components/jobs/public/PublicJobRadarRegionalBanner";
import { cn } from "@/lib/utils";

type Props = {
  regionKeys: string[];
  /** 전국 선택 시 지역 배너 숨김 */
  nationalScope?: boolean;
  className?: string;
};

/** 채용 목록 — 전국 기본 + 지역 선택 시 지역 배너 */
export default function PublicJobRadarAdsSection({
  regionKeys,
  nationalScope = false,
  className,
}: Props) {
  const showRegional = !nationalScope && regionKeys.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      <PublicJobRadarNationalBanner />
      {showRegional ? <PublicJobRadarRegionalBanner regionKeys={regionKeys} /> : null}
    </div>
  );
}
