import { parseRegionSido, shortRegion } from "@/lib/tender-utils";

export type ParsedWorkRegion = {
  regionText: string;
  regionSido: string | null;
  regionSigungu: string | null;
  regionLabel: string;
};

const SIGUNGU_RE = /([가-힣]+(?:구|군|시))/g;

/** 시·도 없이 구/군만 올 때 (워크넷 목록에 흔함) */
const UNIQUE_SIGUNGU_TO_SIDO: Record<string, string> = {
  종로구: "서울",
  용산구: "서울",
  성동구: "서울",
  광진구: "서울",
  동대문구: "서울",
  중랑구: "서울",
  성북구: "서울",
  강북구: "서울",
  도봉구: "서울",
  노원구: "서울",
  은평구: "서울",
  서대문구: "서울",
  마포구: "서울",
  양천구: "서울",
  구로구: "서울",
  금천구: "서울",
  영등포구: "서울",
  동작구: "서울",
  관악구: "서울",
  서초구: "서울",
  강남구: "서울",
  송파구: "서울",
  강동구: "서울",
  해운대구: "부산",
  금정구: "부산",
  사하구: "부산",
  연제구: "부산",
  수영구: "부산",
  사상구: "부산",
  기장군: "부산",
  부산진구: "부산",
  동래구: "부산",
  영도구: "부산",
  울주군: "울산",
  남양주시: "경기",
  하남시: "경기",
  부천시: "경기",
  성남시: "경기",
  수원시: "경기",
  고양시: "경기",
  용인시: "경기",
  화성시: "경기",
  파주시: "경기",
  김포시: "경기",
  여수시: "전남",
  순천시: "전남",
  목포시: "전남",
  제주시: "제주",
  서귀포시: "제주",
};

/** 제목·괄호에서 시도 추출: (부산), [경기] */
const TITLE_SIDO_RE =
  /[\[(（](서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)[\])）]/;

function inferSidoFromHints(...texts: (string | null | undefined)[]): string | null {
  const blob = texts.filter(Boolean).join(" ");
  if (!blob.trim()) return null;

  const fromParser = parseRegionSido(blob);
  if (fromParser) return fromParser;

  const titleM = blob.match(TITLE_SIDO_RE);
  if (titleM?.[1]) return titleM[1];

  if (/서울특별|서울시|^서울\s|서울[시특]/.test(blob)) return "서울";
  if (/부산광역|부산시|^부산\s|부산[가-힣]/.test(blob)) return "부산";
  if (/대구광역|대구시|^대구\s/.test(blob)) return "대구";
  if (/인천광역|인천시|^인천\s/.test(blob)) return "인천";
  if (/광주광역|광주시|^광주\s/.test(blob)) return "광주";
  if (/대전광역|대전시|^대전\s/.test(blob)) return "대전";
  if (/울산광역|울산시|^울산\s|울산[가-힣]/.test(blob)) return "울산";
  if (/세종특별|세종시|^세종\s/.test(blob)) return "세종";
  if (/경기도|경기\s/.test(blob)) return "경기";
  if (/강원특별|강원도|^강원\s/.test(blob)) return "강원";
  if (/충청북도|충북/.test(blob)) return "충북";
  if (/충청남도|충남/.test(blob)) return "충남";
  if (/전라북도|전북|전북특별/.test(blob)) return "전북";
  if (/전라남도|전남/.test(blob)) return "전남";
  if (/경상북도|경북/.test(blob)) return "경북";
  if (/경상남도|경남/.test(blob)) return "경남";
  if (/제주특별|제주도|제주시/.test(blob)) return "제주";

  const guMatches = [...blob.matchAll(SIGUNGU_RE)].map((m) => m[1]);
  for (const gu of guMatches) {
    const sido = UNIQUE_SIGUNGU_TO_SIDO[gu];
    if (sido) return sido;
  }

  return null;
}

function pickPrimarySigungu(blob: string, sido: string | null): string | null {
  const matches = [...blob.matchAll(SIGUNGU_RE)].map((m) => m[1]);
  if (matches.length === 0) return null;
  if (sido === "서울") {
    const seoul = matches.find((g) => UNIQUE_SIGUNGU_TO_SIDO[g] === "서울");
    if (seoul) return seoul;
  }
  if (sido === "부산") {
    const busan = matches.find((g) => UNIQUE_SIGUNGU_TO_SIDO[g] === "부산");
    if (busan) return busan;
  }
  return matches[0] ?? null;
}

/** 근무지역 + 제목·회사 힌트 → 시도·시군구 */
export function parseWorkRegion(
  regionRaw: string | null | undefined,
  hints?: { title?: string | null; company?: string | null }
): ParsedWorkRegion {
  const regionText = (regionRaw ?? "").trim();
  const hintBlob = [regionText, hints?.title, hints?.company].filter(Boolean).join(" ");
  const regionSido = inferSidoFromHints(regionText, hints?.title, hints?.company);
  const regionSigungu = pickPrimarySigungu(hintBlob, regionSido);

  const parts = [regionSido, regionSigungu].filter(Boolean);
  const regionLabel =
    parts.length > 0 ? parts.join(" ") : shortRegion(regionText) || shortRegion(hintBlob) || "—";

  return { regionText: regionText || hintBlob, regionSido, regionSigungu, regionLabel };
}

export const NATIONAL_PUBLIC_JOB_SIDO = "전국";

export function isNationalPublicJobScope(scope: { sido: string }): boolean {
  return scope.sido === NATIONAL_PUBLIC_JOB_SIDO;
}

export function regionMatchesScope(
  row: { region_sido: string | null; region_sigungu: string | null },
  scope: { sido: string; sigungu?: string | null }
): boolean {
  if (isNationalPublicJobScope(scope)) return true;
  if (!row.region_sido || row.region_sido !== scope.sido) return false;
  if (!scope.sigungu?.trim()) return true;
  const g = scope.sigungu.trim().replace(/\s+/g, "");
  const rowGu = (row.region_sigungu ?? "").replace(/\s+/g, "");
  if (!rowGu) return true;
  return rowGu.includes(g) || g.includes(rowGu);
}

export function spotlightScopeKey(scope: { sido: string; sigungu?: string | null }): string {
  if (isNationalPublicJobScope(scope)) return "national:kr";
  if (scope.sigungu?.trim()) return `sigungu:${scope.sido}|${scope.sigungu.trim()}`;
  return `sido:${scope.sido}`;
}

export const DEFAULT_PUBLIC_JOB_REGION = { sido: "서울", sigungu: null as string | null };
