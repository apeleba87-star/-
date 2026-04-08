import { getKstDateString } from "@/lib/content/kst-utils";
import { getReportTypeLabel } from "@/lib/content/report-snapshot-types";

function isDailyTenderPost(post: { source_type?: string | null; slug?: string | null }): boolean {
  if (post.source_type === "auto_tender_daily") return true;
  const slug = typeof post.slug === "string" ? post.slug : "";
  return slug.includes("daily-tender-digest");
}

/** 카드 배지 짧은 라벨 (뉴스 목록·관련 리포트) */
export function getReportBadgeLabel(post: {
  source_type?: string | null;
  slug?: string | null;
}): string {
  if (isDailyTenderPost(post)) return "입찰 리포트";
  if (post.source_type === "award_market_intel") return "낙찰 리포트";
  if (post.source_type) return getReportTypeLabel(post.source_type);
  return "리포트";
}

function formatDailyLabel(sourceRef: string | null): string {
  if (!sourceRef || !/^\d{4}-\d{2}-\d{2}$/.test(sourceRef)) return "입찰 리포트";
  const [, m, d] = sourceRef.split("-").map(Number);
  return `${m}월 ${d}일 리포트`;
}

/** 뉴스 목록·관련 리포트 카드용 표시 제목 (posts.title과 별도) */
export function getReportCardListTitle(post: {
  title: string;
  source_type?: string | null;
  source_ref?: string | null;
  slug?: string | null;
}): string {
  const sourceType = post.source_type ?? null;
  const sourceRef = post.source_ref ?? null;
  const slug = post.slug ?? "";
  const isDaily = sourceType === "auto_tender_daily" || slug.includes("daily-tender-digest");
  const todayKst = getKstDateString();

  if (isDaily) {
    const isToday = sourceRef === todayKst;
    return isToday ? "오늘 청소 입찰 리포트" : formatDailyLabel(sourceRef);
  }

  if (sourceType === "award_market_intel" && sourceRef && /^\d{4}-\d{2}-\d{2}$/.test(sourceRef)) {
    const [, m, d] = sourceRef.split("-").map(Number);
    return `${m}월 ${d}일 낙찰 리포트`;
  }

  if (sourceType && sourceType !== "auto_tender_daily") {
    const label = getReportTypeLabel(sourceType);
    if (label && label !== "리포트") return label;
  }

  return post.title;
}
