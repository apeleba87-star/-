import type { BlogMode, ContentVariant } from "@/lib/ai-blog/types";

export type ModeDefinition = {
  id: BlogMode;
  name: string;
  description: string;
  sample: string;
  prompt: string;
};

export const BLOG_MODES: ModeDefinition[] = [
  {
    id: 1,
    name: "현장 후기형",
    description: "고객 상황 → 작업 과정 → 결과를 이야기처럼. 친근한 말투",
    sample: "이사 날짜가 코앞이라 급하게 연락 주신 고객님 댁이었습니다.",
    prompt: [
      "[모드 1: 현장 후기형]",
      "- 구성: 고객 상황 → 현장 첫인상 → 공간별 작업 과정(사진 짝 순서대로) → 결과와 소감 → 상담 안내.",
      "- 말투: 친근한 후기체(~했어요, ~더라고요). 대표가 직접 경험을 들려주듯 쓴다.",
      "- 작업하면서 느낀 점을 짧게 섞되 사실과 다른 감정 묘사는 하지 않는다.",
    ].join("\n"),
  },
  {
    id: 2,
    name: "전문가 노하우형",
    description: "오염이 생기는 이유와 재질별 처리법을 설명. 신뢰감 있는 말투",
    sample: "욕실 물때는 수돗물 속 미네랄이 굳은 것이라 일반 세제로는 잘 지워지지 않습니다.",
    prompt: [
      "[모드 2: 전문가 노하우형]",
      "- 구성: 이 현장의 핵심 오염이 생기는 이유 → 재질별 주의점 → 실제 처리 과정(사진 짝 순서대로) → 관리 팁 → 상담 안내.",
      "- 말투: 차분한 설명체(~입니다). 전문 용어는 쉬운 말로 풀어 쓴다.",
      "- 원리와 주의사항은 [청소 지식]에 있는 내용만 쓴다.",
    ].join("\n"),
  },
  {
    id: 3,
    name: "체크포인트형",
    description: "꼭 확인할 포인트를 질문형 소제목으로 짧게 정리. 읽기 쉬운 구성",
    sample: "입주 전에 창틀 레일, 꼭 확인해 보셨나요?",
    prompt: [
      "[모드 3: 체크포인트형]",
      "- 구성: 짧은 도입 → 질문형 소제목(각 사진 짝마다 하나) → 각 질문의 짧은 답과 해당 사진 → 요약 → 상담 안내.",
      "- 소제목(heading 블록)은 한 줄 질문 문장으로 쓴다(번호·기호 없이).",
      "- 문장은 짧고 명확하게. 한 문단 2~3줄.",
    ].join("\n"),
  },
];

export const INTRO_VARIANTS = [
  "고객님의 고민이나 요청으로 글을 시작한다.",
  "현장에 처음 들어갔을 때의 첫인상으로 글을 시작한다.",
  "계절이나 이사 시기 같은 시기 이야기로 글을 시작한다.",
  "독자에게 던지는 질문으로 글을 시작한다.",
];

export const INTRO_LABELS = ["고객 고민으로 시작", "현장 첫인상으로 시작", "계절·시기 이야기로 시작", "질문으로 시작"];

export const CLOSING_VARIANTS = [
  "마무리 직전에 이 현장에 맞는 관리 팁 한 가지를 쓰고 상담 안내로 끝낸다.",
  "마무리 직전에 작업을 마친 소감을 짧게 쓰고 상담 안내로 끝낸다.",
  "마무리 직전에 다음 청소를 추천하는 시기를 쓰고 상담 안내로 끝낸다.",
];

export const CLOSING_LABELS = ["관리 팁 + 상담 안내", "작업 소감 + 상담 안내", "다음 청소 시기 + 상담 안내"];

export function getMode(id: BlogMode): ModeDefinition {
  return BLOG_MODES.find((m) => m.id === id) ?? BLOG_MODES[0];
}

function randInt(n: number): number {
  return Math.floor(Math.random() * n);
}

/** 직전 조합과 겹치지 않는 도입·마무리 조합 */
export function pickVariant(previous: ContentVariant | null, random: boolean): ContentVariant {
  for (let i = 0; i < 10; i++) {
    const v = { intro: randInt(INTRO_VARIANTS.length), closing: randInt(CLOSING_VARIANTS.length), random };
    if (!previous || v.intro !== previous.intro || v.closing !== previous.closing) return v;
  }
  return { intro: 0, closing: 0, random };
}

/** 랜덤 모드: 현재 모드와 다른 모드 */
export function pickRandomMode(current: BlogMode | null): BlogMode {
  const others = BLOG_MODES.map((m) => m.id).filter((id) => id !== current);
  return others[randInt(others.length)];
}
