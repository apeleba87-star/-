import { JOB_OPEN_DATA_SOURCE_WORKNET_WANTED } from "@/lib/jobs-public-ingest/source-slugs";
import { textMatchesCleaningKeywords } from "./cleaning-keywords";
import { closingLabel, isOpeningOpen, parseWorknetDate } from "./closing-parse";
import { worknetMobileDetailUrl, worknetWebDetailUrl } from "./detail-url";
import { normalizeWorknetPay } from "./pay-normalize";
import { matchJobPreset } from "./preset-map";
import { parseWorkRegion } from "./region-parse";
import type { WorknetListItem } from "./types";

export type PublicJobOpeningUpsert = {
  source_slug: string;
  source_record_id: string;
  wanted_auth_no: string;
  title: string;
  company: string | null;
  industry_name: string | null;
  preset_key: string | null;
  preset_label: string | null;
  region_text: string | null;
  region_sido: string | null;
  region_sigungu: string | null;
  sal_tp_cd: string | null;
  sal_tp_nm: string | null;
  pay_min_won: number | null;
  pay_max_won: number | null;
  pay_monthly_normalized: number | null;
  pay_display: string;
  is_pay_negotiable: boolean;
  holiday_label: string | null;
  career_label: string | null;
  reg_at: string | null;
  closing_at: string | null;
  is_open: boolean;
  external_url: string;
  external_mobile_url: string | null;
  last_synced_at: string;
};

export function listItemMatchesCleaning(item: WorknetListItem, keywords: string[]): boolean {
  const blob = [item.title, item.indTpNm, item.company, item.region].filter(Boolean).join(" ");
  return textMatchesCleaningKeywords(blob, keywords);
}

export function normalizeWorknetListItem(
  item: WorknetListItem,
  keywords: string[],
  now = new Date()
): PublicJobOpeningUpsert | null {
  if (!item.wantedAuthNo?.trim()) return null;
  if (!listItemMatchesCleaning(item, keywords)) return null;

  const preset = matchJobPreset(item.title, item.indTpNm);
  const region = parseWorkRegion(item.region, {
    title: item.title,
    company: item.company,
  });
  const pay = normalizeWorknetPay({
    salTpNm: item.salTpNm,
    sal: item.sal,
    minSal: item.minSal,
    maxSal: item.maxSal,
    holidayTpNm: item.holidayTpNm,
    title: item.title,
  });
  const closingAt = parseWorknetDate(item.closeDt);
  const regAt = parseWorknetDate(item.regDt);
  const authNo = item.wantedAuthNo.trim();
  const webUrl =
    item.wantedInfoUrl?.trim() || worknetWebDetailUrl(authNo);
  const mobileUrl =
    item.wantedMobileInfoUrl?.trim() || worknetMobileDetailUrl(authNo);

  return {
    source_slug: JOB_OPEN_DATA_SOURCE_WORKNET_WANTED,
    source_record_id: authNo,
    wanted_auth_no: authNo,
    title: item.title.trim() || "채용공고",
    company: item.company.trim() || null,
    industry_name: item.indTpNm.trim() || null,
    preset_key: preset?.key ?? null,
    preset_label: preset?.label ?? null,
    region_text: region.regionText || null,
    region_sido: region.regionSido,
    region_sigungu: region.regionSigungu,
    sal_tp_cd: pay.salTpCd,
    sal_tp_nm: item.salTpNm.trim() || null,
    pay_min_won: pay.payMinWon,
    pay_max_won: pay.payMaxWon,
    pay_monthly_normalized: pay.payMonthlyNormalized,
    pay_display: pay.payDisplay,
    is_pay_negotiable: pay.isPayNegotiable,
    holiday_label: item.holidayTpNm.trim() || null,
    career_label: item.career.trim() || null,
    reg_at: regAt?.toISOString() ?? null,
    closing_at: closingAt?.toISOString() ?? null,
    is_open: isOpeningOpen(closingAt, now),
    external_url: webUrl,
    external_mobile_url: mobileUrl,
    last_synced_at: now.toISOString(),
  };
}

export { closingLabel };
