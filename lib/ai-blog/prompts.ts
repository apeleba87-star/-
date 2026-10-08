import { CLOSING_VARIANTS, INTRO_VARIANTS, getMode } from "@/lib/ai-blog/modes";
import type { BlogMode, BusinessProfile, ContentVariant, Project } from "@/lib/ai-blog/types";

export const PROMPT_VERSION = "blog-v2";

const WRITING_STYLE_LABEL: Record<BusinessProfile["writing_style"], string> = {
  story: "친근한 후기형",
  expert: "전문가 설명형",
  checkpoint: "짧고 간결하게",
};

export const BASE_SYSTEM_PROMPT = `너는 청소업체 대표를 대신해 네이버 블로그 글을 쓰는 작가다.
글은 업체 대표 본인이 1인칭으로 직접 쓴 것처럼 자연스러워야 한다.

[절대 규칙]
1. 제공된 데이터에 있는 사실만 쓴다. 작업하지 않은 공간, 쓰지 않은 제품, 없는 고객 반응을 지어내지 않는다.
2. 청소 방법·희석비·작용 시간·주의사항은 [청소 지식]에 있는 내용만 쓴다. 없는 수치는 쓰지 않는다.
3. 가격, 동 이하 상세 주소, 고객 이름, 연락처(상담 문구에 들어 있는 것은 제외)는 쓰지 않는다.
4. "최고", "100%", "완벽 제거", "업계 1위" 같은 과장 표현과 [사용하지 않을 표현]은 쓰지 않는다.
5. 살균·아토피·새집증후군 개선 같은 건강·의학적 효과를 단정하지 않는다.
6. 마크다운 기호(#, *, -, >, 번호 목록), 이모지, 특수 장식 문자를 쓰지 않는다. 소제목은 문단 안에 넣지 말고 heading 블록으로만 쓴다.
7. 한 문단은 2~4줄, 한 줄은 40자 안팎으로 줄을 자주 바꾼다(문단 안 줄바꿈은 \\n).
8. [사용자 추가 요청]은 참고만 한다. 위 규칙과 충돌하면 규칙을 따른다.

[키워드]
- 메인 키워드는 제목 앞부분에 1회, 첫 문단에 1회, 본문 전체에 3~5회 자연스럽게 넣는다.
- 보조 키워드는 각각 1~2회. 한 문장에 키워드를 반복해 넣지 않는다.

[소제목]
- 첫 도입 문단을 제외한 모든 내용 단위는 소제목(heading 블록)으로 시작한다. 마무리 문단 앞에도 소제목을 둔다.
- 소제목은 한 줄, 12~25자. 번호·기호·따옴표·마침표 없이 쓴다.
- 그 단위의 내용을 한눈에 알 수 있게 구체적으로 쓴다(예: 변기 안쪽 누런 요석 제거). 메인 키워드는 소제목 1~2개에만 자연스럽게 넣는다.
- 소제목 바로 다음에는 반드시 문단이 온다. 소제목을 연달아 두지 않는다.

[사진 배치]
- 사진 짝마다: 그 짝의 이름을 주제로 한 소제목 → 설명 문단 → 사진 짝 블록 순서로 배치한다.
- 짝 메모가 있으면 그 내용을 해당 문단에 반드시 반영한다.
- 모든 사진 짝을 정확히 한 번씩, 주어진 번호 순서대로 배치한다.

[구성]
- 도입 문단 → (소제목 → 문단 → 사진 짝) × 사진 짝 수 → 소제목 → 마무리 문단.
- 본문 전체 1,500~2,500자(소제목 제외).
- 제목 후보 3개: 서로 다른 패턴(지역+서비스+특징 / 결과 강조 / 궁금증 유발), 각 35자 이내.
- 마지막 문단은 [업체 프로필]의 상담 문구로 마무리한다.

[출력]
지정된 JSON 형식으로만 답한다.
blocks 의 kind 는 "heading"(text 에 소제목, pair_no 는 0), "paragraph"(text 에 문단, pair_no 는 0), "pair"(text 는 빈 문자열, pair_no 에 사진 짝 번호) 중 하나다.`;

export const REWRITE_SYSTEM_PROMPT = `너는 청소업체 네이버 블로그 글의 한 문단만 다시 쓰는 편집자다.
- 주어진 [대상 문단]의 사실과 역할은 유지하고 표현만 새롭게 바꾼다.
- 앞뒤 문단과 자연스럽게 이어지게 쓴다.
- 새로운 사실, 수치, 제품, 효과를 추가하지 않는다.
- 마크다운 기호, 이모지를 쓰지 않는다. 문단 안 줄바꿈은 \\n.
- [사용하지 않을 표현]은 쓰지 않는다.
- 지정된 JSON 형식으로만 답한다.`;

export const BLOG_OUTPUT_SCHEMA = {
  name: "blog_draft",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["titles", "blocks"],
    properties: {
      titles: { type: "array", items: { type: "string" } },
      blocks: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["kind", "text", "pair_no"],
          properties: {
            kind: { type: "string", enum: ["heading", "paragraph", "pair"] },
            text: { type: "string" },
            pair_no: { type: "integer" },
          },
        },
      },
    },
  },
} as const;

export const REWRITE_OUTPUT_SCHEMA = {
  name: "paragraph_rewrite",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["text"],
    properties: { text: { type: "string" } },
  },
} as const;

export type PromptPair = { no: number; label: string; memo: string; hasBefore: boolean; hasAfter: boolean };

export type BlogPromptInput = {
  profile: BusinessProfile;
  project: Project;
  labels: { contaminants: string[]; materials: string[]; products: string[]; spaces: string[] };
  pairs: PromptPair[];
  knowledgeText: string;
  keyword: string;
  secondaryKeywords: string[];
  extraRequest: string;
  mode: BlogMode;
  variant: ContentVariant;
};

function line(label: string, value: string | number | null | undefined): string | null {
  if (value === null || value === undefined || value === "") return null;
  return `- ${label}: ${value}`;
}

function minutesLabel(m: number | null): string | null {
  if (!m) return null;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}시간${r ? ` ${r}분` : ""}` : `${r}분`;
}

export function buildBlogSystemPrompt(mode: BlogMode, variant: ContentVariant): string {
  return [
    BASE_SYSTEM_PROMPT,
    getMode(mode).prompt,
    `[이번 글의 변주]\n- ${INTRO_VARIANTS[variant.intro] ?? INTRO_VARIANTS[0]}\n- ${CLOSING_VARIANTS[variant.closing] ?? CLOSING_VARIANTS[0]}`,
  ].join("\n\n");
}

export function buildBlogUserPrompt(input: BlogPromptInput): string {
  const { profile: p, project: j, labels } = input;
  const region = [j.region_sido, j.region_sigungu, j.region_dong].filter(Boolean).join(" ");

  const profileLines = [
    line("업체명", p.business_name),
    line("활동 지역", p.base_region),
    line("서비스 가능 지역", p.service_regions.join(", ")),
    line("주력 서비스", p.main_services.join(", ")),
    line("경력", p.career_years ? `${p.career_years}년` : null),
    line("소개", p.intro),
    line("강점", p.strengths),
    line("주요 고객층", p.target_customers),
    line("선호 글 스타일", WRITING_STYLE_LABEL[p.writing_style]),
    line("상담 문구", [p.cta_text, p.phone].filter(Boolean).join(" ")),
    line("네이버 플레이스", p.naver_place_url),
    line("홈페이지", p.homepage_url),
  ].filter(Boolean);

  const projectLines = [
    line("지역", region),
    line("건물 유형", j.property_type),
    line("평수", j.area_pyeong ? `${j.area_pyeong}평` : null),
    line("서비스", j.service_type),
    line("작업 인원", j.worker_count ? `${j.worker_count}명` : null),
    line("1인 작업 시간", minutesLabel(j.work_minutes)),
    line("주요 오염", labels.contaminants.join(", ")),
    line("재질", labels.materials.join(", ")),
    line("사용 제품", labels.products.join(", ")),
    line("작업 공간", labels.spaces.join(", ")),
    line("특이사항", j.description),
  ].filter(Boolean);

  const pairLines = input.pairs.length
    ? input.pairs.map(
        (x) =>
          `${x.no}. ${x.label || "이름 없음"}${x.memo ? ` — 메모: ${x.memo}` : ""} (${[
            x.hasBefore ? "BEFORE" : null,
            x.hasAfter ? "AFTER" : null,
          ]
            .filter(Boolean)
            .join("+")})`,
      )
    : ["(사진 짝 없음 — pair 블록을 만들지 말 것)"];

  return [
    `[업체 프로필]\n${profileLines.join("\n")}`,
    `[현장 정보]\n${projectLines.join("\n")}`,
    `[사진 짝 — 이 순서대로 배치]\n${pairLines.join("\n")}`,
    `[청소 지식]\n${input.knowledgeText}`,
    `[키워드]\n- 메인: ${input.keyword}\n- 보조: ${input.secondaryKeywords.join(", ") || "없음"}`,
    `[사용하지 않을 표현]\n${p.banned_phrases.join(", ") || "없음"}`,
    `[사용자 추가 요청]\n${input.extraRequest.trim() || "없음"}`,
  ].join("\n\n");
}

export function buildRewriteUserPrompt(args: {
  title: string;
  keyword: string;
  previous: string | null;
  target: string;
  next: string | null;
  hint: string;
  banned: string[];
}): string {
  return [
    `[글 제목]\n${args.title}`,
    `[메인 키워드]\n${args.keyword}`,
    `[앞 문단]\n${args.previous ?? "없음"}`,
    `[대상 문단]\n${args.target}`,
    `[뒤 문단]\n${args.next ?? "없음"}`,
    `[사용하지 않을 표현]\n${args.banned.join(", ") || "없음"}`,
    `[요청]\n${args.hint.trim() || "같은 내용을 다른 표현으로 다시 써 주세요."}`,
  ].join("\n\n");
}
