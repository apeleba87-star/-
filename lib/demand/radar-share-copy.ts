import type { DemandHeatBand } from "@/lib/demand/district-demand-score";
import {
  formatDemandRegionLabel,
  getDemandCity,
  getDemandDistrictRef,
  type DemandRegionSelection,
} from "@/lib/demand/regions";

export type RadarShareCopyInput = {
  selection: DemandRegionSelection;
  placeLabel: string;
  score: number;
  band: DemandHeatBand;
  jeonseMom?: number;
  moveInIndexMom?: number;
  compareCount?: number;
};

export type RadarShareCopy = {
  title: string;
  description: string;
  /** 카톡·클립보드 본문 (제목 + 설명) */
  message: string;
};

/** 공유 제목용 짧은 지명 — 김천시, 강남구 */
export function radarShareHeadlinePlace(
  selection: DemandRegionSelection,
  pathLabel: string
): string {
  if (selection.scope === "national") return "전국";
  if (selection.scope === "city") {
    const city = getDemandCity(selection.cityId);
    if (!city) return pathLabel;
    const tail = city.fullLabel.trim().split(/\s+/).pop();
    return tail ?? city.fullLabel;
  }
  const district = getDemandDistrictRef(selection.cityId, selection.guSlug);
  return district?.gu ?? pathLabel;
}

function strongSignal(band: DemandHeatBand): boolean {
  return band === "very_hot" || band === "hot";
}

function risingSignal(band: DemandHeatBand, jeonseMom: number, moveInIndexMom: number): boolean {
  return band === "rising" || jeonseMom >= 8 || moveInIndexMom >= 8;
}

export function buildRadarShareCopy(input: RadarShareCopyInput): RadarShareCopy {
  const {
    selection,
    placeLabel,
    score,
    band,
    jeonseMom = 0,
    moveInIndexMom = 0,
    compareCount = 1,
  } = input;
  const place = radarShareHeadlinePlace(selection, placeLabel);
  const compareMode = compareCount > 1;

  let title: string;
  let description: string;

  if (compareMode) {
    title = `${compareCount}개 지역, 어디가 유리할까`;
    description = `포장이사·거래량 데이터로 ${compareCount}개 지역 입주·이사 수요를 비교했습니다. · 입주레이더`;
  } else if (selection.scope === "national") {
    title = "이번 달 전국 입주 신호";
    description =
      "포장이사·거래량·검색 데이터를 모아 전국 입주·이사 수요 흐름을 확인했습니다. · 입주레이더";
  } else if (strongSignal(band)) {
    title = `${place}가 갑자기 뜨는 이유`;
    description = `포장이사·거래량 데이터를 분석한 결과, 이번 달 ${place}에서 강한 입주 신호가 나타났습니다`;
  } else if (risingSignal(band, jeonseMom, moveInIndexMom)) {
    title = `이번 달 주목 지역 — ${place}`;
    const scoreBit = score > 0 ? ` 입주 예상 점수 ${Math.round(score)}.` : "";
    description = `이사·입주청소 검색과 아파트 거래를 보면 이번 달 ${place} 수요가 올라가는 편입니다.${scoreBit} · 입주레이더`;
  } else {
    title = `${place} 입주 신호 체크`;
    const scoreBit = score > 0 ? ` 입주 예상 점수 ${Math.round(score)}.` : "";
    description = `포장이사·거래량·검색 데이터로 ${place} 이번 달 입주 참고 지표를 확인하세요.${scoreBit} · 입주레이더`;
  }

  return {
    title,
    description,
    message: `${title}\n${description}`,
  };
}

/** SSR OG — selection만 있을 때 라벨 폴백 */
export function buildRadarShareCopyFallback(
  selection: DemandRegionSelection
): RadarShareCopy | null {
  const placeLabel = formatDemandRegionLabel(selection);
  if (!placeLabel) return null;
  return buildRadarShareCopy({
    selection,
    placeLabel,
    score: 0,
    band: "normal",
  });
}
