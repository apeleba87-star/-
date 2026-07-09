import type { GuideType } from "@/lib/knowledge-hub/mvp-pages";

export type FacilityTopicDef = {
  topicSlug: string;
  h1: string;
  seoTitle: string;
  seoDescription: string;
  guideType: GuideType;
  indexable: boolean;
  focus: string;
  coupangKeyword?: string;
};

function topic(
  topicSlug: string,
  h1: string,
  focus: string,
  opts?: { guideType?: GuideType; coupangKeyword?: string; seoDescription?: string }
): FacilityTopicDef {
  const guideType = opts?.guideType ?? "service_method";
  return {
    topicSlug,
    h1,
    focus,
    guideType,
    indexable: true,
    seoTitle: `${h1} | 클린아이덱스`,
    seoDescription: opts?.seoDescription ?? `${focus} 청소 방법·순서·약품.`,
    coupangKeyword: opts?.coupangKeyword,
  };
}

function withOverview(name: string, focus: string, items: FacilityTopicDef[]): FacilityTopicDef[] {
  return [
    topic("overview", `${name} 방법 총정리`, focus, {
      seoDescription: `${name} 범위·주기·순서를 한눈에 정리합니다.`,
    }),
    ...items,
    topic("supplies", `${name} 약품·장비`, `${name} 약품`, {
      guideType: "service_supplies",
      coupangKeyword: "청소용품",
    }),
  ];
}

export const FACTORY_REGULAR_TOPICS = withOverview("공장·창고 정기청소", "공장·창고", [
  topic("floor", "공장 바닥 청소", "공장 바닥·에폭시", { coupangKeyword: "공장 바닥 세제" }),
  topic("oil-grease", "공장 기름때·유분 청소", "기계 유분·바닥 기름", { coupangKeyword: "기름때 제거" }),
  topic("restroom", "공장 화장실 청소", "공장 화장실", { coupangKeyword: "화장실 청소" }),
  topic("dust", "공장 분진·먼지 제거", "공장 분진", { coupangKeyword: "산업용 진공" }),
  topic("warehouse", "창고·적재 구역 청소", "창고 바닥", { coupangKeyword: "창고 청소" }),
  topic("production", "생산라인·설비 주변 청소", "생산라인", { coupangKeyword: "설비 세정" }),
  topic("safety", "공장 청소 안전·화학물질", "공장 안전", { coupangKeyword: "안전 장갑" }),
  topic("exterior", "공장 외부·주차장 청소", "공장 외부", { coupangKeyword: "고압 세척" }),
]);

export const GYM_REGULAR_TOPICS = withOverview("헬스장 청소", "헬스장", [
  topic("floor", "헬스장 바닥 청소", "헬스장 바닥·고무", { coupangKeyword: "헬스장 바닥" }),
  topic("equipment", "운동기구·머신 청소", "운동기구", { coupangKeyword: "소독 스프레이" }),
  topic("locker-room", "락커룸 청소", "락커룸", { coupangKeyword: "락커룸 청소" }),
  topic("shower", "샤워실·탈의실 청소", "헬스장 샤워실", { coupangKeyword: "샤워실 청소" }),
  topic("restroom", "헬스장 화장실 청소", "헬스장 화장실", { coupangKeyword: "화장실 청소" }),
  topic("mirror-glass", "거울·유리 청소", "헬스장 유리", { coupangKeyword: "유리세정제" }),
  topic("odor", "헬스장 냄새·습기 관리", "헬스장 냄새", { coupangKeyword: "탈취제" }),
  topic("weights", "웨이트·카디오 구역", "웨이트 구역", { coupangKeyword: "헬스장 청소" }),
]);

export const HOSPITAL_REGULAR_TOPICS = withOverview("병원·클리닉 정기청소", "병원·클리닉", [
  topic("floor", "병원 바닥 청소", "병원 바닥", { coupangKeyword: "병원 바닥" }),
  topic("restroom", "병원 화장실 청소", "병원 화장실", { coupangKeyword: "화장실 소독" }),
  topic("waiting", "대기실·로비 청소", "병원 대기실", { coupangKeyword: "병원 청소" }),
  topic("treatment", "진료실·처치실 청소", "진료실", { coupangKeyword: "의료용 소독" }),
  topic("waste", "의료 폐기물 구역", "폐기물 보관", { coupangKeyword: "병원 청소" }),
  topic("glass", "병원 유리·창문", "병원 유리", { coupangKeyword: "유리세정제" }),
  topic("infection", "감염 예방·소독", "병원 소독", { coupangKeyword: "소독제" }),
  topic("night", "야간·휴일 병원 청소", "야간 청소", { coupangKeyword: "병원 청소" }),
]);

export const SCHOOL_REGULAR_TOPICS = withOverview("학교·학원 정기청소", "학교·학원", [
  topic("classroom", "교실 청소", "교실", { coupangKeyword: "교실 청소" }),
  topic("restroom", "학교 화장실 청소", "학교 화장실", { coupangKeyword: "화장실 청소" }),
  topic("floor", "학교 복도·바닥 청소", "학교 바닥", { coupangKeyword: "바닥 청소" }),
  topic("cafeteria", "급식실·식당 청소", "급식실", { coupangKeyword: "주방 세제" }),
  topic("playground", "운동장·체육관", "운동장", { coupangKeyword: "체육관 청소" }),
  topic("office", "교무실·행정실", "교무실", { coupangKeyword: "사무실 청소" }),
  topic("windows", "학교 창문·유리", "학교 창문", { coupangKeyword: "창문 청소" }),
  topic("dust", "분진·먼지 제거", "학교 먼지", { coupangKeyword: "먼지 제거" }),
]);

export const BUILDING_REGULAR_TOPICS = withOverview("건물 정기청소", "건물 통합 관리", [
  topic("lobby", "건물 로비 청소", "건물 로비", { coupangKeyword: "로비 청소" }),
  topic("floor", "건물 바닥·복도", "건물 바닥", { coupangKeyword: "바닥 청소" }),
  topic("elevator", "엘리베이터 청소", "엘리베이터", { coupangKeyword: "엘리베이터 청소" }),
  topic("restroom", "건물 화장실", "건물 화장실", { coupangKeyword: "화장실 청소" }),
  topic("parking", "지하주차장 청소", "주차장", { coupangKeyword: "주차장 청소" }),
  topic("rooftop", "옥상·기계실", "옥상", { coupangKeyword: "건물 청소" }),
  topic("exterior", "건물 외부·입구", "건물 외부", { coupangKeyword: "외벽 청소" }),
  topic("tenant", "입주사 퇴실·인수인계", "입주사 청소", { coupangKeyword: "건물 청소" }),
]);

export const APARTMENT_COMMON_TOPICS = withOverview("아파트 공용부 청소", "아파트 공용부", [
  topic("stairwell", "계단·복도 청소", "아파트 계단", { coupangKeyword: "계단 청소" }),
  topic("elevator", "엘리베이터 청소", "아파트 엘리베이터", { coupangKeyword: "엘리베이터" }),
  topic("parking", "지하주차장 청소", "아파트 주차장", { coupangKeyword: "주차장" }),
  topic("trash", "분리수거·쓰레기장", "분리수거장", { coupangKeyword: "공용부 청소" }),
  topic("lobby", "관리사무소·로비", "아파트 로비", { coupangKeyword: "로비 청소" }),
  topic("playground", "놀이터·커뮤니티", "놀이터", { coupangKeyword: "아파트 청소" }),
  topic("rooftop", "옥상·옥탑", "옥상", { coupangKeyword: "아파트 청소" }),
  topic("meter", "전기실·기계실", "기계실", { coupangKeyword: "공용부" }),
]);

export const MOVE_OUT_TOPICS = withOverview("이사·퇴거 청소", "이사·퇴거", [
  topic("kitchen", "퇴거 주방 청소", "퇴거 주방", { coupangKeyword: "주방 기름때" }),
  topic("bathroom", "퇴거 욕실 청소", "퇴거 욕실", { coupangKeyword: "욕실 청소" }),
  topic("floor", "퇴거 바닥 청소", "퇴거 바닥", { coupangKeyword: "바닥 청소" }),
  topic("windows", "퇴거 창문·샷시", "퇴거 창문", { coupangKeyword: "창문 청소" }),
  topic("balcony", "베란다·다용도실", "베란다", { coupangKeyword: "베란다 청소" }),
  topic("appliance", "가전·붙박이장", "가전 청소", { coupangKeyword: "가전 클리너" }),
  topic("wall", "벽면·몰딩·얼룩", "벽면 얼룩", { coupangKeyword: "얼룩 제거" }),
  topic("checklist", "퇴거 청소 체크리스트", "퇴거 점검", { coupangKeyword: "이사 청소" }),
]);

export const RENOVATION_TOPICS = withOverview("준공·리모델링 후 청소", "준공·리모델링", [
  topic("dust", "공사 먼지·분진", "공사 분진", { coupangKeyword: "HEPA 진공" }),
  topic("cement", "백시멘트·시공 잔재", "백시멘트", { coupangKeyword: "시멘트 제거" }),
  topic("kitchen", "준공 주방", "준공 주방", { coupangKeyword: "주방 청소" }),
  topic("bathroom", "준공 욕실", "준공 욕실", { coupangKeyword: "욕실 청소" }),
  topic("floor", "준공 바닥", "준공 바닥", { coupangKeyword: "바닥 청소" }),
  topic("windows", "준공 창문·유리", "준공 유리", { coupangKeyword: "유리 청소" }),
  topic("balcony", "베란다·외부", "베란다", { coupangKeyword: "베란다" }),
  topic("checklist", "준공 청소 체크리스트", "준공 점검", { coupangKeyword: "준공 청소" }),
]);

export const WINDOW_ONE_TIME_TOPICS = withOverview("유리창 청소", "유리창·샷시", [
  topic("interior", "실내 유리 청소", "실내 유리", { coupangKeyword: "유리세정제" }),
  topic("exterior", "외창·고층 유리", "외창 유리", { coupangKeyword: "유리 청소" }),
  topic("frame", "샷시·틀·방충망", "창틀", { coupangKeyword: "창틀 청소" }),
  topic("limescale", "유리 물때·석회", "유리 물때", { coupangKeyword: "유리 물때" }),
  topic("high-rise", "고층·로프 작업", "고층 유리", { coupangKeyword: "유리창 청소" }),
  topic("film", "필름·스티커 제거", "필름 제거", { coupangKeyword: "스크래퍼" }),
  topic("tools", "유리창 청소 장비", "유리 장비", { coupangKeyword: "스퀴지" }),
  topic("safety", "유리창 청소 안전", "안전 작업", { coupangKeyword: "안전 로프" }),
]);

export const EXTERIOR_ONE_TIME_TOPICS = withOverview("외벽 청소", "건물 외벽", [
  topic("concrete", "콘크리트·석재 외벽", "콘크리트 외벽", { coupangKeyword: "외벽 세제" }),
  topic("stain", "외벽 오염·때", "외벽 오염", { coupangKeyword: "외벽 청소" }),
  topic("signage", "간판·어닝 청소", "간판", { coupangKeyword: "간판 청소" }),
  topic("balcony", "베란다 외벽·난간", "베란다 외벽", { coupangKeyword: "베란다" }),
  topic("pressure", "고압 세척", "고압 세척", { coupangKeyword: "고압 세척기" }),
  topic("mold", "외벽 곰팡이·이끼", "외벽 곰팡이", { coupangKeyword: "곰팡이 제거" }),
  topic("safety", "외벽 작업 안전", "외벽 안전", { coupangKeyword: "안전 장비" }),
  topic("schedule", "외벽 청소 주기", "청소 주기", { coupangKeyword: "외벽" }),
]);

export const DISINFECTION_TOPICS = withOverview("소독·방역 청소", "소독·방역", [
  topic("spray", "표면 소독·스프레이", "표면 소독", { coupangKeyword: "소독 스프레이" }),
  topic("fogging", "분무·포그 소독", "분무 소독", { coupangKeyword: "방역" }),
  topic("restroom", "화장실 소독", "화장실 소독", { coupangKeyword: "화장실 소독" }),
  topic("kitchen", "주방·식당 소독", "주방 소독", { coupangKeyword: "식당 소독" }),
  topic("hvac", "에어컨·환기 소독", "HVAC 소독", { coupangKeyword: "에어컨 소독" }),
  topic("schedule", "소독 주기·기록", "소독 주기", { coupangKeyword: "방역" }),
  topic("chemical", "소독제 선택·희석", "소독제", { coupangKeyword: "소독제" }),
  topic("ppe", "보호구·안전", "소독 안전", { coupangKeyword: "보호구" }),
]);
