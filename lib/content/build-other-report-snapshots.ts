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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/** 마감 임박 실무 해석 2종 */
const DEADLINE_SOON_PRACTICAL_NOTES: ((count: number, over100: number, regionName?: string) => string)[] = [
  (count, over100, regionName) =>
    regionName
      ? `이번 주 마감 임박 공고는 등록 업종 기준 ${count}건이며, 1억 원 이상이 ${over100}건입니다. ${regionName} 등 해당 지역에 경험이 있는 업체는 실적·면허가 준비된 상태라면 즉시 검토할 가치가 높고, 미비한 경우 참여 가능 여부를 먼저 확인하시기 바랍니다.`
      : `이번 주 마감 임박 공고는 등록 업종 기준 ${count}건이며, 1억 원 이상이 ${over100}건입니다. 실적·면허가 준비된 업체라면 즉시 검토할 가치가 높은 주간입니다.`,
  (count, over100) =>
    `마감이 7일 이내인 공고가 ${count}건, 그중 1억 원 이상이 ${over100}건입니다. 마감 임박 건은 서류와 자격이 갖춰진 업체에 유리하므로, 참여를 검토 중이라면 지역·업종 필터로 본인에게 맞는 공고를 우선 확인하시기 바랍니다.`,
];

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
  const practical_note = pickRandom(DEADLINE_SOON_PRACTICAL_NOTES)(
    payload.count_total,
    payload.over_100m_count,
    topRegion?.name
  );
  return {
    report_type: REPORT_TYPE_DEADLINE_SOON,
    period_key: payload.period_key,
    title: `이번 주 마감 임박 청소·방역 공고 (D-7 이내)`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["마감임박", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `이번 주 마감 임박 청소·방역 공고 ${payload.count_total}건 (1억 원 이상 ${payload.over_100m_count}건). 자세한 내용은 리포트에서.`,
  };
}

/** 준비기간 짧은 공고 실무 해석 2종 */
const PREP_SHORT_PRACTICAL_NOTES: ((count: number, shortestDays?: number) => string)[] = [
  (count, shortestDays) =>
    shortestDays != null
      ? `준비기간 5일 이하 공고는 이번 주 ${count}건이며, 가장 짧은 경우 ${shortestDays}일입니다. 공고 등록부터 마감까지 기간이 짧으므로, 서류·실적·면허가 이미 갖춰진 업체가 유리하고, 미비한 업체는 참여 전 자격 요건을 반드시 확인하시기 바랍니다.`
      : `준비기간 5일 이하 공고는 이번 주 ${count}건입니다. 짧은 준비기간은 대응 체계가 있는 업체에 유리하므로, 서류·실적·면허 준비가 되어 있다면 우선 검토할 가치가 있습니다.`,
  (count) =>
    `이번 주 준비기간 5일 이하 공고는 ${count}건으로, 평균보다 빠른 대응이 요구됩니다. 기존 입찰 대응 인프라가 있는 업체는 신속히 검토하고, 자격·서류가 아직 미비한 경우 참여 가능 여부를 먼저 점검하시기 바랍니다.`,
];

export function buildPrepShortSnapshot(payload: PrepShortPayload): SnapshotOut | null {
  if (payload.count_total === 0) return null;
  const headline = `준비기간 5일 이하 공고는 ${payload.count_total}건으로, 평균보다 빠른 대응이 요구되는 주간이며 대응 체계가 있는 업체에 상대적으로 유리합니다.`;
  const key_metrics = [
    `5일 이하 ${payload.count_total}건`,
    "등록 업종 기준",
    payload.top_tenders[0]?.prep_days != null ? `가장 짧은 준비기간 ${payload.top_tenders[0].prep_days}일` : "준비기간 집계",
  ];
  const next_action = "준비기간 짧은 공고 목록에서 마감일 기준으로 우선순위를 정해 검토하세요.";
  const practical_note = pickRandom(PREP_SHORT_PRACTICAL_NOTES)(
    payload.count_total,
    payload.top_tenders[0]?.prep_days
  );
  return {
    report_type: REPORT_TYPE_PREP_SHORT,
    period_key: payload.period_key,
    title: `준비기간 5일 이하 청소·방역 공고 (이번 주)`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["준비기간짧음", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `준비기간 5일 이하 청소·방역 공고 ${payload.count_total}건. 빠른 대응 가능한 업체에 유리. 자세한 내용은 리포트에서.`,
  };
}

/** 대형 공고 TOP 실무 해석 2종 */
const LARGE_TENDER_TOP_PRACTICAL_NOTES: ((count: number, budgetLabel: string, avgLabel: string) => string)[] = [
  (count, budgetLabel, avgLabel) =>
    `기초금액 1억 원 이상 공고가 이번 주 ${count}건, 합계 ${budgetLabel}${avgLabel !== "—" ? `, 건당 평균 ${avgLabel}` : ""}입니다. 대형 공고는 제한경쟁·면허 제한 비중이 높은 경우가 많아, 등록 업종과 실적이 갖춰진 중대형 업체가 우선 검토하고, 지역·기관 유형을 고려해 참여 여부를 판단하시기 바랍니다.`,
  (count, budgetLabel) =>
    `이번 주 1억 원 이상 공고는 ${count}건, 총 규모 ${budgetLabel}입니다. 고액 건은 자격·등록 요건이 엄격할 수 있으므로, 참여를 검토할 때 등록 업종·실적·면허를 먼저 확인하고, 본인 지역·역량에 맞는 공고를 선별해 상세를 검토하시면 됩니다.`,
];

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
  const practical_note = pickRandom(LARGE_TENDER_TOP_PRACTICAL_NOTES)(
    payload.count_total,
    payload.budget_label,
    avgLabel
  );
  return {
    report_type: REPORT_TYPE_LARGE_TENDER_TOP,
    period_key: payload.period_key,
    title: `기초금액 1억 원 이상 대형 공고 TOP 10 (${payload.period_label})`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["대형공고", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `이번 주 1억 원 이상 청소·방역 공고 ${payload.count_total}건, 합계 ${payload.budget_label}. 자세한 내용은 리포트에서.`,
  };
}

/** 개찰 예정 리포트 실무 해석 2종 */
const OPENING_SCHEDULED_PRACTICAL_NOTES: ((count: number) => string)[] = [
  (count) =>
    `이번 주 개찰이 예정된 청소·방역 공고는 등록 업종 기준 ${count}건입니다. 개찰은 입찰에 참여한 업체의 제출물이 공개되는 단계이므로, 참여한 공고가 있다면 개찰일시를 확인해 당일 일정을 조정하시고, 미참여 업체는 이번 주 마감 공고와 다음 개찰 예정 건을 함께 검토하시면 됩니다.`,
  (count) =>
    `이번 주 개찰 예정 공고는 ${count}건입니다. 개찰 일정이 잡힌 공고는 이미 입찰이 마감된 상태이므로, 참여하신 업체는 개찰일·장소를 확인하고 제출 서류를 점검해 두시기 바랍니다. 아직 참여하지 않은 업체는 이번 주 마감 임박 공고를 우선 검토하시면 실무에 도움이 됩니다.`,
];

export function buildOpeningScheduledSnapshot(payload: OpeningScheduledPayload): SnapshotOut | null {
  if (payload.count_total === 0) return null;
  const headline = `이번 주 개찰 예정 공고는 ${payload.count_total}건이며, 이미 참여한 공고가 있다면 개찰 일정을 확인하고 미참여 업체는 다음 주 마감 공고를 검토하세요.`;
  const key_metrics = [
    `개찰 예정 ${payload.count_total}건`,
    "등록 업종 기준",
    "이번 주 개찰 일정",
  ];
  const next_action = "개찰 예정 목록과 이번 주 마감 공고를 함께 확인하세요.";
  const practical_note = pickRandom(OPENING_SCHEDULED_PRACTICAL_NOTES)(payload.count_total);
  return {
    report_type: REPORT_TYPE_OPENING_SCHEDULED,
    period_key: payload.period_key,
    title: `이번 주 개찰 예정 청소·방역 공고`,
    content_full: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action, tags: ["개찰예정", "등록업종기준"] },
    content_summary: { headline, key_metrics, top3: payload.top_tenders, practical_note, next_action },
    content_social: `이번 주 개찰 예정 청소·방역 공고 ${payload.count_total}건. 자세한 내용은 리포트에서.`,
  };
}
