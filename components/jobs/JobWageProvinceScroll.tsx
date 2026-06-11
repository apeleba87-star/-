"use client";

import { useEffect } from "react";
import { jobWageProvinceRowId } from "@/lib/jobs/job-wage-report-display";

type Props = {
  province: string | null;
};

/** 허브 `?province=` 딥링크 — 표 해당 행으로 스크롤 */
export default function JobWageProvinceScroll({ province }: Props) {
  useEffect(() => {
    if (!province) return;
    const el = document.getElementById(jobWageProvinceRowId(province));
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [province]);

  return null;
}
