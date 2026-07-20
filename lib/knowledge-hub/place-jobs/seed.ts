import type { PlaceJob } from "@/lib/knowledge-hub/place-jobs/types";

type Seed = Omit<PlaceJob, "id" | "status"> & { status?: PlaceJob["status"] };

function job(
  placeId: string,
  slug: string,
  title: string,
  body: Omit<Seed, "placeId" | "slug" | "title" | "sortOrder"> & { sortOrder?: number }
): PlaceJob {
  return {
    id: `${placeId}__${slug}`,
    placeId,
    slug,
    title,
    status: "published",
    sortOrder: body.sortOrder ?? 0,
    summary: body.summary,
    prepare: body.prepare ?? [],
    steps: body.steps ?? [],
    motions: body.motions ?? [],
    checklist: body.checklist ?? [],
    frequency: body.frequency,
    cautions: body.cautions ?? [],
    pollutionLinks: body.pollutionLinks,
    relatedServicePath: body.relatedServicePath,
  };
}

/** 기존 category-overview·서비스 가이드를 job으로 쪼갠 시드 */
const SEED: PlaceJob[] = [
  job("office", "round", "사무실 정기청소 한 바퀴", {
    sortOrder: 1,
    summary:
      "사무실 정기청소는 상부 먼지 → 유리 → 화장실 → 탕비실 → 바닥 → 로비 순이 기본입니다.",
    prepare: [
      "중성·유리·화장실용 세제와 마른걸레·물걸레를 구분한다",
      "작업 구역·미끄럼 표지를 준비한다",
      "출입구에서 안쪽으로 들어갔다가 출입구로 나오는 동선을 정한다",
    ],
    steps: [
      "상부 먼지: 책상·모니터·서류함 상단, 화이트보드, 에어컨 틈새",
      "유리·파티션: 출입문·파티션 오염 제거 후 마른 걸레로 잔수 제거",
      "화장실: 변기·세면대·수전·타일·바닥 순",
      "탕비실: 싱크·전자레인지·냉장고 겉면·배수구",
      "바닥: 쓸기(진공) 후 습식 → 마른 걸레 마무리",
      "로비·복도·손잡이: 출입문·엘리베이터 버튼·난간",
    ],
    motions: [
      "먼지는 상부부터 떨어뜨린 뒤 바닥에서 회수한다",
      "바닥은 안쪽→출입구, 물은 적게 쓰고 출입구는 마지막에 건조한다",
    ],
    checklist: [
      "화장실·탕비실 악취·물기",
      "바닥 잔수·미끄럼",
      "손잡이·버튼 닦임",
      "도구 헹굼·보관",
    ],
    frequency: "주 1~3회 정기청소가 일반적이며, 화장실·탕비실은 매일 점검이 필요한 경우가 많습니다.",
    cautions: ["산성·알칼리 세제 혼합 금지", "과습으로 미끄럼·바닥재 손상 주의"],
    pollutionLinks: [
      { label: "화장실 오염 지우기", href: "/pollution" },
      { label: "사무실 솔루션", href: "/solutions" },
    ],
    relatedServicePath: "/services/office-regular/overview",
  }),
  job("office", "floor-mop", "사무실 바닥·걸레질", {
    sortOrder: 2,
    summary: "사무실 바닥은 쓸기 → 물걸레 → 건조 순. 물은 적게, 출입구는 마지막입니다.",
    prepare: [
      "진공·막대걸레, 중성세제 희석액, 마른 걸레",
      "미끄럼 주의 표지",
    ],
    steps: [
      "가구 다리·코너부터 쓸어 먼지를 출입구 쪽으로 모은다",
      "희석액에 적신 걸레로 안쪽→출입구 방향 습식",
      "고오염 구역은 걸레면을 바꿔 가며 반복",
      "마른 걸레로 잔수를 제거하고 통행 전 건조를 확인한다",
    ],
    motions: [
      "물걸레는 8자 또는 당김 동작, 한 방향으로 미끄러뜨리지 않는다",
      "걸레가 더러워지면 바로 헹구거나 면을 바꾼다",
    ],
    checklist: ["코너·문턱 잔먼지", "출입구 물기", "카펫·데코타일 경계"],
    frequency: "정기청소 시마다. 로비는 이용량에 따라 더 자주.",
    cautions: ["과습 금지", "왁스·코팅 바닥은 제품 안내 확인"],
    pollutionLinks: [{ label: "바닥 얼룩·찌든때", href: "/pollution" }],
    relatedServicePath: "/services/office-regular/floor",
  }),
  job("office", "restroom-routine", "사무실 화장실 루틴", {
    sortOrder: 3,
    summary: "사무실 화장실은 변기·세면·수전·타일·바닥 순으로, 마무리에 악취·물기를 점검합니다.",
    prepare: ["화장실용 세제, 변기솔, 걸레, 장갑", "환기·미끄럼 표지"],
    steps: [
      "변기 내외부 → 세면대·수전 → 거울 → 타일·실리콘 → 바닥",
      "휴지·비누 보충, 배수구·트랩 냄새 확인",
      "바닥 잔수 제거 후 환기",
    ],
    motions: ["위에서 아래, 청결 구역 도구와 변기 도구를 섞지 않는다"],
    checklist: ["악취", "물때·요석 눈에 띄는 곳", "바닥 미끄럼"],
    frequency: "매일 점검, 정기청소 시 집중.",
    cautions: ["산성 작업 후 충분히 헹군다", "락스와 산성 혼합 금지"],
    pollutionLinks: [{ label: "변기·세면 오염 제거", href: "/pollution" }],
    relatedServicePath: "/services/office-regular/restroom",
  }),
  job("office", "pantry-routine", "사무실 탕비실 루틴", {
    sortOrder: 4,
    summary: "탕비실은 싱크·전자레인지·냉장고 겉면·배수구·바닥 순으로 기름때와 물기를 잡습니다.",
    prepare: ["중성·주방용 세제, 수세미, 걸레"],
    steps: [
      "싱크대·수전·배수구 주변",
      "전자레인지·냉장고 겉면",
      "카운터·바닥 습식 후 건조",
    ],
    motions: ["기름때는 온수·유화 후 린스", "배수구는 거름망을 비운 뒤 닦는다"],
    checklist: ["배수 냄새", "바닥 끈적임", "쓰레기 비움"],
    frequency: "매일~격일 점검이 많습니다.",
    cautions: ["식기·식품에 세제 잔류 주의"],
    relatedServicePath: "/services/office-regular/pantry",
  }),
  job("office", "glass", "사무실 유리·창문", {
    sortOrder: 5,
    summary: "사무실 유리는 오염을 푼 뒤 마른 걸레로 잔수·자국을 없애는 두 단계가 기본입니다.",
    prepare: ["유리용 세제, 마른 극세사 걸레"],
    steps: [
      "분무 후 오염을 풀어 1차 닦기",
      "마른 걸레로 자국·잔수 제거",
      "손잡이·프레임도 함께 닦기",
    ],
    motions: ["위에서 아래, 원을 크게 그리지 않고 겹치게 닦는다"],
    checklist: ["역광 시 자국", "손잡이 지문"],
    frequency: "정기청소 시, 출입 유리는 더 자주.",
    relatedServicePath: "/services/office-regular/glass",
  }),

  job("gym", "round", "헬스장 정기청소 한 바퀴", {
    sortOrder: 1,
    summary: "헬스장은 입구·운동 공간 → 기구 표면 → 락커·샤워 → 화장실 순으로 마감하는 흐름이 흔합니다.",
    prepare: ["소독·중성세제, 걸레, 미끄럼 표지", "오픈 전·마감 시간 확인"],
    steps: [
      "입구·매트 흙·물기",
      "운동 공간 바닥·거울",
      "기구 손 닿는 면 소독·닦기",
      "락커·샤워 물기·악취",
      "화장실 루틴",
    ],
    motions: ["땀 구역 걸레면 자주 교체", "샤워 바닥은 잔수까지 제거"],
    checklist: ["미끄럼", "악취", "휴지·소모품"],
    frequency: "매일 운영 전·후, 피크 후 중간 점검.",
    cautions: ["과습으로 바닥 미끄럼", "전기 기구에 과수분무 금지"],
    pollutionLinks: [{ label: "헬스장 화장실·락커 오염", href: "/pollution" }],
  }),
  job("gym", "workout-wipe", "헬스장 운동 공간 닦기", {
    sortOrder: 2,
    summary: "운동 공간은 바닥 쓸기·습식과 거울·손 닿는 면 소독이 핵심입니다.",
    prepare: ["진공·걸레, 소독티슈·분무"],
    steps: ["바닥 쓸기", "거울·유리", "벤치·손잡이 등 접촉면", "바닥 습식·건조"],
    motions: ["기구→바닥 순으로 먼지가 아래로 떨어지게"],
    checklist: ["거울 자국", "바닥 잔수"],
    frequency: "피크 후·마감 시.",
  }),
  job("gym", "locker-routine", "헬스장 락커·샤워 루틴", {
    sortOrder: 3,
    summary: "락커·샤워는 물때·악취·바닥 물기를 동선에 맞춰 제거하는 루틴이 중요합니다.",
    prepare: ["화장실·샤워용 세제, 밀대, 환기"],
    steps: ["세면·거울", "샤워부스·바닥", "배수구", "락커 손잡이·바닥", "환기·건조"],
    motions: ["샤워→탈의 방향으로 물기를 밀어낸다"],
    checklist: ["악취", "미끄럼", "배수"],
    frequency: "매일.",
    cautions: ["산성·락스 혼합 금지"],
    pollutionLinks: [{ label: "샤워·세면 물때", href: "/pollution" }],
  }),

  job("academy", "round", "학원 정기청소 한 바퀴", {
    sortOrder: 1,
    summary: "학원은 강의실 → 로비·홀 → 화장실 → 입구 순으로, 수업 후 빠른 정리가 기본입니다.",
    prepare: ["마른걸레·물걸레, 중성세제", "수업 종료 시간 확인"],
    steps: ["강의실 책상·칠판·바닥", "로비·홀", "화장실", "입구·신발 구역"],
    motions: ["칠판은 분진이 아래로 떨어지므로 바닥을 마지막에"],
    checklist: ["분필·마커 가루", "바닥 물기", "휴지"],
    frequency: "수업일 매일 또는 격일.",
    pollutionLinks: [{ label: "학원 화장실 오염", href: "/pollution" }],
  }),
  job("academy", "classroom", "학원 강의실 정리", {
    sortOrder: 2,
    summary: "강의실은 책상·칠판·바닥 순으로, 분진을 먼저 잡고 바닥을 마무리합니다.",
    prepare: ["칠판 지우개·걸레, 진공 또는 마른걸레"],
    steps: ["책상 상면·다리", "칠판·트레이", "창가·코너 먼지", "바닥 쓸기·습식"],
    motions: ["위에서 아래", "책상 사이 통로를 막지 않게 동선"],
    checklist: ["분필가루", "쓰레기", "의자 정렬"],
    frequency: "수업 종료 후.",
  }),
  job("academy", "hall", "학원 로비·홀", {
    sortOrder: 3,
    summary: "로비·홀은 대기·통행 바닥과 손 닿는 면을 짧게 자주 닦습니다.",
    prepare: ["걸레, 손잡이 소독"],
    steps: ["바닥 쓸기·습식", "대기 의자", "출입 손잡이"],
    checklist: ["출입구 물기", "쓰레기"],
    frequency: "쉬는 시간·마감.",
  }),
  job("academy", "restroom-routine", "학원 화장실 루틴", {
    sortOrder: 4,
    summary: "학원 화장실은 쉬는 시간에 이용이 몰려 물때·악취·물기 점검이 중요합니다.",
    prepare: ["화장실용 세제, 걸레"],
    steps: ["변기·세면", "바닥", "휴지·비누", "환기"],
    checklist: ["악취", "미끄럼"],
    frequency: "수업일 여러 차례 점검.",
    pollutionLinks: [{ label: "화장실 오염 제거", href: "/pollution" }],
  }),

  job("home", "round", "가정집 청소 한 바퀴", {
    sortOrder: 1,
    summary: "가정집은 상부 먼지 → 주방·화장실 → 바닥 → 현관 순으로 한 바퀴 도는 흐름이 기본입니다.",
    prepare: ["구역별 걸레 구분", "세제 희석"],
    steps: ["거실·침실 상부", "주방", "화장실·욕실", "바닥", "현관"],
    motions: ["오염 구역 도구를 거실에 쓰지 않는다"],
    checklist: ["배수구", "바닥 잔수", "쓰레기"],
    frequency: "주 1~2회 전체, 주방·화장실은 더 자주.",
    pollutionLinks: [{ label: "가정 오염 지우기", href: "/pollution" }],
  }),
  job("shop", "round", "상가 청소 한 바퀴", {
    sortOrder: 1,
    summary: "상가는 입구·유리 → 매장 홀 → 카운터 → 화장실 순으로 첫인상 구역을 먼저 잡습니다.",
    prepare: ["유리·바닥·화장실 세제", "폐점 후 동선"],
    steps: ["입구·쇼윈도", "홀·바닥", "카운터", "화장실", "건조·마감"],
    checklist: ["유리 자국", "바닥 미끄럼", "화장실 악취"],
    frequency: "매일 폐점 후 또는 주 2~3회.",
    relatedServicePath: "/services/commercial-regular/overview",
  }),
];

export function buildPlaceJobsSeed(): PlaceJob[] {
  return SEED;
}

export const SOURCE_PLACE_JOBS = buildPlaceJobsSeed();
