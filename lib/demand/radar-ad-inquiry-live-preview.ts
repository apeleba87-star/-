import type { RadarAdInquirySurface } from "@/lib/demand/radar-ad-inquiry-placements";

export type RadarAdInquiryPreviewContext = {
  sampleJobId: string | null;
  jobWageReportDate: string | null;
};

export type RadarAdInquiryLivePreview = {
  href: string;
  scrollToY?: number;
  height: number;
};

export function resolveRadarAdInquiryLivePreview(
  surface: RadarAdInquirySurface,
  ctx: RadarAdInquiryPreviewContext
): RadarAdInquiryLivePreview {
  switch (surface.id) {
    case "demand":
      return {
        href: "/?r=seoul:jongno-gu",
        scrollToY: 520,
        height: 920,
      };
    case "jobs_public_list":
      return {
        href: "/jobs/public?cityId=seoul&guSlug=jongno-gu",
        height: 880,
      };
    case "jobs_public_detail":
      if (ctx.sampleJobId) {
        return {
          href: `/jobs/public/${encodeURIComponent(ctx.sampleJobId)}`,
          scrollToY: 280,
          height: 920,
        };
      }
      return {
        href: "/jobs/public?cityId=seoul&guSlug=jongno-gu",
        height: 880,
      };
    case "job_wage": {
      const date = ctx.jobWageReportDate;
      return {
        href: date ? `/job-market-report/${date}` : "/job-market-report",
        scrollToY: 320,
        height: 800,
      };
    }
    default:
      return { href: surface.previewHref, height: 800 };
  }
}
