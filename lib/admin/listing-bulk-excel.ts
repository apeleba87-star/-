/**
 * 현장거래(외부 퍼옴) 엑셀 대량 업로드 — listing_benchmarks 집계 필드와 맞춤
 * (region, listing_type, category_main_id, category_sub_id, 월수금/매매가·배수 등)
 */

import { REGION_GUGUN, REGION_SIDO_LIST, formatRegionForDb } from "@/lib/listings/regions";
import * as XLSX from "xlsx";
import type * as XLSXNS from "xlsx";

export const LISTING_BULK_SHEET_DATA = "업로드양식";
export const LISTING_BULK_SHEET_REFERENCE = "현장거래기준표";
export const LISTING_BULK_SHEET_GUIDE = "집계안내";

export const LISTING_BULK_HEADERS = [
  "제목",
  "본문",
  "시도",
  "시군구",
  "거래유형",
  "category_main_id",
  "category_sub_id",
  "월수금",
  "매매가_성사금액",
  "배수",
  "평수",
  "주회수",
  "연락처",
  "출처URL",
  "비고",
] as const;

export type ListingBulkCategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  parent_id: string | null;
  sort_order: number | null;
  usage: string | null;
};

export type ListingBulkParsedRow = {
  rowIndex: number;
  title: string;
  body: string | null;
  region: string;
  listing_type: string;
  category_main_id: string;
  category_sub_id: string | null;
  monthly_amount: number | null;
  deal_amount: number | null;
  sale_multiplier: number | null;
  area_pyeong: number | null;
  visits_per_week: number | null;
  contact_phone: string;
  source_url: string | null;
};

export type ListingBulkRowError = { rowIndex: number; message: string };

const LISTING_TYPE_MAP: Record<string, string> = {
  "정기 매매": "sale_regular",
  정기매매: "sale_regular",
  "정기 소개": "referral_regular",
  정기소개: "referral_regular",
  "일회성 소개": "referral_one_time",
  일회성소개: "referral_one_time",
  도급: "subcontract",
  sale_regular: "sale_regular",
  referral_regular: "referral_regular",
  referral_one_time: "referral_one_time",
  subcontract: "subcontract",
};

export function parseListingType(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  const direct = LISTING_TYPE_MAP[t];
  if (direct) return direct;
  const compact = t.replace(/\s+/g, "");
  return LISTING_TYPE_MAP[compact] ?? null;
}

/** /listings/new 과 동일: listing 전용이 있으면 그 풀만, 없으면 default 포함 */
export function splitListingCategoryPool(all: ListingBulkCategoryRow[]): {
  pool: ListingBulkCategoryRow[];
  mains: ListingBulkCategoryRow[];
  subs: ListingBulkCategoryRow[];
} {
  const listingOnly = all.filter((c) => c.usage === "listing");
  const pool = listingOnly.length > 0 ? listingOnly : all;
  const poolIds = new Set(pool.map((c) => c.id));
  const mains = pool.filter((c) => c.parent_id == null);
  const subs = pool.filter((c) => c.parent_id != null && poolIds.has(c.parent_id));
  return { pool, mains, subs };
}

export function buildListingCategoryAllowedSet(pool: ListingBulkCategoryRow[]): Set<string> {
  return new Set(pool.map((c) => c.id.trim().toLowerCase()));
}

function normKey(s: string): string {
  return String(s ?? "")
    .trim()
    .replace(/\s+/g, "");
}

function headerMap(headerRow: unknown[]): Map<string, number> {
  const m = new Map<string, number>();
  headerRow.forEach((cell, i) => {
    const k = normKey(String(cell ?? ""));
    if (k) m.set(k, i);
  });
  return m;
}

function cell(row: unknown[], col: Map<string, number>, ...keys: string[]): string {
  for (const key of keys) {
    const nk = normKey(key);
    const idx = col.get(nk);
    if (idx !== undefined) {
      const v = row[idx];
      if (v === null || v === undefined) return "";
      if (typeof v === "number" && !Number.isNaN(v)) return String(v);
      return String(v).trim();
    }
  }
  return "";
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

function parseOptionalYmd(raw: string): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function parseEstimateCheckRequired(raw: string): boolean {
  const t = String(raw ?? "")
    .trim()
    .toLowerCase();
  if (!t) return false;
  if (["y", "yes", "1", "true", "예", "필요", "o"].includes(t)) return true;
  return false;
}

function parseNum(raw: string): number | null {
  const s = String(raw ?? "")
    .replace(/,/g, "")
    .trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 소문자 id → 정규 UUID */
export function buildIdLookup(rows: { id: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const r of rows) {
    m.set(r.id.trim().toLowerCase(), r.id.trim());
  }
  return m;
}

export function parseListingBulkWorkbook(
  workbook: XLSXNS.WorkBook,
  allowedLower: Set<string>,
  idByLower: Map<string, string>,
  parentById: Map<string, string | null>
): { ok: ListingBulkParsedRow[]; errors: ListingBulkRowError[] } {
  const sheetName = workbook.SheetNames.includes(LISTING_BULK_SHEET_DATA)
    ? LISTING_BULK_SHEET_DATA
    : workbook.SheetNames[0];
  if (!sheetName) {
    return { ok: [], errors: [{ rowIndex: 0, message: "시트가 없습니다." }] };
  }
  const ws = workbook.Sheets[sheetName];
  const aoa: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" }) as unknown[][];
  if (!aoa.length) {
    return { ok: [], errors: [{ rowIndex: 1, message: "데이터가 없습니다." }] };
  }

  let headerRowIndex = -1;
  let col: Map<string, number> = new Map();
  for (let r = 0; r < Math.min(aoa.length, 30); r++) {
    const m = headerMap(aoa[r] ?? []);
    if (m.has(normKey("제목")) && m.has(normKey("거래유형")) && m.has(normKey("category_main_id"))) {
      headerRowIndex = r;
      col = m;
      break;
    }
  }
  if (headerRowIndex < 0) {
    return {
      ok: [],
      errors: [
        {
          rowIndex: 1,
          message: "「업로드양식」에서 헤더(제목·거래유형·category_main_id)를 찾을 수 없습니다. 템플릿을 다시 받으세요.",
        },
      ],
    };
  }

  const requiredCols = ["제목", "시도", "시군구", "거래유형", "category_main_id", "연락처"];
  for (const h of requiredCols) {
    if (!col.has(normKey(h))) {
      return {
        ok: [],
        errors: [{ rowIndex: headerRowIndex + 1, message: `필수 열 없음: ${h}` }],
      };
    }
  }

  const ok: ListingBulkParsedRow[] = [];
  const errors: ListingBulkRowError[] = [];

  for (let i = headerRowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    const rowIndex = i + 1;
    const title = cell(row, col, "제목");
    if (!title) continue;

    const bodyCell = cell(row, col, "본문");
    const sido = cell(row, col, "시도");
    const gugun = cell(row, col, "시군구");
    const typeRaw = cell(row, col, "거래유형");
    const mainRaw = cell(row, col, "category_main_id", "카테고리ID");
    const subRaw = cell(row, col, "category_sub_id");
    const monthly = parseNum(cell(row, col, "월수금"));
    const deal = parseNum(cell(row, col, "매매가_성사금액", "매매가", "성사금액"));
    const mult = parseNum(cell(row, col, "배수"));
    const pyeong = parseNum(cell(row, col, "평수"));
    const visits = parseNum(cell(row, col, "주회수"));
    const contact = cell(row, col, "연락처");
    const sourceUrl = cell(row, col, "출처URL", "출처url") || null;
    const note = cell(row, col, "비고", "메모") || null;

    if (!REGION_SIDO_LIST.includes(sido as (typeof REGION_SIDO_LIST)[number])) {
      errors.push({ rowIndex, message: `시도 오류: "${sido}"` });
      continue;
    }
    const sidoT = sido as (typeof REGION_SIDO_LIST)[number];
    const guguns = REGION_GUGUN[sidoT] ?? [];
    if (!guguns.includes(gugun)) {
      errors.push({ rowIndex, message: `시군구 오류: "${gugun}"` });
      continue;
    }

    const listing_type = parseListingType(typeRaw);
    if (!listing_type) {
      errors.push({ rowIndex, message: `거래유형 오류: "${typeRaw}"` });
      continue;
    }

    if (!isUuid(mainRaw)) {
      errors.push({ rowIndex, message: `category_main_id UUID 오류` });
      continue;
    }
    const mainId = idByLower.get(mainRaw.trim().toLowerCase());
    if (!mainId || !allowedLower.has(mainRaw.trim().toLowerCase())) {
      errors.push({ rowIndex, message: "category_main_id가 기준표(현장거래 카테고리)에 없습니다." });
      continue;
    }

    let category_sub_id: string | null = null;
    if (subRaw.trim()) {
      if (!isUuid(subRaw)) {
        errors.push({ rowIndex, message: "category_sub_id UUID 오류" });
        continue;
      }
      const sid = idByLower.get(subRaw.trim().toLowerCase());
      if (!sid || !allowedLower.has(subRaw.trim().toLowerCase())) {
        errors.push({ rowIndex, message: "category_sub_id가 기준표에 없습니다." });
        continue;
      }
      const parent = parentById.get(sid);
      if ((parent ?? "").toLowerCase() !== mainId.toLowerCase()) {
        errors.push({
          rowIndex,
          message: "category_sub_id의 상위 category_main_id와 열의 main id가 일치하지 않습니다.",
        });
        continue;
      }
      category_sub_id = sid;
    }

    if (!contact.trim()) {
      errors.push({ rowIndex, message: "연락처 필요" });
      continue;
    }

    const isSale = listing_type === "sale_regular";
    const isSub = listing_type === "subcontract";
    const isReferral = listing_type === "referral_regular" || listing_type === "referral_one_time";
    const payAmount = isSub ? (monthly ?? 0) : isReferral ? (deal ?? 0) : (monthly ?? deal ?? 0);
    if (!payAmount || payAmount <= 0) {
      errors.push({
        rowIndex,
        message:
          "금액 오류: 도급·정기매매는 월수금, 소개는 매매가_성사금액, 정기매매는 월수금 또는 매매가 중 필요한 값을 넣으세요.",
      });
      continue;
    }

    const visitsDb = visits != null && visits >= 1 && visits <= 7 ? visits : null;
    if (visits != null && visitsDb == null) {
      errors.push({ rowIndex, message: "주회수는 1~7 또는 비움" });
      continue;
    }

    const bodyTrim = bodyCell.trim();
    const noteTrim = note?.trim() ?? "";
    const bodyOut =
      bodyTrim && noteTrim
        ? `${bodyTrim}\n\n비고: ${noteTrim}`
        : bodyTrim
          ? bodyTrim
          : noteTrim
            ? `비고: ${noteTrim}`
            : null;

    ok.push({
      rowIndex,
      title,
      body: bodyOut,
      region: formatRegionForDb(sido, gugun),
      listing_type,
      category_main_id: mainId,
      category_sub_id,
      monthly_amount: monthly,
      deal_amount: deal,
      sale_multiplier: mult,
      area_pyeong: pyeong,
      visits_per_week: visitsDb,
      contact_phone: contact,
      source_url: sourceUrl?.trim() || null,
    });
  }

  return { ok, errors };
}

export type ListingRefRow = {
  id: string;
  name: string;
  parent_name: string;
  slug: string;
  kind: "대분류" | "소분류";
};

/** 집계 안내 시트 (listing_benchmarks / refresh_listing_benchmarks 기준) */
export function listingBenchmarkGuideRows(): string[][] {
  return [
    ["현장거래 평균·참고값은 DB 함수 refresh_listing_benchmarks → listing_benchmarks 테이블에 반영됩니다."],
    [""],
    ["[집계 키] 지역(region) = 시도+시군구 형태 그대로 저장 (예: 서울 강남구). 업로드 시 시도·시군구 열을 조합합니다."],
    ["[집계 키] 거래유형(listing_type) = 정기 소개 / 일회성 소개 / 정기 매매 / 도급."],
    ["[집계 키] category_main_id, category_sub_id = 아래 기준표 UUID. 소분류 없으면 sub 열 비움."],
    [""],
    ["정기 소개(referral_regular): 집계 지표 fee → pay_amount(소개비 성격) 사용. 월수금 열은 무시."],
    ["일회성 소개(referral_one_time): 등록·표시는 동일하나, listing_benchmarks SQL은 정기 소개만 별도 집계합니다(참고)."],
    ["정기 매매(sale_regular): monthly_amount(월수금), deal_amount(매매가). 배수(매매가/월수금) 또는 두 금액으로 산출."],
    ["도급(subcontract): monthly_amount(월 도급금). 매매가 열은 무시."],
    [""],
    ["표본: 유형·지역·카테고리별 최근 80건까지, 30건 이상일 때만 listing_benchmarks 행 생성."],
    ["업로드 후 필요 시 관리자에서 refresh_listing_benchmarks 실행(또는 스케줄)으로 재집계하세요."],
  ];
}

export function buildListingBulkTemplateWorkbook(
  refRows: ListingRefRow[],
  exampleMainId: string
): XLSXNS.WorkBook {
  const wb = XLSX.utils.book_new();

  const exampleRow = [
    "예시) 강남 사무실 정기 소개",
    "",
    "서울",
    "강남구",
    "일회성 소개",
    exampleMainId,
    "",
    "",
    "500000",
    "",
    "",
    "",
    "010-0000-0000",
    "",
    "예시 행 삭제 후 입력",
  ];

  const dataSheet = XLSX.utils.aoa_to_sheet([
    [...LISTING_BULK_HEADERS],
    exampleRow,
    ...Array.from({ length: 25 }, () => LISTING_BULK_HEADERS.map(() => "")),
  ]);
  XLSX.utils.book_append_sheet(wb, dataSheet, LISTING_BULK_SHEET_DATA);

  const refSheetRows = [
    [
      "id(UUID)",
      "이름",
      "상위",
      "slug",
      "구분",
      "※ 다운로드 시점 DB 기준 — categories(현장거래 usage=listing·default·활성). 추가·수정 후 템플릿을 다시 받으세요.",
    ],
    ...refRows.map((r) => [r.id, r.name, r.parent_name, r.slug, r.kind, ""]),
  ];
  const refSheet = XLSX.utils.aoa_to_sheet(refSheetRows);
  XLSX.utils.book_append_sheet(wb, refSheet, LISTING_BULK_SHEET_REFERENCE);

  const guide = listingBenchmarkGuideRows();
  const guideSheet = XLSX.utils.aoa_to_sheet(guide.map((r) => [r[0]]));
  XLSX.utils.book_append_sheet(wb, guideSheet, LISTING_BULK_SHEET_GUIDE);

  return wb;
}
