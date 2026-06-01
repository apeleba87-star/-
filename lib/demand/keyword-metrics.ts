import { DEMAND_DAILY_NATIONAL_KEYWORDS } from "@/lib/demand/dummy-daily";
import { DEMAND_SNAPSHOT_META } from "@/lib/demand/dummy-data";
import { fetchSearchAdKeywordVolume } from "@/lib/naver/searchad-keyword-client";

export type DemandKeywordMetricSlice = {
  /** 검색광고 API — 최근 30일 PC+모바일 추정 조회(전국) */
  searchVolumeMonth: number | null;
  searchVolumeBelowTen: boolean;
  /** 데이터랩 — 전월 대비 지수(%) */
  indexMomPercent: number;
  /** 데이터랩 — 전일 대비 지수(%, 일간 펄스) */
  indexDodPercent: number;
};

export type DemandNationalKeywordMetrics = {
  packing: DemandKeywordMetricSlice;
  moveInClean: DemandKeywordMetricSlice;
  source: "live" | "dummy";
};

const PACKING_KEYWORD = "포장이사";
const MOVE_IN_CLEAN_KEYWORD = "입주청소";

function dummyMetrics(): DemandNationalKeywordMetrics {
  const packingPulse = DEMAND_DAILY_NATIONAL_KEYWORDS.find((k) => k.id === "packing");
  const moveInPulse = DEMAND_DAILY_NATIONAL_KEYWORDS.find((k) => k.id === "move-in-clean");

  return {
    source: "dummy",
    packing: {
      searchVolumeMonth: 124_000,
      searchVolumeBelowTen: false,
      indexMomPercent: DEMAND_SNAPSHOT_META.nationalKeywords.packingMom,
      indexDodPercent: packingPulse?.dayOverDayPercent ?? 0,
    },
    moveInClean: {
      searchVolumeMonth: 87_000,
      searchVolumeBelowTen: false,
      indexMomPercent: DEMAND_SNAPSHOT_META.nationalKeywords.moveInCleanMom,
      indexDodPercent: moveInPulse?.dayOverDayPercent ?? 0,
    },
  };
}

export async function getDemandNationalKeywordMetrics(): Promise<DemandNationalKeywordMetrics> {
  const credsMissing = !process.env.NAVER_SEARCHAD_API_KEY?.trim();
  if (credsMissing) return dummyMetrics();

  try {
    const [packingVol, moveInVol] = await Promise.all([
      fetchSearchAdKeywordVolume(PACKING_KEYWORD),
      fetchSearchAdKeywordVolume(MOVE_IN_CLEAN_KEYWORD),
    ]);

    const packingPulse = DEMAND_DAILY_NATIONAL_KEYWORDS.find((k) => k.id === "packing");
    const moveInPulse = DEMAND_DAILY_NATIONAL_KEYWORDS.find((k) => k.id === "move-in-clean");

    return {
      source: "live",
      packing: {
        searchVolumeMonth: packingVol?.total ?? null,
        searchVolumeBelowTen: packingVol?.belowTen ?? false,
        indexMomPercent: DEMAND_SNAPSHOT_META.nationalKeywords.packingMom,
        indexDodPercent: packingPulse?.dayOverDayPercent ?? 0,
      },
      moveInClean: {
        searchVolumeMonth: moveInVol?.total ?? null,
        searchVolumeBelowTen: moveInVol?.belowTen ?? false,
        indexMomPercent: DEMAND_SNAPSHOT_META.nationalKeywords.moveInCleanMom,
        indexDodPercent: moveInPulse?.dayOverDayPercent ?? 0,
      },
    };
  } catch {
    return dummyMetrics();
  }
}
