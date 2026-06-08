import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

const SIDO_PREFIX_TO_ID = {
  11: { id: "seoul", label: "서울", fullLabel: "서울특별시" },
  26: { id: "busan", label: "부산", fullLabel: "부산광역시" },
  27: { id: "daegu", label: "대구", fullLabel: "대구광역시" },
  28: { id: "incheon", label: "인천", fullLabel: "인천광역시" },
  29: { id: "gwangju", label: "광주", fullLabel: "광주광역시" },
  30: { id: "daejeon", label: "대전", fullLabel: "대전광역시" },
  31: { id: "ulsan", label: "울산", fullLabel: "울산광역시" },
  36: { id: "sejong", label: "세종", fullLabel: "세종특별자치시" },
  41: { id: "gyeonggi", label: "경기", fullLabel: "경기도" },
  42: { id: "gangwon", label: "강원", fullLabel: "강원특별자치도" },
  43: { id: "chungbuk", label: "충북", fullLabel: "충청북도" },
  44: { id: "chungnam", label: "충남", fullLabel: "충청남도" },
  45: { id: "jeonbuk", label: "전북", fullLabel: "전북특별자치도" },
  46: { id: "jeonnam", label: "전남", fullLabel: "전라남도" },
  47: { id: "gyeongbuk", label: "경북", fullLabel: "경상북도" },
  48: { id: "gyeongnam", label: "경남", fullLabel: "경상남도" },
  50: { id: "jeju", label: "제주", fullLabel: "제주특별자치도" },
};

const SIDO_NAME_ALIASES = {
  "강원특별자치도": ["강원도"],
  "전북특별자치도": ["전라북도"],
};

/** 2023~ 특별자치도 출범 — RTMS LAWD 시도 2자리 변경 (구 CSV 42·45 보정) */
const LAWD_SI_DO_PREFIX_REMAP = {
  "42": "51", // 강원도 → 강원특별자치도 (2023-06-11)
  "45": "52", // 전라북도 → 전북특별자치도 (2024-01-18)
};

function normalizeLawdCode(code) {
  const prefix = code.slice(0, 2);
  const remapped = LAWD_SI_DO_PREFIX_REMAP[prefix];
  if (!remapped) return code;
  return remapped + code.slice(2);
}
const OBSOLETE_LAWD_CODES = new Set([
  "41010", "41011", "41012", "41013", "41014",
  "41050",
  "41190", // 부천시 통합코드 → 원미·소사·오정구
  "41191", "41193", "41195", "41197", "41199",
  "41283", "41330",
  "41850",
  "42050", "51050", // 강원 울진군 오등록 (경북 47930만 유효)
  "42840", "51840", // 강원 명주군 (1995 폐지)
  "43050", "43710", "43780", "43790", "43795", // 충북 청원·중원·제원군 등
  "44050", "44860",
  "44110", "44111", "44113", "44115",
  "45150", "52150", // 전북 이리시 (익산 통합)
  "45170", "52170", // 전북 정주시 (폐지)
  "45820", "52820", // 전북 옥구군 (김제 통합)
  "46010", "46011", "46012", "46013", "46020", "46030", "46050",
  "46190", "46750",
  "47010", "47011", "47012", "47013", "47014", "47015", "47016", "47020", "47050",
  "48010", "48011", "48012", "48013", "48014", "48015", "48016",
  "48050", "48060", "48070",
  "48110", "48120", "48130", "48131", "48133", "48135", "48137",
  "48150", "48151", "48153", "48160", "48190",
  "48710", "48775", "48795",
]);

const GU_OVERRIDES = JSON.parse(
  fs.readFileSync(path.join(__dirname, "lawd-sigungu-overrides.json"), "utf8")
);

const SEOUL_SLUG_OVERRIDES = {
  "강남구": "gangnam-gu",
  "강동구": "gangdong-gu",
  "강북구": "gangbuk-gu",
  "강서구": "gangseo-gu",
  "관악구": "gwanak-gu",
  "광진구": "gwangjin-gu",
  "구로구": "guro-gu",
  "금천구": "geumcheon-gu",
  "노원구": "nowon-gu",
  "도봉구": "dobong-gu",
  "동대문구": "dongdaemun-gu",
  "동작구": "dongjak-gu",
  "마포구": "mapo-gu",
  "서대문구": "seodaemun-gu",
  "서초구": "seocho-gu",
  "성동구": "seongdong-gu",
  "성북구": "seongbuk-gu",
  "송파구": "songpa-gu",
  "양천구": "yangcheon-gu",
  "영등포구": "yeongdeungpo-gu",
  "용산구": "yongsan-gu",
  "은평구": "eunpyeong-gu",
  "종로구": "jongno-gu",
  "중구": "jung-gu",
  "중랑구": "jungnang-gu",
};

const HANGUL_ROMAN = {
  ㄱ: "g", ㄲ: "kk", ㄴ: "n", ㄷ: "d", ㄸ: "tt", ㄹ: "r", ㅁ: "m", ㅂ: "b", ㅃ: "pp",
  ㅅ: "s", ㅆ: "ss", ㅇ: "", ㅈ: "j", ㅉ: "jj", ㅊ: "ch", ㅋ: "k", ㅌ: "t", ㅍ: "p", ㅎ: "h",
  ㅏ: "a", ㅐ: "ae", ㅑ: "ya", ㅒ: "yae", ㅓ: "eo", ㅔ: "e", ㅕ: "yeo", ㅖ: "ye", ㅗ: "o",
  ㅘ: "wa", ㅙ: "wae", ㅚ: "oe", ㅛ: "yo", ㅜ: "u", ㅝ: "wo", ㅞ: "we", ㅟ: "wi", ㅠ: "yu",
  ㅡ: "eu", ㅢ: "ui", ㅣ: "i",
};
const CHO = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const JUNG = ["ㅏ","ㅐ","ㅑ","ㅒ","ㅓ","ㅔ","ㅕ","ㅖ","ㅗ","ㅘ","ㅙ","ㅚ","ㅛ","ㅜ","ㅝ","ㅞ","ㅟ","ㅠ","ㅡ","ㅢ","ㅣ"];
const JONG = ["","ㄱ","ㄲ","ㄳ","ㄴ","ㄵ","ㄶ","ㄷ","ㄹ","ㄺ","ㄻ","ㄼ","ㄽ","ㄾ","ㄿ","ㅀ","ㅁ","ㅂ","ㅄ","ㅅ","ㅆ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];

function decomposeHangul(char) {
  const code = char.charCodeAt(0);
  if (code < 0xac00 || code > 0xd7a3) return null;
  const s = code - 0xac00;
  return { cho: CHO[Math.floor(s / 588)], jung: JUNG[Math.floor((s % 588) / 28)], jong: JONG[s % 28] };
}

function hangulToRoman(text) {
  let out = "";
  for (const ch of text) {
    const d = decomposeHangul(ch);
    if (!d) { out += ch; continue; }
    out += (HANGUL_ROMAN[d.cho] ?? "") + (HANGUL_ROMAN[d.jung] ?? "") + (HANGUL_ROMAN[d.jong] ?? "");
  }
  return out;
}

function labelToSlug(guLabel) {
  const known = SEOUL_SLUG_OVERRIDES[guLabel];
  if (known) return known;
  const base = hangulToRoman(guLabel.replace(/\s+/g, ""));
  const suffix = guLabel.endsWith("구") ? "gu" : guLabel.endsWith("군") ? "gun" : guLabel.endsWith("시") ? "si" : "dist";
  return `${base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${suffix}`;
}

function parseCsvRows() {
  const buf = fs.readFileSync(path.join(__dirname, "region_code5.csv"));
  const text = new TextDecoder("euc-kr").decode(buf);
  return text.trim().split(/\r?\n/).slice(1).map((line) => {
    const m = line.match(/^"([^"]+)","(\d+)"$/);
    return m ? { name: m[1], code: m[2] } : null;
  }).filter(Boolean).filter((r) => !r.code.endsWith("000"));
}

function nameMatchesSido(name, fullLabel) {
  if (name.startsWith(fullLabel)) return true;
  for (const alias of SIDO_NAME_ALIASES[fullLabel] ?? []) {
    if (name.startsWith(alias)) return true;
  }
  return false;
}

function isValidRtmsUnit(row) {
  const code = normalizeLawdCode(row.code);
  if (OBSOLETE_LAWD_CODES.has(code) || OBSOLETE_LAWD_CODES.has(row.code)) return false;
  const sido = SIDO_PREFIX_TO_ID[row.code.slice(0, 2)];
  if (!sido) return false;
  return nameMatchesSido(row.name, sido.fullLabel);
}

function isParentCode(code, siblings) {
  if (siblings.length <= 1) return false;
  if (!code.endsWith("0")) return false;
  return siblings.some((s) => s !== code);
}

function parseGuLabel(row, sidoFull) {
  if (GU_OVERRIDES[row.code]) return GU_OVERRIDES[row.code];
  const aliases = [sidoFull, ...(SIDO_NAME_ALIASES[sidoFull] ?? [])];
  for (const s of aliases) {
    if (row.name.startsWith(s)) {
      const rest = row.name.slice(s.length);
      if (rest) return rest;
    }
  }
  return row.name;
}

function sigunguRank(guLabel) {
  if (/시$|군$|구$/.test(guLabel)) return 3;
  if (/읍$/.test(guLabel)) return 1;
  if (/면$|동$/.test(guLabel)) return 0;
  return 2;
}

/** RTMS LAWD_CD는 시·군·구당 1개 — CSV에 동·면 중복 행 제거 */
function dedupeByLawdCode(rows) {
  const byCode = new Map();
  for (const row of rows) {
    const prev = byCode.get(row.code);
    if (!prev) {
      byCode.set(row.code, row);
      continue;
    }
    const sido = SIDO_PREFIX_TO_ID[row.code.slice(0, 2)];
    const guPrev = parseGuLabel(prev, sido.fullLabel);
    const guNext = parseGuLabel(row, sido.fullLabel);
    const rankPrev = sigunguRank(guPrev);
    const rankNext = sigunguRank(guNext);
    if (rankNext > rankPrev) byCode.set(row.code, row);
    else if (rankNext === rankPrev && guNext.length < guPrev.length) byCode.set(row.code, row);
  }
  return [...byCode.values()];
}

/** 통·폐합 잔재: XX시 + XX시 OO구 공존 시 XX시 단독 제거, XX군 + XX시 공존 시 XX군 제거 */
function dropMergedGunAndParentSi(districts) {
  const hasSubGu = (base) =>
    districts.some((d) => d.gu.startsWith(`${base}시 `) && d.gu.includes("구"));
  const hasSi = (base) => districts.some((d) => d.gu === `${base}시` || d.gu.startsWith(`${base}시 `));

  return districts.filter((d) => {
    const plainSi = d.gu.match(/^(.+?)시$/);
    if (plainSi && hasSubGu(plainSi[1])) return false;

    const plainGun = d.gu.match(/^(.+?)군$/);
    if (plainGun && hasSi(plainGun[1])) return false;

    return true;
  });
}

function main() {
  const allRows = parseCsvRows();
  const valid = allRows.filter(isValidRtmsUnit);
  const validCodes = valid.map((r) => r.code);

  const rtmsUnitsRaw = valid.filter((row) => {
    const prefix4 = row.code.slice(0, 4);
    const siblings = validCodes.filter((c) => c.slice(0, 4) === prefix4);
    return !isParentCode(row.code, siblings);
  });

  const rtmsUnits = dedupeByLawdCode(rtmsUnitsRaw);

  const byCityId = new Map();
  const lawdByRegionKey = {};
  const missingOverride = [];

  for (const row of rtmsUnits) {
    const lawdCd = normalizeLawdCode(row.code);
    const sido = SIDO_PREFIX_TO_ID[row.code.slice(0, 2)];
    const guLabel = parseGuLabel(row, sido.fullLabel);
    if (!guLabel) continue;

    const dupes = rtmsUnits.filter((r) => r.name === row.name && r.code !== row.code);
    if (dupes.length > 0 && !GU_OVERRIDES[row.code] && !GU_OVERRIDES[lawdCd]) {
      missingOverride.push(row);
    }

    let slug = labelToSlug(guLabel.split(" ").pop() ?? guLabel);
    if (guLabel.includes(" ")) {
      const parts = guLabel.split(" ");
      const cityPart = parts[0].replace(/시$/, "");
      const guPart = parts[1] ?? parts[0];
      slug = `${hangulToRoman(cityPart).toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${labelToSlug(guPart).replace(/-gu$|-gun$|-si$/, "")}-${guPart.endsWith("구") ? "gu" : guPart.endsWith("군") ? "gun" : "si"}`;
    }

    const cityBucket = byCityId.get(sido.id) ?? { ...sido, districts: [], slugSet: new Set() };
    let uniqueSlug = slug;
    let n = 2;
    while (cityBucket.slugSet.has(uniqueSlug)) {
      uniqueSlug = `${slug}-${n}`;
      n += 1;
    }
    cityBucket.slugSet.add(uniqueSlug);

    const regionKey = `${sido.id}:${uniqueSlug}`;
    lawdByRegionKey[regionKey] = lawdCd;
    cityBucket.districts.push({
      gu: guLabel,
      slug: uniqueSlug,
      lawdCd,
    });
    byCityId.set(sido.id, cityBucket);
  }

  const cities = [...byCityId.values()]
    .map(({ slugSet, ...city }) => {
      let districts = city.districts.sort((a, b) => a.gu.localeCompare(b.gu, "ko"));
      districts = dropMergedGunAndParentSi(districts);
      return { ...city, districts };
    })
    .filter((c) => c.districts.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, "ko"));

  for (const key of Object.keys(lawdByRegionKey)) delete lawdByRegionKey[key];
  for (const city of cities) {
    for (const d of city.districts) {
      lawdByRegionKey[`${city.id}:${d.slug}`] = d.lawdCd;
    }
  }

  const districtCount = cities.reduce((s, c) => s + c.districts.length, 0);
  console.log(`RTMS units: ${rtmsUnits.length}, cities: ${cities.length}, districts: ${districtCount}`);
  if (missingOverride.length) {
    console.warn("Missing gu override:", missingOverride.map((r) => r.code).join(", "));
  }

  const outDir = path.join(root, "lib/demand");
  fs.writeFileSync(
    path.join(outDir, "lawd-codes.generated.ts"),
    `/** Auto-generated from RTMS LAWD CSV — scripts/generate-demand-regions.mjs */\n\nexport const DEMAND_LAWD_BY_REGION_KEY: Record<string, string> = ${JSON.stringify(lawdByRegionKey, null, 2)};\n\nexport const DEMAND_RTMS_UNIT_COUNT = ${districtCount};\n`
  );

  const registryBody = cities.map((c) => {
    const districtLines = c.districts
      .map((d) => `      { gu: ${JSON.stringify(d.gu)}, slug: ${JSON.stringify(d.slug)}, lawdCd: ${JSON.stringify(d.lawdCd)} }`)
      .join(",\n");
    return `  {\n    id: ${JSON.stringify(c.id)},\n    label: ${JSON.stringify(c.label)},\n    fullLabel: ${JSON.stringify(c.fullLabel)},\n    districts: [\n${districtLines}\n    ],\n  }`;
  }).join(",\n");

  fs.writeFileSync(
    path.join(outDir, "region-registry.generated.ts"),
    `/** Auto-generated from RTMS LAWD CSV — scripts/generate-demand-regions.mjs */\n\nexport type DemandRegistryDistrict = {\n  /** RTMS sigungu 표기 (예: 강남구, 안동시, 성남시 분당구) */\n  gu: string;\n  slug: string;\n  lawdCd: string;\n};\n\nexport type DemandRegistryCity = {\n  id: string;\n  label: string;\n  fullLabel: string;\n  districts: DemandRegistryDistrict[];\n};\n\nexport const DEMAND_REGION_REGISTRY: DemandRegistryCity[] = [\n${registryBody}\n];\n`
  );

  console.log("Wrote region-registry.generated.ts and lawd-codes.generated.ts");
}

main();
