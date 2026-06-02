import { createServiceSupabase } from "@/lib/supabase-server";

export type DemandRtmsDistrictSnapshot = {
  bySlug: Record<
    string,
    {
      saleCount: number;
      jeonseCount: number;
      saleMom: number;
      jeonseMom: number;
    }
  >;
  baseMonthLabel: string | null;
};

function toMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  return `${Number(y)}년 ${Number(m)}월`;
}

function momPercent(curr: number, prev: number): number {
  if (!Number.isFinite(curr) || !Number.isFinite(prev) || prev <= 0) return 0;
  return Math.round(((curr - prev) / prev) * 100);
}

/**
 * demand_rtms_monthly 최신 2개월을 읽어 구별 count + MoM 계산.
 * 실패 시 empty snapshot 반환(화면은 더미 fallback).
 */
export async function getDemandRtmsDistrictSnapshot(): Promise<DemandRtmsDistrictSnapshot> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("demand_rtms_monthly")
      .select("region_scope, region_key, yyyymm, sale_count, jeonse_count")
      .eq("region_scope", "district")
      .order("yyyymm", { ascending: false })
      .limit(2000);

    if (error || !data || data.length === 0) {
      return { bySlug: {}, baseMonthLabel: null };
    }

    const months = [...new Set(data.map((r) => String(r.yyyymm)))].sort().reverse();
    const current = months[0];
    const previous = months[1] ?? null;
    const bySlug: DemandRtmsDistrictSnapshot["bySlug"] = {};

    const currRows = data.filter((r) => String(r.yyyymm) === current);
    const prevRows = previous ? data.filter((r) => String(r.yyyymm) === previous) : [];
    const prevMap = new Map(
      prevRows.map((r) => [
        String(r.region_key),
        {
          sale: Number(r.sale_count ?? 0),
          jeonse: Number(r.jeonse_count ?? 0),
        },
      ])
    );

    for (const row of currRows) {
      const slug = String(row.region_key);
      const saleCount = Number(row.sale_count ?? 0);
      const jeonseCount = Number(row.jeonse_count ?? 0);
      const prev = prevMap.get(slug);
      bySlug[slug] = {
        saleCount,
        jeonseCount,
        saleMom: momPercent(saleCount, prev?.sale ?? 0),
        jeonseMom: momPercent(jeonseCount, prev?.jeonse ?? 0),
      };
    }

    return {
      bySlug,
      baseMonthLabel: current ? toMonthLabel(current) : null,
    };
  } catch {
    return { bySlug: {}, baseMonthLabel: null };
  }
}
