import { SOLUTION_PLACES, SOLUTION_SPACES } from "@/lib/knowledge-hub/solutions/taxonomy";

/** 질문 장소 태그 — 솔루션 장소·구역 ID 재사용 (문자열 장소명 금지) */
export type QuestionPlaceOption = { id: string; name: string; group: "place" | "space" };

const SPACE_PICK: { id: string; name: string }[] = [
  { id: "restroom", name: "화장실·욕실" },
  { id: "kitchen", name: "주방" },
  { id: "living", name: "거실" },
  { id: "locker", name: "락커·샤워" },
  { id: "windows", name: "창·샷시" },
  { id: "storefront", name: "쇼윈도·유리" },
  { id: "office-floor", name: "사무공간" },
  { id: "pantry-office", name: "탕비실" },
  { id: "hall", name: "홀·테이블" },
  { id: "workout", name: "운동 공간" },
  { id: "classroom", name: "강의실" },
];

export const QUESTION_PLACE_OPTIONS: QuestionPlaceOption[] = [
  ...SOLUTION_PLACES.map((p) => ({ id: p.id, name: p.name, group: "place" as const })),
  ...SPACE_PICK.map((s) => ({ id: s.id, name: s.name, group: "space" as const })),
];

const PLACE_NAME = new Map(QUESTION_PLACE_OPTIONS.map((p) => [p.id, p.name]));

export function getQuestionPlaceLabel(id: string): string | null {
  return PLACE_NAME.get(id) ?? SOLUTION_SPACES.find((s) => s.id === id)?.name ?? null;
}

export function isKnownQuestionPlaceId(id: string): boolean {
  return PLACE_NAME.has(id);
}
