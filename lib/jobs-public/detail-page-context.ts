import { jobPublicDraftFromScope } from "@/lib/jobs-public/job-region-scope";
import { formatClosingCardMeta } from "@/lib/jobs-public/format-closing";
import { buildPublicJobsSharePath } from "@/lib/jobs-public/share-metadata";
import type { PublicJobOpeningListItem } from "@/lib/jobs-public/queries";
import { sortPublicJobList } from "@/lib/jobs-public/public-job-sort";

const MAN_WON = 10_000;

export type JobDetailPayInsight = {
  payBadges: string[];
};

export type JobDetailApplyGuideItem = {
  title: string;
  body: string;
};

function avgMonthly(jobs: PublicJobOpeningListItem[]): number | null {
  const vals = jobs
    .map((j) => j.pay_monthly_normalized)
    .filter((v): v is number => v != null && v > 0);
  if (vals.length === 0) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function buildJobDetailPayInsight(
  job: PublicJobOpeningListItem,
  regionalJobs: PublicJobOpeningListItem[],
  allJobs: PublicJobOpeningListItem[]
): JobDetailPayInsight | null {
  const monthly = job.pay_monthly_normalized;
  if (monthly == null || monthly <= 0) return null;

  const pool = sortPublicJobList(
    [...regionalJobs.filter((j) => j.pay_monthly_normalized != null && j.pay_monthly_normalized > 0), job],
    "pay"
  );
  const uniqueIds = new Set<string>();
  const ranked = pool.filter((j) => {
    if (uniqueIds.has(j.id)) return false;
    uniqueIds.add(j.id);
    return true;
  });
  const regionalCount = ranked.length;
  if (regionalCount === 0) return null;

  const rank = ranked.findIndex((j) => j.id === job.id) + 1;
  const regionalAvg = avgMonthly(regionalJobs);
  const nationalTop = sortPublicJobList(allJobs, "pay")[0]?.pay_monthly_normalized ?? null;

  const payBadges: string[] = [];

  if (regionalCount > 1) {
    payBadges.push(
      rank === 1
        ? `지역 1위 · ${regionalCount}건`
        : `지역 ${rank}위 · ${regionalCount}건`
    );
  }

  if (regionalAvg != null && regionalCount >= 3) {
    const diff = monthly - regionalAvg;
    const diffMan = Math.round(Math.abs(diff) / MAN_WON);
    if (Math.abs(diff) < MAN_WON * 5) {
      payBadges.push("지역 평균과 비슷");
    } else if (diff > 0) {
      payBadges.push(`지역 평균 +${diffMan.toLocaleString("ko-KR")}만`);
    } else {
      payBadges.push(`지역 평균 −${diffMan.toLocaleString("ko-KR")}만`);
    }
  }

  if (nationalTop != null && nationalTop > monthly) {
    const diffMan = Math.round((nationalTop - monthly) / MAN_WON);
    payBadges.push(`전국 최고 −${diffMan.toLocaleString("ko-KR")}만`);
  } else if (nationalTop != null && monthly >= nationalTop) {
    payBadges.push("전국 최고 수준");
  }

  if (payBadges.length === 0) return null;
  return { payBadges };
}

/** 헤더에 없는 보조 팁만 — 짧은 한 줄 */
export function buildJobDetailApplyGuide(
  job: {
    pay_min_won: number | null;
    pay_max_won: number | null;
  },
  opts: { hasPayRange: boolean }
): JobDetailApplyGuideItem[] {
  const items: JobDetailApplyGuideItem[] = [];

  if (opts.hasPayRange && job.pay_min_won != null && job.pay_max_won != null) {
    items.push({
      title: "급여",
      body: "직무마다 금액이 다를 수 있어요.",
    });
  }

  items.push({
    title: "상세·지원",
    body: "근무지·모집요강·지원은 고용24 원문에서 확인하세요.",
  });

  items.push({
    title: "마감",
    body: "채용시까지도 조기 마감될 수 있어요.",
  });

  return items;
}

export function buildJobDetailRegionListHref(
  sido: string | null,
  sigungu: string | null
): string | null {
  if (!sido) return null;
  const draft = jobPublicDraftFromScope({ sido, sigungu });
  if (!draft) return "/jobs/public";
  return buildPublicJobsSharePath(draft);
}

export function buildJobDetailFacts(job: {
  regionLabel: string;
  company: string | null;
  industry_name?: string | null;
  closing_at: string | null;
  holiday_label: string | null;
  career_label: string | null;
}): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [
    { label: "지역", value: job.regionLabel },
    { label: "마감", value: formatClosingCardMeta(job.closing_at) },
  ];
  if (job.company) facts.push({ label: "회사", value: job.company });
  if (job.holiday_label) facts.push({ label: "근무", value: job.holiday_label });
  if (job.career_label) facts.push({ label: "경력", value: job.career_label });
  if (job.industry_name) facts.push({ label: "업종", value: job.industry_name });
  return facts;
}
