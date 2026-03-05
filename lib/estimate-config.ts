/**
 * 견적 계산기 설정 (관리자 설정값 + 기본값) — 서버 전용
 */

import { createClient } from "@/lib/supabase-server";
import type { EstimateConfig } from "./estimate-calc";

export type { EstimateConfig } from "./estimate-calc";

const DEFAULT_CONFIG: EstimateConfig = {
  office_avg_unit_by_visits: [2000, 1850, 1750, 1650, 1550, 1480, 1420],
  stairs_base_monthly: 80000,
  stairs_extra_per_floor: 20000,
  stairs_visit_multiplier: [1.0, 1.9, 2.7],
  office_restroom_per_unit: 10000,
  office_recycle_monthly: 15000,
  office_elevator_monthly: 15000,
  stairs_restroom_unit: 20000,
  stairs_elevator_monthly: 15000,
  stairs_parking_monthly: 10000,
  stairs_window_monthly: 5000,
  stairs_recycle_monthly: 15000,
};

function mergeConfig(raw: Record<string, unknown> | null): EstimateConfig {
  if (!raw || typeof raw !== "object") return DEFAULT_CONFIG;
  return {
    office_avg_unit_by_visits: Array.isArray(raw.office_avg_unit_by_visits)
      ? raw.office_avg_unit_by_visits.map(Number).filter((n) => !Number.isNaN(n))
      : DEFAULT_CONFIG.office_avg_unit_by_visits,
    stairs_base_monthly: Number(raw.stairs_base_monthly) || DEFAULT_CONFIG.stairs_base_monthly,
    stairs_extra_per_floor: Number(raw.stairs_extra_per_floor) ?? DEFAULT_CONFIG.stairs_extra_per_floor,
    stairs_visit_multiplier: Array.isArray(raw.stairs_visit_multiplier)
      ? raw.stairs_visit_multiplier.map(Number)
      : DEFAULT_CONFIG.stairs_visit_multiplier,
    office_restroom_per_unit: Number(raw.office_restroom_per_unit) ?? DEFAULT_CONFIG.office_restroom_per_unit,
    office_recycle_monthly: Number(raw.office_recycle_monthly) ?? DEFAULT_CONFIG.office_recycle_monthly,
    office_elevator_monthly: Number(raw.office_elevator_monthly) ?? DEFAULT_CONFIG.office_elevator_monthly,
    stairs_restroom_unit: Number(raw.stairs_restroom_unit) ?? DEFAULT_CONFIG.stairs_restroom_unit,
    stairs_elevator_monthly: Number(raw.stairs_elevator_monthly) ?? DEFAULT_CONFIG.stairs_elevator_monthly,
    stairs_parking_monthly: Number(raw.stairs_parking_monthly) ?? DEFAULT_CONFIG.stairs_parking_monthly,
    stairs_window_monthly: Number(raw.stairs_window_monthly) ?? DEFAULT_CONFIG.stairs_window_monthly,
    stairs_recycle_monthly: Number(raw.stairs_recycle_monthly) ?? DEFAULT_CONFIG.stairs_recycle_monthly,
  };
}

export async function getEstimateConfig(): Promise<EstimateConfig> {
  const supabase = createClient();
  const { data } = await supabase.from("estimate_config").select("config").limit(1).single();
  return mergeConfig((data?.config as Record<string, unknown>) ?? null);
}
