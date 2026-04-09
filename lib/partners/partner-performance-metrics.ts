export type PartnerPerformanceEventRow = {
  company_id: string;
  event_type: "detail_view" | "contact_click";
  created_at: string;
};

export type PartnerPerformanceMetrics = {
  detail7: number;
  detail30: number;
  contact7: number;
  contact30: number;
};

export function calcPartnerPerformanceMetrics(events: PartnerPerformanceEventRow[]): PartnerPerformanceMetrics {
  const now = Date.now();
  const ms7 = 7 * 24 * 60 * 60 * 1000;
  const ms30 = 30 * 24 * 60 * 60 * 1000;
  const out: PartnerPerformanceMetrics = { detail7: 0, detail30: 0, contact7: 0, contact30: 0 };
  for (const e of events) {
    const diff = now - new Date(e.created_at).getTime();
    if (e.event_type === "detail_view") {
      if (diff <= ms7) out.detail7 += 1;
      if (diff <= ms30) out.detail30 += 1;
    } else {
      if (diff <= ms7) out.contact7 += 1;
      if (diff <= ms30) out.contact30 += 1;
    }
  }
  return out;
}

export function partnerInquiryConversionPercent(numerator: number, denominator: number): string {
  if (!denominator) return "0.0%";
  return `${((numerator / denominator) * 100).toFixed(1)}%`;
}
