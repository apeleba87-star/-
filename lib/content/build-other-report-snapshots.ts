/**
 * 마감 임박 / 준비기간 짧은 공고 / 대형 공고 TOP / 개찰 예정 리포트 스냅샷 빌더.
 */

import type { DeadlineSoonPayload, PrepShortPayload, LargeTenderTopPayload, OpeningScheduledPayload } from "./tender-report-queries";
import {
  REPORT_TYPE_DEADLINE_SOON,
  REPORT_TYPE_PREP_SHORT,
  REPORT_TYPE_LARGE_TENDER_TOP,
  REPORT_TYPE_OPENING_SCHEDULED,
} from "./report-snapshot-types";
import type { ReportContentBlock } from "./report-snapshot-types";

type SnapshotOut = {
  report_type: string;
  period_key: string;
  title: string;
  content_full: ReportContentBlock & Record<string, unknown>;
  content_summary: ReportContentBlock;
  content_social: string;
};

export function buildDeadlineSoonSnapshot(payload: DeadlineSoonPayload): SnapshotOut | null {
  if (payload.count_total === 0) return null;
  const topRegion = payload.region_breakdown[0];
  const headline = `이번 주 마감 임박 공고 ${payload.count_total}건 중 1억 원 이상은 ${payload.over_100m_count}건이며, ${topRegion ? `${topRegion.name} 등 지역에 편중되어 해당 경험 업체는 우선 검토가 필요합니다.` : "해당 경험 업체는 우선 검토가 필요합니다."}`;
  const key_metrics = [
    `마감 임박 ${payload.count_total}건`,
    `1억 원 이상 ${payload.over_100m_count}건`,
    topRegion ? `${topRegion.name} ${topRegion.count}건` : "지역 집계",
  ];
  const next_action = "마감 임박 목록에서 지역·업종 필터로 본인에게 맞는 공고를 골라 검토하세요.";
  const practical_note = "실적·면허가 준비된 업체라면 즉시 검토할 가치가 높은 주간입니다.";
  return {
    report_type: REPORT_TYPE_DEADLINE_SOON,
    period_key: payload.period_key,
    title: `이번 주 마감 임박 청소·방역 공고 (D-7 이내)`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["마감임박", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `이번 주 마감 임박 청소·방역 공고 ${payload.count_total}건 (1억 원 이상 ${payload.over_100m_count}건). 자세한 내용은 리포트에서.`,
  };
}

export function buildPrepShortSnapshot(payload: PrepShortPayload): SnapshotOut | null {
  if (payload.count_total === 0) return null;
  const headline = `준비기간 5일 이하 공고는 ${payload.count_total}건으로, 평균보다 빠른 대응이 요구되는 주간이며 대응 체계가 있는 업체에 상대적으로 유리합니다.`;
  const key_metrics = [
    `5일 이하 ${payload.count_total}건`,
    "등록 업종 기준",
    payload.top_tenders[0]?.prep_days != null ? `가장 짧은 준비기간 ${payload.top_tenders[0].prep_days}일` : "준비기간 집계",
  ];
  const next_action = "준비기간 짧은 공고 목록에서 마감일 기준으로 우선순위를 정해 검토하세요.";
  const practical_note = "준비기간이 짧은 공고는 기존 서류·실적·면허 준비가 되어 있는 업체에게 유리합니다.";
  return {
    report_type: REPORT_TYPE_PREP_SHORT,
    period_key: payload.period_key,
    title: `준비기간 5일 이하 청소·방역 공고 (이번 주)`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["준비기간짧음", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `준비기간 5일 이하 청소·방역 공고 ${payload.count_total}건. 빠른 대응 가능한 업체에 유리. 자세한 내용은 리포트에서.`,
  };
}

export function buildLargeTenderTopSnapshot(payload: LargeTenderTopPayload): SnapshotOut | null {
  if (payload.count_total === 0) return null;
  const headline = `기초금액 1억 원 이상 공고가 이번 주 ${payload.count_total}건으로, 합계 ${payload.budget_label}이며 중대형 업체가 우선 검토할 만한 기회가 많았습니다.`;
  const avgLabel = payload.count_total > 0 && payload.budget_sum > 0
    ? `${Math.round(payload.budget_sum / payload.count_total / 10_000).toLocaleString()}만 원/건`
    : "—";
  const key_metrics = [
    `1억 원 이상 ${payload.count_total}건`,
    `합계 ${payload.budget_label}`,
    `평균 ${avgLabel}`,
  ];
  const next_action = "대형 공고 TOP 10 목록에서 본인 지역·업종에 맞는 공고를 골라 상세를 확인하세요.";
  const practical_note = "대형 공고는 제한경쟁·면허 제한 비중이 높을 수 있어, 등록·실적이 갖춰진 업체가 유리합니다.";
  return {
    report_type: REPORT_TYPE_LARGE_TENDER_TOP,
    period_key: payload.period_key,
    title: `기초금액 1억 원 이상 대형 공고 TOP 10 (${payload.period_label})`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["대형공고", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `이번 주 1억 원 이상 청소·방역 공고 ${payload.count_total}건, 합계 ${payload.budget_label}. 자세한 내용은 리포트에서.`,
  };
}

export function buildOpeningScheduledSnapshot(payload: OpeningScheduledPayload): SnapshotOut | null {
  if (payload.count_total === 0) return null;
  const headline = `이번 주 개찰 예정 공고는 ${payload.count_total}건이며, 이미 참여한 공고가 있다면 개찰 일정을 확인하고 미참여 업체는 다음 주 마감 공고를 검토하세요.`;
  const key_metrics = [
    `개찰 예정 ${payload.count_total}건`,
    "등록 업종 기준",
    "이번 주 개찰 일정",
  ];
  const next_action = "개찰 예정 목록과 이번 주 마감 공고를 함께 확인하세요.";
  const practical_note = "이미 참여한 공고가 있다면 개찰 일정을 확인하고, 미참여 업체는 다음 주 마감 공고를 검토하세요.";
  return {
    report_type: REPORT_TYPE_OPENING_SCHEDULED,
    period_key: payload.period_key,
    title: `이번 주 개찰 예정 청소·방역 공고`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["개찰예정", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `이번 주 개찰 예정 청소·방역 공고 ${payload.count_total}건. 자세한 내용은 리포트에서.`,
  };
}
