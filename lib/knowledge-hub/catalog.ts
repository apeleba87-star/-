/**
 * 지식 허브 카탈로그 — 현장·오염·재질 가이드 전체
 */
import type { CleaningFrequency, GuideType, InquiryType } from "@/lib/knowledge-hub/mvp-pages";
import {
  APARTMENT_COMMON_TOPICS,
  BUILDING_REGULAR_TOPICS,
  DISINFECTION_TOPICS,
  EXTERIOR_ONE_TIME_TOPICS,
  FACTORY_REGULAR_TOPICS,
  GYM_REGULAR_TOPICS,
  HOSPITAL_REGULAR_TOPICS,
  MOVE_OUT_TOPICS,
  RENOVATION_TOPICS,
  SCHOOL_REGULAR_TOPICS,
  WINDOW_ONE_TIME_TOPICS,
  type FacilityTopicDef,
} from "@/lib/knowledge-hub/facility-topic-builder";

export type HubIcon =
  | "office"
  | "shop"
  | "stairs"
  | "home"
  | "droplet"
  | "factory"
  | "gym"
  | "hospital"
  | "school"
  | "building"
  | "apartment"
  | "disinfection"
  | "exterior"
  | "window";

export type HubCategory = {
  slug: string;
  name: string;
  description: string;
  frequency: CleaningFrequency;
  inquiryType: InquiryType;
  hubPath: string;
  icon: HubIcon;
};

export type CatalogTopic = {
  categorySlug: string;
  topicSlug: string;
  path: string;
  h1: string;
  seoTitle: string;
  seoDescription: string;
  guideType: GuideType;
  indexable: boolean;
  focus: string;
  coupangKeyword?: string;
};

export const HUB_CATEGORIES: readonly HubCategory[] = [
  {
    slug: "office-regular",
    name: "사무실 정기청소",
    description: "화장실·바닥·회의실·탕비실 등 사무공간 청소 방법",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/office-regular",
    icon: "office",
  },
  {
    slug: "commercial-regular",
    name: "상가 청소",
    description: "매장·카페·음식점·미용실 등 상업공간 청소",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/commercial-regular",
    icon: "shop",
  },
  {
    slug: "stairs-regular",
    name: "계단 청소",
    description: "아파트·상가·오피스 계단·난간 청소",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/stairs-regular",
    icon: "stairs",
  },
  {
    slug: "move-in",
    name: "입주청소",
    description: "이사·입주 전 1회성 청소 방법·순서",
    frequency: "one_time",
    inquiryType: "move_in",
    hubPath: "/services/move-in",
    icon: "home",
  },
  {
    slug: "pollution",
    name: "오염·재질별 청소",
    description: "곰팡이·기름때·물때 등 오염 유형별 제거 방법",
    frequency: "one_time",
    inquiryType: "none",
    hubPath: "/guides",
    icon: "droplet",
  },
  {
    slug: "factory-regular",
    name: "공장·창고 청소",
    description: "공장 바닥·기름때·분진·창고 청소",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/factory-regular",
    icon: "factory",
  },
  {
    slug: "gym-regular",
    name: "헬스장 청소",
    description: "운동기구·샤워실·락커룸·바닥 청소",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/gym-regular",
    icon: "gym",
  },
  {
    slug: "hospital-regular",
    name: "병원·클리닉 청소",
    description: "병원 바닥·진료실·소독·감염 예방",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/hospital-regular",
    icon: "hospital",
  },
  {
    slug: "school-regular",
    name: "학교·학원 청소",
    description: "교실·화장실·급식실·운동장 청소",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/school-regular",
    icon: "school",
  },
  {
    slug: "building-regular",
    name: "건물 청소",
    description: "로비·엘리베이터·주차장·외부 청소",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/building-regular",
    icon: "building",
  },
  {
    slug: "apartment-common",
    name: "아파트 공용부 청소",
    description: "계단·엘리베이터·주차장·분리수거장",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/apartment-common",
    icon: "apartment",
  },
  {
    slug: "move-out",
    name: "이사·퇴거 청소",
    description: "퇴거·이사 전 마감 청소",
    frequency: "one_time",
    inquiryType: "move_in",
    hubPath: "/services/move-out",
    icon: "home",
  },
  {
    slug: "renovation",
    name: "준공·리모델링 후 청소",
    description: "공사 먼지·백시멘트·준공 마감",
    frequency: "one_time",
    inquiryType: "move_in",
    hubPath: "/services/renovation",
    icon: "home",
  },
  {
    slug: "window-one-time",
    name: "유리창 청소",
    description: "실내·외창·샷시·고층 유리",
    frequency: "one_time",
    inquiryType: "regular",
    hubPath: "/services/window-one-time",
    icon: "window",
  },
  {
    slug: "exterior-one-time",
    name: "외벽 청소",
    description: "외벽 오염·간판·고압 세척",
    frequency: "one_time",
    inquiryType: "regular",
    hubPath: "/services/exterior-one-time",
    icon: "exterior",
  },
  {
    slug: "disinfection",
    name: "소독·방역",
    description: "표면 소독·분무 방역·주기 관리",
    frequency: "recurring",
    inquiryType: "regular",
    hubPath: "/services/disinfection",
    icon: "disinfection",
  },
] as const;

const OFFICE_TOPICS: Omit<CatalogTopic, "categorySlug" | "path">[] = [
  { topicSlug: "overview", h1: "사무실 정기청소 방법 총정리", seoTitle: "사무실 정기청소 방법 | 클린아이덱스", seoDescription: "사무실 정기청소 범위·주기·순서를 한눈에 정리합니다.", guideType: "service_method", indexable: true, focus: "사무실 정기청소 전체", coupangKeyword: "사무실 청소용품" },
  { topicSlug: "restroom", h1: "사무실 화장실 청소 방법", seoTitle: "사무실 화장실 청소 | 클린아이덱스", seoDescription: "사무실 화장실 변기·세면대·바닥 청소 순서와 약품.", guideType: "service_method", indexable: true, focus: "사무실 화장실", coupangKeyword: "화장실 청소세트" },
  { topicSlug: "floor", h1: "사무실 바닥 청소 방법", seoTitle: "사무실 바닥 청소 | 클린아이덱스", seoDescription: "데코타일·카펫·강화마루 사무실 바닥 청소.", guideType: "service_method", indexable: true, focus: "사무실 바닥", coupangKeyword: "바닥 청소" },
  { topicSlug: "meeting-room", h1: "회의실 청소 방법", seoTitle: "회의실 청소 | 클린아이덱스", seoDescription: "회의실 테이블·의자·화이트보드 청소.", guideType: "service_method", indexable: true, focus: "회의실", coupangKeyword: "회의실 청소" },
  { topicSlug: "pantry", h1: "탕비실·휴게실 청소 방법", seoTitle: "탕비실 청소 | 클린아이덱스", seoDescription: "싱크대·전자레인지·냉장고 겉면 청소.", guideType: "service_method", indexable: true, focus: "탕비실", coupangKeyword: "주방 세제" },
  { topicSlug: "glass", h1: "사무실 유리·창문 청소", seoTitle: "사무실 유리 청소 | 클린아이덱스", seoDescription: "출입문·파티션 유리 청소 방법.", guideType: "service_method", indexable: true, focus: "유리 창문", coupangKeyword: "유리세정제" },
  { topicSlug: "desk", h1: "책상·OA 기기 청소", seoTitle: "사무실 책상 청소 | 클린아이덱스", seoDescription: "책상·모니터·키보드 먼지 제거.", guideType: "service_method", indexable: true, focus: "책상 OA", coupangKeyword: "전자기기 클리너" },
  { topicSlug: "lobby", h1: "로비·복도 청소 방법", seoTitle: "사무실 로비 복도 청소 | 클린아이덱스", seoDescription: "로비 바닥·출입문 손잡이 청소.", guideType: "service_method", indexable: true, focus: "로비 복도", coupangKeyword: "업소용 중성세제" },
  { topicSlug: "night", h1: "야간·주말 사무실 청소", seoTitle: "야간 사무실 청소 | 클린아이덱스", seoDescription: "야간 정기청소 시 보안·소음·순서.", guideType: "service_method", indexable: true, focus: "야간 청소", coupangKeyword: "야간 청소" },
  { topicSlug: "supplies", h1: "사무실 청소 약품·장비", seoTitle: "사무실 청소 약품 | 클린아이덱스", seoDescription: "사무실 정기청소 필수 약품·장비 목록.", guideType: "service_supplies", indexable: true, focus: "사무실 약품", coupangKeyword: "청소용품 세트" },
];

const COMMERCIAL_TOPICS: Omit<CatalogTopic, "categorySlug" | "path">[] = [
  { topicSlug: "overview", h1: "상가 청소 방법 총정리", seoTitle: "상가 청소 방법 | 클린아이덱스", seoDescription: "매장 청소 범위·주기·순서.", guideType: "service_method", indexable: true, focus: "상가 청소", coupangKeyword: "매장 청소" },
  { topicSlug: "storefront", h1: "쇼룸·입구 청소", seoTitle: "매장 입구 청소 | 클린아이덱스", seoDescription: "고객 첫인상 입구·유리 청소.", guideType: "service_method", indexable: true, focus: "매장 입구", coupangKeyword: "유리세정제" },
  { topicSlug: "kitchen", h1: "상가 주방·싱크 청소", seoTitle: "상가 주방 청소 | 클린아이덱스", seoDescription: "싱크·후드·배수구 기름때.", guideType: "service_method", indexable: true, focus: "상가 주방", coupangKeyword: "기름때 제거" },
  { topicSlug: "cafe", h1: "카페 바닥·테이블 청소", seoTitle: "카페 청소 | 클린아이덱스", seoDescription: "카페 바닥 기름때·테이블 청소.", guideType: "service_method", indexable: true, focus: "카페", coupangKeyword: "카페 청소" },
  { topicSlug: "retail", h1: "소매·의류 매장 청소", seoTitle: "소매 매장 청소 | 클린아이덱스", seoDescription: "먼지·거울·피팅룸 청소.", guideType: "service_method", indexable: true, focus: "소매 매장", coupangKeyword: "먼지제거" },
  { topicSlug: "restaurant", h1: "음식점 청소 방법", seoTitle: "음식점 청소 | 클린아이덱스", seoDescription: "주방·홀·배수구 위생 청소.", guideType: "service_method", indexable: true, focus: "음식점", coupangKeyword: "주방 기름때" },
  { topicSlug: "beauty", h1: "미용실·네일샵 청소", seoTitle: "미용실 청소 | 클린아이덱스", seoDescription: "머리카락·바닥·도구 소독.", guideType: "service_method", indexable: true, focus: "미용실", coupangKeyword: "미용실 청소" },
  { topicSlug: "restroom", h1: "상가 화장실 청소", seoTitle: "상가 화장실 청소 | 클린아이덱스", seoDescription: "고객용 화장실 위생 청소.", guideType: "service_method", indexable: true, focus: "상가 화장실", coupangKeyword: "화장실 청소" },
  { topicSlug: "closing", h1: "폐점 후·개점 전 청소", seoTitle: "매장 폐점 후 청소 | 클린아이덱스", seoDescription: "영업 종료 후 바닥·주방 청소.", guideType: "service_method", indexable: true, focus: "폐점 청소", coupangKeyword: "바닥 청소" },
  { topicSlug: "supplies", h1: "상가 청소 약품·장비", seoTitle: "상가 청소 약품 | 클린아이덱스", seoDescription: "상가용 청소 약품·장비.", guideType: "service_supplies", indexable: true, focus: "상가 약품", coupangKeyword: "청소용품" },
];

const STAIRS_TOPICS: Omit<CatalogTopic, "categorySlug" | "path">[] = [
  { topicSlug: "overview", h1: "계단 청소 방법 총정리", seoTitle: "계단 청소 방법 | 클린아이덱스", seoDescription: "계단 청소 순서·주기·안전.", guideType: "service_method", indexable: true, focus: "계단 청소", coupangKeyword: "계단 청소" },
  { topicSlug: "handrail", h1: "계단 난간 청소", seoTitle: "계단 난간 청소 | 클린아이덱스", seoDescription: "난간·손잡이 소독·광택.", guideType: "service_method", indexable: true, focus: "난간", coupangKeyword: "난간 청소" },
  { topicSlug: "tread", h1: "디딤판·참판 청소", seoTitle: "계단 디딤판 청소 | 클린아이덱스", seoDescription: "디딤판 습식·건조 주의.", guideType: "service_method", indexable: true, focus: "디딤판", coupangKeyword: "막대걸레" },
  { topicSlug: "landing", h1: "계단 코너·창가 청소", seoTitle: "계단 코너 청소 | 클린아이덱스", seoDescription: "틈새·코너 먼지 제거.", guideType: "service_method", indexable: true, focus: "계단 코너", coupangKeyword: "틈새 브러시" },
  { topicSlug: "apartment", h1: "아파트 공용 계단 청소", seoTitle: "아파트 계단 청소 | 클린아이덱스", seoDescription: "아파트 층별 계단 청소.", guideType: "service_method", indexable: true, focus: "아파트 계단", coupangKeyword: "공용부 청소" },
  { topicSlug: "commercial", h1: "상가·오피스 계단 청소", seoTitle: "상가 계단 청소 | 클린아이덱스", seoDescription: "상업시설 비상계단·메인 계단.", guideType: "service_method", indexable: true, focus: "상가 계단", coupangKeyword: "계단 청소" },
  { topicSlug: "safety", h1: "계단 청소 안전·미끄럼 예방", seoTitle: "계단 청소 안전 | 클린아이덱스", seoDescription: "습기·표지판·작업 순서.", guideType: "service_method", indexable: true, focus: "안전", coupangKeyword: "미끄럼 방지" },
  { topicSlug: "frequency", h1: "계단 청소 주기·인력", seoTitle: "계단 청소 주기 | 클린아이덱스", seoDescription: "층수별 권장 청소 주기.", guideType: "service_method", indexable: true, focus: "청소 주기", coupangKeyword: "청소" },
  { topicSlug: "equipment", h1: "계단 청소 장비", seoTitle: "계단 청소 장비 | 클린아이덱스", seoDescription: "좁은 노즐·브러시·걸레.", guideType: "service_method", indexable: true, focus: "장비", coupangKeyword: "진공청소기" },
  { topicSlug: "supplies", h1: "계단 청소 약품·장비", seoTitle: "계단 청소 약품 | 클린아이덱스", seoDescription: "계단용 약품·장비 목록.", guideType: "service_supplies", indexable: true, focus: "계단 약품", coupangKeyword: "중성세제" },
];

const MOVE_IN_TOPICS: Omit<CatalogTopic, "categorySlug" | "path">[] = [
  { topicSlug: "overview", h1: "입주청소 방법·순서", seoTitle: "입주청소 방법 | 클린아이덱스", seoDescription: "입주청소 전체 순서·체크리스트.", guideType: "service_method", indexable: true, focus: "입주청소", coupangKeyword: "입주청소 세트" },
  { topicSlug: "dust", h1: "공사 먼지·분진 제거", seoTitle: "공사 먼지 청소 | 클린아이덱스", seoDescription: "리모델링 후 분진 제거.", guideType: "service_method", indexable: true, focus: "공사 먼지", coupangKeyword: "HEPA 진공" },
  { topicSlug: "kitchen", h1: "입주 주방 청소", seoTitle: "입주 주방 청소 | 클린아이덱스", seoDescription: "싱크·가스레인지·가구 청소.", guideType: "service_method", indexable: true, focus: "주방", coupangKeyword: "주방 기름때" },
  { topicSlug: "bathroom", h1: "입주 욕실 청소", seoTitle: "입주 욕실 청소 | 클린아이덱스", seoDescription: "욕실 곰팡이·물때·실리콘.", guideType: "service_method", indexable: true, focus: "욕실", coupangKeyword: "곰팡이 제거" },
  { topicSlug: "windows", h1: "입주 창문·샷시 청소", seoTitle: "입주 창문 청소 | 클린아이덱스", seoDescription: "창틀·유리·방충망.", guideType: "service_method", indexable: true, focus: "창문", coupangKeyword: "창문 청소" },
  { topicSlug: "floor", h1: "입주 바닥 청소", seoTitle: "입주 바닥 청소 | 클린아이덱스", seoDescription: "바닥재별 첫 청소 방법.", guideType: "service_method", indexable: true, focus: "바닥", coupangKeyword: "바닥 청소" },
  { topicSlug: "balcony", h1: "베란다·다용도실 청소", seoTitle: "베란다 청소 | 클린아이덱스", seoDescription: "베란다 바닥·배수구.", guideType: "service_method", indexable: true, focus: "베란다", coupangKeyword: "베란다 청소" },
  { topicSlug: "tape", h1: "보양 테이프·접착 제거", seoTitle: "보양 테이프 제거 | 클린아이덱스", seoDescription: "테이프 자국·접착제 제거.", guideType: "service_method", indexable: true, focus: "보양 테이프", coupangKeyword: "스크래퍼" },
  { topicSlug: "checklist", h1: "입주청소 체크리스트", seoTitle: "입주청소 체크리스트 | 클린아이덱스", seoDescription: "공간별 입주청소 확인 항목.", guideType: "service_method", indexable: true, focus: "체크리스트", coupangKeyword: "입주청소" },
  { topicSlug: "supplies", h1: "입주청소 준비물·약품", seoTitle: "입주청소 준비물 | 클린아이덱스", seoDescription: "입주청소 필수 용품.", guideType: "service_supplies", indexable: true, focus: "준비물", coupangKeyword: "입주청소 용품" },
];

const POLLUTION_TOPICS: Omit<CatalogTopic, "categorySlug" | "path">[] = [
  { topicSlug: "mold-tile", h1: "타일 곰팡이 제거 방법", seoTitle: "타일 곰팡이 제거 | 클린아이덱스", seoDescription: "욕실 타일 곰팡이 제거·예방.", guideType: "problem", indexable: true, focus: "타일 곰팡이", coupangKeyword: "곰팡이 제거제" },
  { topicSlug: "mold-silicone", h1: "실리콘 곰팡이 제거", seoTitle: "실리콘 곰팡이 제거 | 클린아이덱스", seoDescription: "욕실 실리콘 곰팡이.", guideType: "problem", indexable: true, focus: "실리콘 곰팡이", coupangKeyword: "실리콘 곰팡이" },
  { topicSlug: "oil-stainless", h1: "스테인리스 기름때 제거", seoTitle: "스테인리스 기름때 | 클린아이덱스", seoDescription: "싱크대·가전 기름때.", guideType: "problem", indexable: true, focus: "스테인리스 기름", coupangKeyword: "스테인리스 세정제" },
  { topicSlug: "oil-range", h1: "가스레인지 기름때 제거", seoTitle: "가스레인지 청소 | 클린아이덱스", seoDescription: "후드·버너 기름때.", guideType: "problem", indexable: true, focus: "가스레인지", coupangKeyword: "기름때 제거제" },
  { topicSlug: "water-glass", h1: "유리 물때 제거", seoTitle: "유리 물때 제거 | 클린아이덱스", seoDescription: "샤워부스·거울 물때.", guideType: "problem", indexable: true, focus: "유리 물때", coupangKeyword: "유리 물때" },
  { topicSlug: "water-faucet", h1: "수전·크롬 물때", seoTitle: "수전 물때 제거 | 클린아이덱스", seoDescription: "수도꼭지 석회·물때.", guideType: "problem", indexable: true, focus: "수전 물때", coupangKeyword: "석회 제거" },
  { topicSlug: "carpet-stain", h1: "카펫·러그 얼룩 제거", seoTitle: "카펫 얼룩 제거 | 클린아이덱스", seoDescription: "카펫 음료·오염 얼룩.", guideType: "problem", indexable: true, focus: "카펫 얼룩", coupangKeyword: "카펫 클리너" },
  { topicSlug: "marble-care", h1: "대리석 얼룩·관리", seoTitle: "대리석 청소 | 클린아이덱스", seoDescription: "대리석 금지 약품·관리.", guideType: "problem", indexable: true, focus: "대리석", coupangKeyword: "대리석 세정제" },
  { topicSlug: "wood-floor", h1: "원목·합판 바닥 청소", seoTitle: "원목 바닥 청소 | 클린아이덱스", seoDescription: "원목 바닥 습기 주의.", guideType: "problem", indexable: true, focus: "원목 바닥", coupangKeyword: "원목 바닥 클리너" },
  { topicSlug: "bathroom-odor", h1: "욕실 냄새 제거", seoTitle: "욕실 냄새 제거 | 클린아이덱스", seoDescription: "하수구·곰팡이 냄새.", guideType: "problem", indexable: true, focus: "욕실 냄새", coupangKeyword: "하수구 냄새" },
];

function facilityToCatalogTopics(topics: FacilityTopicDef[]): Omit<CatalogTopic, "categorySlug" | "path">[] {
  return topics;
}

function buildTopics(
  categorySlug: string,
  topics: Omit<CatalogTopic, "categorySlug" | "path">[],
  pathPrefix: string
): CatalogTopic[] {
  return topics.map((t) => ({
    ...t,
    categorySlug,
    path: `${pathPrefix}/${t.topicSlug}`,
  }));
}

export const CATALOG_TOPICS: readonly CatalogTopic[] = [
  ...buildTopics("office-regular", OFFICE_TOPICS, "/services/office-regular"),
  ...buildTopics("commercial-regular", COMMERCIAL_TOPICS, "/services/commercial-regular"),
  ...buildTopics("stairs-regular", STAIRS_TOPICS, "/services/stairs-regular"),
  ...buildTopics("move-in", MOVE_IN_TOPICS, "/services/move-in"),
  ...buildTopics("factory-regular", facilityToCatalogTopics(FACTORY_REGULAR_TOPICS), "/services/factory-regular"),
  ...buildTopics("gym-regular", facilityToCatalogTopics(GYM_REGULAR_TOPICS), "/services/gym-regular"),
  ...buildTopics("hospital-regular", facilityToCatalogTopics(HOSPITAL_REGULAR_TOPICS), "/services/hospital-regular"),
  ...buildTopics("school-regular", facilityToCatalogTopics(SCHOOL_REGULAR_TOPICS), "/services/school-regular"),
  ...buildTopics("building-regular", facilityToCatalogTopics(BUILDING_REGULAR_TOPICS), "/services/building-regular"),
  ...buildTopics("apartment-common", facilityToCatalogTopics(APARTMENT_COMMON_TOPICS), "/services/apartment-common"),
  ...buildTopics("move-out", facilityToCatalogTopics(MOVE_OUT_TOPICS), "/services/move-out"),
  ...buildTopics("renovation", facilityToCatalogTopics(RENOVATION_TOPICS), "/services/renovation"),
  ...buildTopics("window-one-time", facilityToCatalogTopics(WINDOW_ONE_TIME_TOPICS), "/services/window-one-time"),
  ...buildTopics("exterior-one-time", facilityToCatalogTopics(EXTERIOR_ONE_TIME_TOPICS), "/services/exterior-one-time"),
  ...buildTopics("disinfection", facilityToCatalogTopics(DISINFECTION_TOPICS), "/services/disinfection"),
  ...buildTopics("pollution", POLLUTION_TOPICS, "/guides"),
];

export function getServiceCategories(): HubCategory[] {
  return HUB_CATEGORIES.filter((c) => c.slug !== "pollution");
}

export function getRecurringCategories(): HubCategory[] {
  return HUB_CATEGORIES.filter((c) => c.frequency === "recurring" && c.slug !== "pollution");
}

export function getOneTimeCategories(): HubCategory[] {
  return HUB_CATEGORIES.filter((c) => c.frequency === "one_time" && c.slug !== "pollution");
}

export function getCategory(slug: string): HubCategory | undefined {
  return HUB_CATEGORIES.find((c) => c.slug === slug);
}

export function getTopicsByCategory(categorySlug: string): CatalogTopic[] {
  return CATALOG_TOPICS.filter((t) => t.categorySlug === categorySlug);
}

export function getCatalogTopicByPath(path: string): CatalogTopic | undefined {
  return CATALOG_TOPICS.find((t) => t.path === path);
}

export function getCatalogTopic(categorySlug: string, topicSlug: string): CatalogTopic | undefined {
  return CATALOG_TOPICS.find((t) => t.categorySlug === categorySlug && t.topicSlug === topicSlug);
}

export const ALL_CATALOG_PATHS = CATALOG_TOPICS.map((t) => t.path);
