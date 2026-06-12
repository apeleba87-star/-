import { Suspense } from "react";
import JobWageReportGuestLoginCta from "@/components/jobs/JobWageReportGuestLoginCta";

/** 비로그인 — 모바일 하단 고정 로그인 바 (입주레이더와 동일 패턴) */
export default function JobWageReportGuestLoginSticky() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-30 md:hidden">
      <Suspense fallback={null}>
        <JobWageReportGuestLoginCta />
      </Suspense>
    </div>
  );
}
