import {
  DISTRICT_RTMS_BASE,
  DISTRICT_RTMS_WEIGHTS,
} from "@/lib/demand/demand-score-weights";

export type DistrictRtmsInput = {
  saleMom: number;
  jeonseMom: number;
};

export type DistrictRtmsIndex = {
  index: number;
  changePct: number;
  saleMom: number;
  jeonseMom: number;
};

export function computeDistrictRtmsIndex(input: DistrictRtmsInput): DistrictRtmsIndex {
  const w = DISTRICT_RTMS_WEIGHTS;
  const saleMom = Number.isFinite(input.saleMom) ? input.saleMom : 0;
  const jeonseMom = Number.isFinite(input.jeonseMom) ? input.jeonseMom : 0;
  const changePct = Math.round((jeonseMom * w.jeonse + saleMom * w.sale) * 10) / 10;
  return {
    index: Math.round((DISTRICT_RTMS_BASE + changePct) * 10) / 10,
    changePct,
    saleMom,
    jeonseMom,
  };
}
