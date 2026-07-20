import type {
  ContaminantMasterExt,
  MaterialContaminantMaster,
  SolutionPage,
  SolutionPlaceId,
  SolutionSpaceId,
  SolutionsDb,
} from "@/lib/knowledge-hub/solutions/types";
import {
  PLACE_SPACE_ORDER,
  SOLUTION_PARTS,
  SOLUTION_PLACES,
  SOLUTION_SPACES,
  getPlaceLabel,
  getSpaceLabel,
} from "@/lib/knowledge-hub/solutions/taxonomy";

const CONTAMINANT_MASTERS: ContaminantMasterExt[] = [
  {
    contaminantId: "limescale",
    defaultProductIds: ["kiehl-powerfix-gel", "kiehl-santex", "kiehl-vinoxin"],
    baseGuide:
      "요석은 소변·석회가 굳은 무기질 오염입니다. 산성 계열 세제와 적절한 접촉 시간 후 강한 연마 없이 제거합니다. 재질별 희석·금기를 확인하세요.",
    warnings: [
      "락스·염소계·알칼리성 세제와 혼합하지 않는다.",
      "크롬 수전·대리석·황동·알루미늄 등에는 사용하지 않는다.",
      "보호장갑·보안경을 착용한다.",
    ],
  },
  {
    contaminantId: "lime-deposit",
    defaultProductIds: ["kiehl-vinoxin", "kiehl-tornado"],
    baseGuide: "석회·백화는 경수 잔류·석회질 침착입니다. 요석과 구분하되 산성 세정·린스 흐름은 유사합니다.",
  },
  {
    contaminantId: "water-spot",
    defaultProductIds: ["kiehl-tornado", "kiehl-glasking"],
    baseGuide: "물때는 물기 건조 자국입니다. 유리·수전·도기에서 흔하며, 마른 뒤 전용·중성~약산성으로 닦아냅니다.",
  },
  {
    contaminantId: "soap-scum",
    defaultProductIds: ["kiehl-tornado", "kiehl-tablefit"],
    baseGuide: "비누찌꺼기는 지방·계면활성제 잔류가 뭉친 오염입니다. 알칼리~중성으로 불리게 한 뒤 린스합니다.",
  },
  {
    contaminantId: "mold",
    defaultProductIds: ["kiehl-santex", "kiehl-tornado"],
    baseGuide: "곰팡이는 표백만으로 끝나지 않습니다. 실리콘·줄눈은 표면 처리와 습도 관리가 함께 필요합니다.",
    warnings: ["밀폐·환기 부족 시 재발합니다. 락스 단독 의존을 피하세요."],
  },
  {
    contaminantId: "nicotine",
    defaultProductIds: ["kiehl-tornado", "kiehl-powerfix-gel"],
    baseGuide: "니코틴·담배 잔류는 천장·환풍기·실리콘에 잘 붙습니다. 알칼리·디그리서 계열로 단계 세정합니다.",
  },
  {
    contaminantId: "stain-discoloration",
    defaultProductIds: ["kiehl-tornado", "kiehl-santex"],
    baseGuide: "찌든 때·변색은 원인에 따라 제품이 달라집니다. 부위·재질을 확인한 뒤 처방합니다.",
  },
  {
    contaminantId: "odor",
    defaultProductIds: ["kiehl-tornado"],
    baseGuide: "악취는 표면 오염 제거와 배수·트랩 점검이 우선입니다. 향만 덮지 마세요.",
  },
  {
    contaminantId: "rust",
    defaultProductIds: ["kiehl-ruginoff", "kiehl-vinoxin"],
    baseGuide: "녹은 산성 녹 제거 후 즉시 중화·린스합니다. 도금·약한 금속은 사전 테스트하세요.",
  },
  {
    contaminantId: "grease",
    defaultProductIds: ["kiehl-powerfix-gel", "kiehl-tornado"],
    baseGuide: "기름때는 알칼리·유화 세제와 온수로 녹인 뒤 충분히 린스합니다.",
  },
  {
    contaminantId: "dust",
    defaultProductIds: ["kiehl-tornado"],
    baseGuide: "먼지는 건식→습식 순으로 제거하고, 천장·환풍기는 낙하 오염에 주의합니다.",
  },
];

const MATERIAL_CONTAMINANTS: MaterialContaminantMaster[] = [
  {
    id: "porcelain-limescale",
    materialId: "porcelain",
    contaminantId: "limescale",
    notes: "도기 변기·소변기 요석 — 산성 접촉 후 소프트 도구",
    recipeSlugs: ["powerfix-gel-neat-toilet-limescale", "santex-toilet-neat"],
  },
  {
    id: "porcelain-water-spot",
    materialId: "porcelain",
    contaminantId: "water-spot",
  },
  {
    id: "glass-water-spot",
    materialId: "glass",
    contaminantId: "water-spot",
  },
  {
    id: "glass-lime-deposit",
    materialId: "glass",
    contaminantId: "lime-deposit",
  },
  {
    id: "chrome-faucet-water-spot",
    materialId: "chrome-faucet",
    contaminantId: "water-spot",
    warnings: ["수전 도금은 연마·강산을 피하세요."],
  },
  {
    id: "chrome-faucet-rust",
    materialId: "chrome-faucet",
    contaminantId: "rust",
  },
  {
    id: "silicone-mold",
    materialId: "silicone",
    contaminantId: "mold",
    warnings: ["손상된 실리콘은 교체가 필요할 수 있습니다."],
  },
  {
    id: "grout-mold",
    materialId: "grout",
    contaminantId: "mold",
  },
  {
    id: "ceramic-tile-water-spot",
    materialId: "ceramic-tile",
    contaminantId: "water-spot",
  },
  {
    id: "ceramic-tile-limescale",
    materialId: "ceramic-tile",
    contaminantId: "limescale",
  },
];

type Row = Omit<SolutionPage, "id" | "status" | "slug"> & { slug?: string };

function toPage(r: Row): SolutionPage {
  const slug = r.slug ?? r.contaminantId;
  return {
    ...r,
    slug,
    id: `${r.placeId}__${r.spaceId}__${r.partId}__${slug}`,
    status: "published",
  };
}

/** MVP allowlist + 장소별 화장실 복제 원본 */
const BASE_ROWS: Row[] = [
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "limescale",
    title: "가정집 화장실 변기 요석 제거",
    materialId: "porcelain",
    materialContaminantId: "porcelain-limescale",
    productIds: ["kiehl-powerfix-gel", "kiehl-santex"],
    placeContext: "가정집 양변기 도기면의 요석이 수면선·가장자리에 붙는 경우가 많습니다.",
    description:
      "가정집 화장실 변기 요석 제거 — 한줄 요약, 추천 세제, 제거 단계, 주의사항.",
    detail: {
      summary:
        "변기에 노랗거나 갈색으로 단단하게 붙어 있는 오염은 대부분 요석입니다.",
      difficulty: 5,
      locations: ["변기 수면 아래", "변기 테두리", "배수구"],
      recommendations: [
        { productId: "kiehl-powerfix-gel", label: "키엘 파워픽스젤", rating: 5 },
        { productId: "kiehl-santex", label: "산성세제", rating: 4 },
        { label: "구연산", rating: 2 },
      ],
      methodSteps: [
        "변기 내부 혹은 배수구의 물을 가능한 한 낮춘다.",
        "파워픽스젤 원액을 오염 부위에 충분히 도포한다.",
        "약 5분 방치한다. (표면에서 세제가 마르지 않게 한다.)",
        "변기솔·내산성 수세미로 문지른 뒤 깨끗한 물로 헹군다.",
        "남으면 짧은 반응과 헹굼을 반복한다.",
      ],
      cautions: ["락스 혼합 금지", "대리석 사용 금지", "장갑 착용"],
      ifFails: ["요석이 아닌 백시멘트", "오랫동안 굳은 석회", "도기 손상"],
    },
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "water-spot",
    title: "가정집 화장실 변기 물때 제거",
    materialId: "porcelain",
    description: "가정집 화장실 변기 물때 제거 안내.",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "stain-discoloration",
    slug: "stubborn-stain",
    title: "가정집 화장실 변기 찌든때 제거",
    materialId: "porcelain",
    placeContext: "찌든 때는 요석·물때와 겹칠 수 있어 원인을 나눈 뒤 순서대로 처방합니다.",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "nicotine",
    title: "가정집 화장실 변기 니코틴 제거",
    materialId: "porcelain",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "stain-discoloration",
    slug: "discoloration",
    title: "가정집 화장실 변기 변색 제거",
    materialId: "porcelain",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "odor",
    title: "가정집 화장실 변기 악취 제거",
    materialId: "porcelain",
    placeContext: "변기 악취는 트랩·가장자리 잔류·배수와 함께 확인합니다.",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "sink",
    contaminantId: "water-spot",
    title: "가정집 화장실 세면대 물때 제거",
    materialId: "porcelain",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "sink",
    contaminantId: "soap-scum",
    title: "가정집 화장실 세면대 비누찌꺼기 제거",
    materialId: "porcelain",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "sink",
    contaminantId: "lime-deposit",
    title: "가정집 화장실 세면대 석회 제거",
    materialId: "porcelain",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "faucet",
    contaminantId: "water-spot",
    title: "가정집 화장실 수전 물때 제거",
    materialId: "chrome-faucet",
    materialContaminantId: "chrome-faucet-water-spot",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "faucet",
    contaminantId: "water-spot",
    slug: "sink-faucet-water-spot",
    title: "가정집 화장실 세면대 수전 물때 제거",
    materialId: "chrome-faucet",
    materialContaminantId: "chrome-faucet-water-spot",
    placeContext: "세면대 수전 도금면의 물때·물때가 끼기 쉽습니다.",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "faucet",
    contaminantId: "rust",
    title: "가정집 화장실 세면대 수전 녹 제거",
    materialId: "chrome-faucet",
    materialContaminantId: "chrome-faucet-rust",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "sink",
    contaminantId: "soap-scum",
    slug: "soap-scum-general",
    title: "가정집 화장실 비누찌꺼기 제거",
    placeContext: "세면대·타일·수전 주변 비누막을 함께 볼 때.",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "mirror",
    contaminantId: "water-spot",
    title: "가정집 화장실 거울 물때 제거",
    materialId: "glass",
    materialContaminantId: "glass-water-spot",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "mirror",
    contaminantId: "lime-deposit",
    slug: "whitening",
    title: "가정집 화장실 거울 백화 제거",
    materialId: "glass",
    materialContaminantId: "glass-lime-deposit",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "mirror",
    contaminantId: "lime-deposit",
    title: "가정집 화장실 거울 석회 제거",
    materialId: "glass",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "shower-booth",
    contaminantId: "water-spot",
    title: "가정집 화장실 샤워부스 유리 물때 제거",
    materialId: "glass",
    materialContaminantId: "glass-water-spot",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "shower-booth",
    contaminantId: "lime-deposit",
    title: "가정집 화장실 샤워부스 석회 제거",
    materialId: "glass",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "shower-booth",
    contaminantId: "mold",
    slug: "silicone-mold",
    title: "가정집 화장실 샤워부스 실리콘 곰팡이 제거",
    materialId: "silicone",
    materialContaminantId: "silicone-mold",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "silicone",
    contaminantId: "mold",
    title: "가정집 화장실 실리콘 곰팡이 제거",
    materialId: "silicone",
    materialContaminantId: "silicone-mold",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "silicone",
    contaminantId: "stain-discoloration",
    slug: "discoloration",
    title: "가정집 화장실 실리콘 변색 제거",
    materialId: "silicone",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "silicone",
    contaminantId: "nicotine",
    title: "가정집 화장실 실리콘 니코틴 제거",
    materialId: "silicone",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "grout",
    contaminantId: "mold",
    title: "가정집 화장실 줄눈 곰팡이 제거",
    materialId: "grout",
    materialContaminantId: "grout-mold",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "grout",
    contaminantId: "lime-deposit",
    slug: "whitening",
    title: "가정집 화장실 줄눈 백화 제거",
    materialId: "grout",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "grout",
    contaminantId: "water-spot",
    title: "가정집 화장실 줄눈 물때 제거",
    materialId: "grout",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "grout",
    contaminantId: "stain-discoloration",
    slug: "discoloration",
    title: "가정집 화장실 줄눈 변색 제거",
    materialId: "grout",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "tile",
    contaminantId: "water-spot",
    title: "가정집 화장실 타일 물때 제거",
    materialId: "ceramic-tile",
    materialContaminantId: "ceramic-tile-water-spot",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "tile",
    contaminantId: "limescale",
    title: "가정집 화장실 타일 요석 제거",
    materialId: "ceramic-tile",
    materialContaminantId: "ceramic-tile-limescale",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "tile",
    contaminantId: "lime-deposit",
    slug: "whitening",
    title: "가정집 화장실 타일 백화 제거",
    materialId: "ceramic-tile",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "tile",
    contaminantId: "lime-deposit",
    title: "가정집 화장실 타일 석회 제거",
    materialId: "ceramic-tile",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "tile",
    contaminantId: "soap-scum",
    title: "가정집 화장실 타일 비누찌꺼기 제거",
    materialId: "ceramic-tile",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "tile",
    contaminantId: "mold",
    title: "가정집 화장실 타일 곰팡이 제거",
    materialId: "ceramic-tile",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "ceiling",
    contaminantId: "nicotine",
    title: "가정집 화장실 천장 니코틴 제거",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "ceiling",
    contaminantId: "mold",
    title: "가정집 화장실 천장 곰팡이 제거",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "ceiling",
    contaminantId: "dust",
    title: "가정집 화장실 천장 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "fan",
    contaminantId: "nicotine",
    title: "가정집 화장실 환풍기 니코틴 제거",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "fan",
    contaminantId: "grease",
    title: "가정집 화장실 환풍기 기름때 제거",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "fan",
    contaminantId: "dust",
    title: "가정집 화장실 환풍기 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "restroom",
    partId: "tile",
    contaminantId: "mold",
    slug: "mold-general",
    title: "가정집 화장실 곰팡이 제거",
    placeContext: "타일·줄눈·실리콘을 넓게 볼 때의 입구 페이지입니다. 부위별로 처방을 세분화하세요.",
  },
  // —— 가정집 주방
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "sink",
    contaminantId: "water-spot",
    title: "가정집 주방 싱크대 물때 제거",
    materialId: "stainless",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "sink",
    contaminantId: "lime-deposit",
    title: "가정집 주방 싱크대 석회 제거",
    materialId: "stainless",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "sink",
    contaminantId: "grease",
    title: "가정집 주방 싱크대 기름때 제거",
    materialId: "stainless",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "sink",
    contaminantId: "rust",
    title: "가정집 주방 싱크대 녹 제거",
    materialId: "stainless",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "faucet",
    contaminantId: "water-spot",
    title: "가정집 주방 싱크대 수전 물때 제거",
    materialId: "chrome-faucet",
    materialContaminantId: "chrome-faucet-water-spot",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "countertop",
    contaminantId: "stain-discoloration",
    slug: "stubborn-stain",
    title: "가정집 주방 상판 찌든때 제거",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "hood",
    contaminantId: "grease",
    title: "가정집 주방 후드 기름때 제거",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "tile",
    contaminantId: "grease",
    title: "가정집 주방 타일 기름때 제거",
    materialId: "ceramic-tile",
  },
  {
    placeId: "home",
    spaceId: "kitchen",
    partId: "drain",
    contaminantId: "odor",
    title: "가정집 주방 배수구 악취 제거",
  },
  // —— 거실
  {
    placeId: "home",
    spaceId: "living",
    partId: "floor",
    contaminantId: "dust",
    title: "가정집 거실 바닥 먼지 제거",
    materialId: "laminate-wood",
  },
  {
    placeId: "home",
    spaceId: "living",
    partId: "sofa",
    contaminantId: "stain-discoloration",
    slug: "stubborn-stain",
    title: "가정집 거실 소파 찌든때 제거",
  },
  {
    placeId: "home",
    spaceId: "living",
    partId: "aircon",
    contaminantId: "mold",
    title: "가정집 거실 에어컨 곰팡이 제거",
  },
  {
    placeId: "home",
    spaceId: "living",
    partId: "aircon",
    contaminantId: "dust",
    title: "가정집 거실 에어컨 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "living",
    partId: "wallpaper",
    contaminantId: "mold",
    title: "가정집 거실 벽지 곰팡이 제거",
  },
  {
    placeId: "home",
    spaceId: "living",
    partId: "ceiling",
    contaminantId: "nicotine",
    title: "가정집 거실 천장 니코틴 제거",
  },
  {
    placeId: "home",
    spaceId: "living",
    partId: "blind",
    contaminantId: "dust",
    title: "가정집 거실 블라인드 먼지 제거",
  },
  // —— 침실
  {
    placeId: "home",
    spaceId: "bedroom",
    partId: "mattress",
    contaminantId: "dust",
    title: "가정집 침실 매트리스 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "bedroom",
    partId: "mattress",
    contaminantId: "odor",
    title: "가정집 침실 매트리스 악취 제거",
  },
  {
    placeId: "home",
    spaceId: "bedroom",
    partId: "floor",
    contaminantId: "dust",
    title: "가정집 침실 바닥 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "bedroom",
    partId: "wallpaper",
    contaminantId: "mold",
    title: "가정집 침실 벽지 곰팡이 제거",
  },
  // —— 현관
  {
    placeId: "home",
    spaceId: "entrance",
    partId: "floor",
    contaminantId: "dust",
    title: "가정집 현관 바닥 먼지 제거",
    materialId: "ceramic-tile",
  },
  {
    placeId: "home",
    spaceId: "entrance",
    partId: "shoe-cabinet",
    contaminantId: "dust",
    title: "가정집 현관 신발장 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "entrance",
    partId: "shoe-cabinet",
    contaminantId: "odor",
    title: "가정집 현관 신발장 악취 제거",
  },
  {
    placeId: "home",
    spaceId: "entrance",
    partId: "door-frame",
    contaminantId: "dust",
    title: "가정집 현관 문틀 먼지 제거",
  },
  // —— 베란다
  {
    placeId: "home",
    spaceId: "balcony",
    partId: "floor",
    contaminantId: "dust",
    title: "가정집 베란다 바닥 먼지 제거",
    materialId: "ceramic-tile",
  },
  {
    placeId: "home",
    spaceId: "balcony",
    partId: "drain",
    contaminantId: "odor",
    title: "가정집 베란다 배수구 악취 제거",
  },
  {
    placeId: "home",
    spaceId: "balcony",
    partId: "screen",
    contaminantId: "dust",
    title: "가정집 베란다 방충망 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "balcony",
    partId: "sash-rail",
    contaminantId: "dust",
    title: "가정집 베란다 샷시 먼지 제거",
  },
  // —— 세탁실·다용도실
  {
    placeId: "home",
    spaceId: "laundry",
    partId: "drain",
    contaminantId: "odor",
    title: "가정집 세탁실 배수구 악취 제거",
  },
  {
    placeId: "home",
    spaceId: "laundry",
    partId: "floor",
    contaminantId: "mold",
    title: "가정집 다용도실 바닥 곰팡이 제거",
  },
  {
    placeId: "home",
    spaceId: "utility",
    partId: "faucet",
    contaminantId: "water-spot",
    title: "가정집 다용도실 수전 물때 제거",
    materialId: "chrome-faucet",
  },
  {
    placeId: "home",
    spaceId: "laundry",
    partId: "molding",
    contaminantId: "dust",
    title: "가정집 세탁실 몰딩 먼지 제거",
  },
  // —— 창·샷시
  {
    placeId: "home",
    spaceId: "windows",
    partId: "window",
    contaminantId: "water-spot",
    title: "가정집 유리창 물때 제거",
    materialId: "glass",
  },
  {
    placeId: "home",
    spaceId: "windows",
    partId: "sash-rail",
    contaminantId: "dust",
    title: "가정집 샷시 창틀 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "windows",
    partId: "sash-rail",
    contaminantId: "grease",
    title: "가정집 샷시 찌든때 제거",
    slug: "stubborn-grease",
  },
  {
    placeId: "home",
    spaceId: "windows",
    partId: "screen",
    contaminantId: "dust",
    title: "가정집 방충망 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "windows",
    partId: "sash-rail",
    contaminantId: "mold",
    title: "가정집 창틀 곰팡이 제거",
  },
  // —— 서재
  {
    placeId: "home",
    spaceId: "study",
    partId: "desk",
    contaminantId: "dust",
    title: "가정집 서재 책상 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "study",
    partId: "floor",
    contaminantId: "dust",
    title: "가정집 공부방 바닥 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "study",
    partId: "window",
    contaminantId: "water-spot",
    title: "가정집 서재 유리창 물때 제거",
  },
  // —— 드레스룸
  {
    placeId: "home",
    spaceId: "dressroom",
    partId: "closet",
    contaminantId: "mold",
    title: "가정집 드레스룸 옷장 곰팡이 제거",
  },
  {
    placeId: "home",
    spaceId: "dressroom",
    partId: "closet",
    contaminantId: "odor",
    title: "가정집 드레스룸 옷장 악취 제거",
  },
  {
    placeId: "home",
    spaceId: "dressroom",
    partId: "floor",
    contaminantId: "dust",
    title: "가정집 드레스룸 바닥 먼지 제거",
  },
  // —— 팬트리
  {
    placeId: "home",
    spaceId: "pantry",
    partId: "closet",
    contaminantId: "dust",
    title: "가정집 팬트리 선반 먼지 제거",
  },
  {
    placeId: "home",
    spaceId: "pantry",
    partId: "closet",
    contaminantId: "grease",
    title: "가정집 팬트리 기름때 제거",
  },
  // —— shop restroom
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "urinal",
    contaminantId: "limescale",
    title: "상가 화장실 소변기 요석 제거",
    materialId: "porcelain",
    materialContaminantId: "porcelain-limescale",
    placeContext: "상가·공용 소변기는 요석·악취가 빠르게 쌓입니다. 주기 세정이 중요합니다.",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "urinal",
    contaminantId: "water-spot",
    title: "상가 화장실 소변기 물때 제거",
    materialId: "porcelain",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "urinal",
    contaminantId: "odor",
    title: "상가 화장실 소변기 악취 제거",
    materialId: "porcelain",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "urinal",
    contaminantId: "lime-deposit",
    slug: "whitening",
    title: "상가 화장실 소변기 백화 제거",
    materialId: "porcelain",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "urinal",
    contaminantId: "lime-deposit",
    title: "상가 화장실 소변기 석회 제거",
    materialId: "porcelain",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "limescale",
    title: "상가 화장실 양변기 요석 제거",
    materialId: "porcelain",
    materialContaminantId: "porcelain-limescale",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "toilet",
    contaminantId: "water-spot",
    title: "상가 화장실 양변기 물때 제거",
    materialId: "porcelain",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "sink",
    contaminantId: "water-spot",
    title: "상가 화장실 세면대 물때 제거",
    materialId: "porcelain",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "faucet",
    contaminantId: "water-spot",
    title: "상가 화장실 수전 물때 제거",
    materialId: "chrome-faucet",
    materialContaminantId: "chrome-faucet-water-spot",
  },
  {
    placeId: "shop",
    spaceId: "restroom",
    partId: "mirror",
    contaminantId: "water-spot",
    title: "상가 화장실 거울 물때 제거",
    materialId: "glass",
    materialContaminantId: "glass-water-spot",
  },
];

/** 다른 장소로 복제할 때: 원본 공간 → 대상 공간 (+ 부위 필터 선택) */
type SpaceCloneRule = {
  toPlaces: SolutionPlaceId[];
  toSpace: SolutionSpaceId;
  fromPlace: SolutionPlaceId;
  fromSpaces: SolutionSpaceId[];
  /** 있으면 해당 부위만 */
  partIds?: SolutionPage["partId"][];
  contextByPlace?: Partial<Record<SolutionPlaceId, string>>;
};

const COMMERCIAL: SolutionPlaceId[] = [
  "shop",
  "restaurant",
  "cafe",
  "salon",
  "office",
  "hospital",
  "gym",
  "academy",
];

const SPACE_CLONE_RULES: SpaceCloneRule[] = [
  {
    toPlaces: COMMERCIAL,
    toSpace: "restroom",
    fromPlace: "home",
    fromSpaces: ["restroom", "bathroom"],
    contextByPlace: {
      shop: "상가·공용 화장실은 이용 빈도가 높아 요석·물때·악취가 빠르게 쌓입니다.",
      restaurant: "식당 화장실은 손님·직원이 함께 써서 물때·악취 관리 주기가 중요합니다.",
      cafe: "카페 화장실은 공간이 좁은 경우가 많아 환기와 물기·물때 관리가 중요합니다.",
      salon: "미용실 화장실·세면은 손님 동선과 가깝고 물때·비누찌꺼기가 잦습니다.",
      office: "사무실 화장실은 공용으로 요석·물때·악취를 주기적으로 관리하는 것이 좋습니다.",
      hospital: "병원·의원 화장실은 공용 빈도가 높아 위생·악취·요석 관리가 중요합니다.",
      gym: "헬스장 화장실은 이용이 많아 물때·악취·요석 관리가 중요합니다.",
      academy: "학원 화장실은 수업 사이 이용이 몰려 물때·악취 관리가 필요합니다.",
    },
  },
  {
    toPlaces: ["restaurant", "cafe", "shop"],
    toSpace: "kitchen",
    fromPlace: "home",
    fromSpaces: ["kitchen"],
    contextByPlace: {
      restaurant: "식당 주방은 기름때·배수구 오염이 빠르게 쌓입니다.",
      cafe: "카페 주방·바 주변은 커피·시럽·물때가 겹치기 쉽습니다.",
      shop: "상가 주방·탕비 공간은 기름때와 배수 관리가 중요합니다.",
    },
  },
  {
    toPlaces: ["restaurant", "cafe", "shop", "salon", "academy"],
    toSpace: "hall",
    fromPlace: "home",
    fromSpaces: ["living"],
    contextByPlace: {
      restaurant: "식당 홀은 바닥·테이블 동선 오염이 잦습니다.",
      cafe: "카페 홀·테이블 구역은 음료 얼룩·바닥 먼지가 쌓이기 쉽습니다.",
      shop: "상가 매장 홀은 바닥·유리 동선 관리가 필요합니다.",
      salon: "미용실 대기·홀 공간은 바닥·먼지가 눈에 잘 띕니다.",
      academy: "학원 로비·홀은 대기·통행으로 바닥 먼지가 쌓이기 쉽습니다.",
    },
  },
  {
    toPlaces: ["shop", "cafe", "salon"],
    toSpace: "storefront",
    fromPlace: "home",
    fromSpaces: ["windows"],
    contextByPlace: {
      shop: "상가 쇼윈도·유리는 물때·지문이 잘 남습니다.",
      cafe: "카페 유리·쇼케이스는 물때·지문 관리가 중요합니다.",
      salon: "미용실 유리·창은 물때·지문이 눈에 잘 띕니다.",
    },
  },
  {
    toPlaces: ["shop", "cafe", "salon", "restaurant"],
    toSpace: "counter",
    fromPlace: "home",
    fromSpaces: ["kitchen"],
    partIds: ["countertop", "sink", "faucet", "tile", "drain"],
    contextByPlace: {
      shop: "상가 카운터는 손때·물때가 잦습니다.",
      cafe: "카페 바·카운터는 음료 얼룩·물때가 쌓이기 쉽습니다.",
      salon: "미용실 카운터는 손때·제품 잔여물이 남기 쉽습니다.",
      restaurant: "식당 카운터·패스 주변은 기름·물때가 겹칩니다.",
    },
  },
  {
    toPlaces: COMMERCIAL,
    toSpace: "entrance",
    fromPlace: "home",
    fromSpaces: ["entrance"],
    contextByPlace: {
      shop: "상가 입구·현관은 바닥 흙·물기가 들어옵니다.",
      restaurant: "식당 입구는 바닥·매트 오염이 잦습니다.",
      cafe: "카페 입구는 바닥 흙·물기 관리가 필요합니다.",
      salon: "미용실 입구는 바닥·신발장 오염이 눈에 띕니다.",
      office: "사무실 현관·로비는 바닥 먼지가 쌓이기 쉽습니다.",
      hospital: "병원 로비·입구는 바닥 위생 관리가 중요합니다.",
      gym: "헬스장 입구는 바닥 흙·땀·물기 관리가 필요합니다.",
      academy: "학원 입구는 학생 통행으로 바닥 오염이 잦습니다.",
    },
  },
  {
    toPlaces: ["office"],
    toSpace: "office-floor",
    fromPlace: "home",
    fromSpaces: ["living", "study"],
    contextByPlace: {
      office: "사무공간은 데스크·바닥·먼지 관리가 기본입니다.",
    },
  },
  {
    toPlaces: ["office"],
    toSpace: "pantry-office",
    fromPlace: "home",
    fromSpaces: ["kitchen", "pantry"],
    partIds: ["sink", "faucet", "countertop", "tile", "drain", "floor", "hood"],
    contextByPlace: {
      office: "탕비실은 싱크·배수·바닥 오염이 잦습니다.",
    },
  },
  {
    toPlaces: ["office"],
    toSpace: "meeting",
    fromPlace: "home",
    fromSpaces: ["living"],
    contextByPlace: {
      office: "회의실은 테이블·바닥·유리 오염이 눈에 띕니다.",
    },
  },
  {
    toPlaces: ["hospital"],
    toSpace: "waiting",
    fromPlace: "home",
    fromSpaces: ["living"],
    contextByPlace: {
      hospital: "병원 대기실은 바닥·의자·손때 관리가 중요합니다.",
    },
  },
  {
    toPlaces: ["hospital"],
    toSpace: "clinic",
    fromPlace: "home",
    fromSpaces: ["living", "study"],
    contextByPlace: {
      hospital: "진료실은 바닥·가구·손때 위생이 중요합니다.",
    },
  },
  {
    toPlaces: ["hospital"],
    toSpace: "treatment",
    fromPlace: "home",
    fromSpaces: ["living", "restroom"],
    partIds: ["floor", "tile", "sink", "faucet", "mirror", "drain", "silicone"],
    contextByPlace: {
      hospital: "처치·검사실은 바닥·세면 위생 관리가 중요합니다.",
    },
  },
  {
    toPlaces: ["salon"],
    toSpace: "styling",
    fromPlace: "home",
    fromSpaces: ["restroom", "living"],
    partIds: ["mirror", "sink", "faucet", "floor", "tile", "chair", "drain"],
    contextByPlace: {
      salon: "시술·커트 공간은 거울·바닥·세면 오염이 잦습니다.",
    },
  },
  {
    toPlaces: ["gym"],
    toSpace: "workout",
    fromPlace: "home",
    fromSpaces: ["living"],
    contextByPlace: {
      gym: "헬스장 운동 공간은 바닥·거울·땀 오염 관리가 중요합니다.",
    },
  },
  {
    toPlaces: ["gym"],
    toSpace: "locker",
    fromPlace: "home",
    fromSpaces: ["restroom", "laundry"],
    partIds: ["floor", "sink", "faucet", "mirror", "tile", "drain", "shower-booth"],
    contextByPlace: {
      gym: "락커·샤워는 물때·악취·바닥 물기 관리가 중요합니다.",
    },
  },
  {
    toPlaces: ["academy"],
    toSpace: "classroom",
    fromPlace: "home",
    fromSpaces: ["study", "living"],
    contextByPlace: {
      academy: "학원 강의실은 책상·바닥·칠판 주변 먼지 관리가 기본입니다.",
    },
  },
];

function pageKey(r: Pick<Row, "placeId" | "spaceId" | "partId" | "contaminantId" | "slug">): string {
  const slug = r.slug ?? r.contaminantId;
  return `${r.placeId}__${r.spaceId}__${r.partId}__${slug}`;
}

function rewritePlaceTitle(
  title: string,
  fromPlaceName: string,
  toPlaceName: string,
  fromSpaceLabel: string,
  toSpaceLabel: string
): string {
  let t = title;
  if (t.startsWith(fromPlaceName)) {
    t = toPlaceName + t.slice(fromPlaceName.length);
  }
  if (fromSpaceLabel !== toSpaceLabel && t.includes(fromSpaceLabel)) {
    t = t.replace(fromSpaceLabel, toSpaceLabel);
  }
  return t;
}

function cloneByRules(baseRows: Row[]): Row[] {
  const existing = new Set(baseRows.map((r) => pageKey(r)));
  const clones: Row[] = [];
  const allSources = [...baseRows];

  function addClone(row: Row) {
    const key = pageKey(row);
    if (existing.has(key)) return;
    clones.push(row);
    existing.add(key);
    allSources.push(row);
  }

  for (const rule of SPACE_CLONE_RULES) {
    const sources = allSources.filter(
      (r) =>
        r.placeId === rule.fromPlace &&
        rule.fromSpaces.includes(r.spaceId as SolutionSpaceId) &&
        (!rule.partIds || rule.partIds.includes(r.partId))
    );
    const fromPlaceName = getPlaceLabel(rule.fromPlace);

    for (const placeId of rule.toPlaces) {
      // PLACE_SPACE_ORDER에 없는 공간은 건너뜀
      const allowed = PLACE_SPACE_ORDER[placeId];
      if (allowed && !allowed.includes(rule.toSpace)) continue;

      const placeName = getPlaceLabel(placeId);
      const toSpaceLabel = getSpaceLabel(rule.toSpace, placeId);
      const defaultContext = rule.contextByPlace?.[placeId];

      for (const src of sources) {
        const fromSpaceLabel = getSpaceLabel(src.spaceId, rule.fromPlace);
        const title = rewritePlaceTitle(
          src.title,
          fromPlaceName,
          placeName,
          fromSpaceLabel,
          toSpaceLabel
        );
        const description = src.description
          ? rewritePlaceTitle(
              src.description,
              fromPlaceName,
              placeName,
              fromSpaceLabel,
              toSpaceLabel
            )
          : undefined;
        const placeContext =
          src.placeContext
            ?.replaceAll(fromPlaceName, placeName)
            .replaceAll(fromSpaceLabel, toSpaceLabel) ?? defaultContext;

        addClone({
          ...src,
          placeId,
          spaceId: rule.toSpace,
          title,
          description,
          placeContext,
        });
      }
    }
  }

  // 상가 소변기 → 공용 화장실 있는 다른 장소
  const shopUrinal = allSources.filter(
    (r) => r.placeId === "shop" && r.spaceId === "restroom" && r.partId === "urinal"
  );
  for (const placeId of COMMERCIAL) {
    if (placeId === "shop") continue;
    const placeName = getPlaceLabel(placeId);
    const defaultContext = SPACE_CLONE_RULES[0]?.contextByPlace?.[placeId];
    for (const src of shopUrinal) {
      addClone({
        ...src,
        placeId,
        spaceId: "restroom",
        title: src.title.replace(/^상가/, placeName),
        description: src.description
          ? src.description.replace(/^상가/, placeName)
          : undefined,
        placeContext: src.placeContext?.replaceAll("상가", placeName) ?? defaultContext,
      });
    }
  }

  return clones;
}

export function buildSolutionsDb(): SolutionsDb {
  const pages = [...BASE_ROWS, ...cloneByRules(BASE_ROWS)].map(toPage);
  return {
    version: 1,
    updatedAt: "2026-07-20",
    places: SOLUTION_PLACES,
    spaces: SOLUTION_SPACES,
    parts: SOLUTION_PARTS,
    contaminantMasters: CONTAMINANT_MASTERS,
    materialContaminants: MATERIAL_CONTAMINANTS,
    pages,
  };
}

export const SOURCE_SOLUTIONS_DB = buildSolutionsDb();
