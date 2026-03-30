/**
 * 인력구인 외부 데이터 엑셀 대량 업로드: 파싱·검증
 * 구인 등록 화면과 동일하게 **소분류(category_sub_id)** 기준 (JOB_TYPE_PRESETS ↔ categories.slug)
 */

import type { PayUnit } from "@/lib/jobs/types";
import { JOB_TYPE_PRESETS } from "@/lib/jobs/job-type-presets";
import { REGION_GUGUN, REGION_SIDO_LIST, formatRegionForDb } from "@/lib/listings/regions";
import * as XLSX from "xlsx";
import type * as XLSXNS from "xlsx";

export const JOB_BULK_SHEET_DATA = "업로드양식";
export const JOB_BULK_SHEET_CATEGORIES = "청소업종기준표";

/** 템플릿 1행 헤더 (한글) — category_sub_id = 구인 폼의 작업 종류 태그와 동일한 소분류 UUID */
export const JOB_BULK_HEADERS = [
  "등록일",
  "제목",
  "시도",
  "시군구",
  "근무일",
  "연락처",
  "상태",
  "category_sub_id",
  "금액",
  "급여단위",
  "숙련도",
  "출처URL",
  "비고",
] as const;

/** DB categories 한 행 (job/default, 활성) */
export type JobBulkCategoryRow = {
  id: string;
  name: string;
  slug: string | null;
  parent_id: string | null;
  sort_order: number | null;
};

export type JobBulkSubMeta = {
  id: string;
  parent_id: string;
  name: string;
  slug: string | null;
  sort_order: number | null;
};

export type JobBulkParsedRow = {
  rowIndex: number;
  external_registered_at: string | null;
  title: string;
  region: string;
  district: string;
  work_date: string | null;
  contact_phone: string;
  status: "open" | "closed";
  category_main_id: string;
  category_sub_id: string | null;
  /** job_post_positions.job_type_input (화면 프리셋 라벨 등) */
  position_job_type_input: string;
  normalized_job_type_key: string | null;
  normalization_status: "auto_mapped" | "manual_review";
  pay_amount: number;
  pay_unit: PayUnit;
  skill_level: "expert" | "general";
  source_url: string | null;
  description: string | null;
};

export type JobBulkRowError = { rowIndex: number; message: string };

/** categories 목록 → 상위 / 소분류 분리 (구인용 상위 아래의 자식만) */
export function splitJobMainAndSubCategories(all: JobBulkCategoryRow[]): {
  mains: JobBulkCategoryRow[];
  subs: JobBulkSubMeta[];
} {
  const mains = all.filter((c) => c.parent_id == null);
  const mainIds = new Set(mains.map((m) => m.id));
  const subs: JobBulkSubMeta[] = all
    .filter((c) => c.parent_id != null && mainIds.has(c.parent_id))
    .map((c) => ({
      id: c.id.trim(),
      parent_id: c.parent_id as string,
      name: c.name,
      slug: c.slug,
      sort_order: c.sort_order ?? null,
    }));
  return { mains, subs };
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

function parsePayUnit(raw: string): PayUnit | null {
  const t = raw.trim().toLowerCase();
  if (["day", "일당", "일"].includes(t)) return "day";
  if (["half_day", "반당", "반일"].includes(t)) return "half_day";
  if (["hour", "시급", "시간"].includes(t)) return "hour";
  return null;
}

function parseStatus(raw: string): "open" | "closed" | null {
  const t = raw.trim().toLowerCase();
  if (["closed", "마감", "종료", "완료"].includes(t)) return "closed";
  if (["open", "모집", "모집중", "진행"].includes(t)) return "open";
  return null;
}

function parseSkill(raw: string): "expert" | "general" | null {
  const t = raw.trim().toLowerCase();
  if (["expert", "기공", "숙련", "기술"].includes(t)) return "expert";
  if (["general", "보조", "일반"].includes(t)) return "general";
  return null;
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s.trim());
}

function parseDateCell(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/** 소문자 UUID → DB에 저장할 정규 id (상위 전용, 구 템플릿 호환) */
export function buildCategoryIdLookup(categories: { id: string }[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const c of categories) {
    m.set(c.id.trim().toLowerCase(), c.id.trim());
  }
  return m;
}

/** 소분류: 소문자 id → 메타 */
export function buildSubCategoryLookup(subs: JobBulkSubMeta[]): Map<string, JobBulkSubMeta> {
  const m = new Map<string, JobBulkSubMeta>();
  for (const s of subs) {
    m.set(s.id.toLowerCase(), { ...s, id: s.id.trim() });
  }
  return m;
}

function resolveJobTypeFromSub(meta: JobBulkSubMeta): {
  position_job_type_input: string;
  normalized_job_type_key: string | null;
  normalization_status: "auto_mapped" | "manual_review";
} {
  const slug = (meta.slug ?? "").trim();
  if (slug) {
    const preset = JOB_TYPE_PRESETS.find((p) => p.subSlug === slug);
    if (preset) {
      return {
        position_job_type_input: preset.label,
        normalized_job_type_key: preset.key,
        normalization_status: "auto_mapped",
      };
    }
  }
  return {
    position_job_type_input: meta.name,
    normalized_job_type_key: null,
    normalization_status: "manual_review",
  };
}

export type JobBulkCategoryContext = {
  mainIdByLower: Map<string, string>;
  /** canon main id → 표시명 */
  mainNameById: Map<string, string>;
  subByLower: Map<string, JobBulkSubMeta>;
};

export function buildJobBulkCategoryContext(mains: JobBulkCategoryRow[], subs: JobBulkSubMeta[]): JobBulkCategoryContext {
  const mainIdByLower = buildCategoryIdLookup(mains);
  const mainNameById = new Map<string, string>();
  for (const m of mains) {
    mainNameById.set(m.id.trim(), m.name);
  }
  const subByLower = buildSubCategoryLookup(subs);
  return { mainIdByLower, mainNameById, subByLower };
}

export function parseJobBulkWorkbook(
  workbook: XLSXNS.WorkBook,
  ctx: JobBulkCategoryContext
): { ok: JobBulkParsedRow[]; errors: JobBulkRowError[] } {
  const sheetName =
    workbook.SheetNames.includes(JOB_BULK_SHEET_DATA) ? JOB_BULK_SHEET_DATA : workbook.SheetNames[0];
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
    const hasTitle = m.has(normKey("제목"));
    const hasSub = m.has(normKey("category_sub_id"));
    const hasMain = m.has(normKey("category_main_id"));
    if (hasTitle && (hasSub || hasMain)) {
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
          message:
            "「업로드양식」시트에서 헤더를 찾을 수 없습니다. category_sub_id 열이 필요합니다(최신 템플릿을 다운로드하세요).",
        },
      ],
    };
  }

  const useSubColumn = col.has(normKey("category_sub_id"));
  const useMainColumn = col.has(normKey("category_main_id"));
  if (!useSubColumn && !useMainColumn) {
    return {
      ok: [],
      errors: [{ rowIndex: headerRowIndex + 1, message: "category_sub_id 또는 category_main_id 열이 필요합니다." }],
    };
  }

  const baseRequired = ["제목", "시도", "시군구", "연락처", "상태", "금액", "급여단위", "숙련도"];
  for (const h of baseRequired) {
    if (!col.has(normKey(h))) {
      return {
        ok: [],
        errors: [{ rowIndex: headerRowIndex + 1, message: `필수 열이 없습니다: "${h}". 템플릿을 다시 받아 주세요.` }],
      };
    }
  }
  if (useSubColumn && !col.has(normKey("category_sub_id"))) {
    return { ok: [], errors: [{ rowIndex: headerRowIndex + 1, message: "category_sub_id 열이 없습니다." }] };
  }
  if (!useSubColumn && useMainColumn && !col.has(normKey("category_main_id"))) {
    return { ok: [], errors: [{ rowIndex: headerRowIndex + 1, message: "category_main_id 열이 없습니다." }] };
  }

  const ok: JobBulkParsedRow[] = [];
  const errors: JobBulkRowError[] = [];

  for (let i = headerRowIndex + 1; i < aoa.length; i++) {
    const row = aoa[i] ?? [];
    const rowIndex = i + 1;
    const title = cell(row, col, "제목");
    if (!title) continue;

    const sido = cell(row, col, "시도");
    const gugun = cell(row, col, "시군구");
    const regRaw = cell(row, col, "등록일");
    const workDateRaw = cell(row, col, "근무일");
    const contact = cell(row, col, "연락처");
    const statusRaw = cell(row, col, "상태");
    const subIdRaw = useSubColumn ? cell(row, col, "category_sub_id", "카테고리ID") : "";
    const mainIdRaw = useMainColumn ? cell(row, col, "category_main_id", "카테고리ID") : "";
    const payRaw = cell(row, col, "금액");
    const payUnitRaw = cell(row, col, "급여단위");
    const skillRaw = cell(row, col, "숙련도");
    const sourceUrl = cell(row, col, "출처URL", "출처url") || null;
    const desc = cell(row, col, "비고", "설명") || null;

    if (!REGION_SIDO_LIST.includes(sido as (typeof REGION_SIDO_LIST)[number])) {
      errors.push({ rowIndex, message: `시도가 목록에 없습니다: "${sido}"` });
      continue;
    }
    const sidoTyped = sido as (typeof REGION_SIDO_LIST)[number];
    const guguns = REGION_GUGUN[sidoTyped] ?? [];
    if (!guguns.includes(gugun)) {
      errors.push({ rowIndex, message: `시군구가 "${sido}" 목록에 없습니다: "${gugun}"` });
      continue;
    }

    const status = parseStatus(statusRaw);
    if (!status) {
      errors.push({ rowIndex, message: `상태는 open/closed 또는 모집중/마감 등으로 입력하세요: "${statusRaw}"` });
      continue;
    }

    let category_main_id: string;
    let category_sub_id: string | null;
    let position_job_type_input: string;
    let normalized_job_type_key: string | null;
    let normalization_status: "auto_mapped" | "manual_review";

    if (useSubColumn && subIdRaw.trim()) {
      if (!isUuid(subIdRaw)) {
        errors.push({ rowIndex, message: `category_sub_id(UUID) 형식이 아닙니다: "${subIdRaw}"` });
        continue;
      }
      const meta = ctx.subByLower.get(subIdRaw.trim().toLowerCase());
      if (!meta) {
        errors.push({
          rowIndex,
          message: `청소업종 기준표에 없는 category_sub_id입니다. 시트「${JOB_BULK_SHEET_CATEGORIES}」의 소분류 UUID를 복사하세요.`,
        });
        continue;
      }
      category_main_id = meta.parent_id;
      category_sub_id = meta.id;
      const resolved = resolveJobTypeFromSub(meta);
      position_job_type_input = resolved.position_job_type_input;
      normalized_job_type_key = resolved.normalized_job_type_key;
      normalization_status = resolved.normalization_status;
    } else if (useMainColumn && mainIdRaw.trim()) {
      if (!isUuid(mainIdRaw)) {
        errors.push({ rowIndex, message: `category_main_id(UUID) 형식이 아닙니다: "${mainIdRaw}"` });
        continue;
      }
      const canonMain = ctx.mainIdByLower.get(mainIdRaw.trim().toLowerCase());
      if (!canonMain) {
        errors.push({
          rowIndex,
          message: `유효하지 않은 category_main_id입니다. 가능하면 category_sub_id(작업 종류) 템플릿을 사용하세요.`,
        });
        continue;
      }
      category_main_id = canonMain;
      category_sub_id = null;
      position_job_type_input = ctx.mainNameById.get(canonMain) ?? "엑셀 대량";
      normalized_job_type_key = null;
      normalization_status = "manual_review";
    } else {
      errors.push({
        rowIndex,
        message: useSubColumn
          ? "category_sub_id를 입력하세요. 기준표 시트에서 작업 종류 UUID를 복사합니다."
          : "category_main_id를 입력하세요.",
      });
      continue;
    }

    const pay = Number(String(payRaw).replace(/,/g, ""));
    if (!Number.isFinite(pay) || pay <= 0) {
      errors.push({ rowIndex, message: `금액이 올바르지 않습니다: "${payRaw}"` });
      continue;
    }

    const pay_unit = parsePayUnit(payUnitRaw);
    if (!pay_unit) {
      errors.push({ rowIndex, message: `급여단위는 일당/반당/시급 또는 day/half_day/hour: "${payUnitRaw}"` });
      continue;
    }

    const skill_level = parseSkill(skillRaw);
    if (!skill_level) {
      errors.push({ rowIndex, message: `숙련도는 기공/보조 또는 expert/general: "${skillRaw}"` });
      continue;
    }

    if (!contact) {
      errors.push({ rowIndex, message: "연락처를 입력하세요." });
      continue;
    }

    const external_registered_at = regRaw ? parseDateCell(regRaw) : null;
    if (regRaw && !external_registered_at) {
      errors.push({ rowIndex, message: `등록일 형식이 올바르지 않습니다 (YYYY-MM-DD): "${regRaw}"` });
      continue;
    }

    const work_date = workDateRaw ? parseDateCell(workDateRaw) : null;
    if (workDateRaw && !work_date) {
      errors.push({ rowIndex, message: `근무일 형식이 올바르지 않습니다: "${workDateRaw}"` });
      continue;
    }

    ok.push({
      rowIndex,
      external_registered_at,
      title,
      region: formatRegionForDb(sido, gugun),
      district: gugun,
      work_date,
      contact_phone: contact,
      status,
      category_main_id,
      category_sub_id,
      position_job_type_input,
      normalized_job_type_key,
      normalization_status,
      pay_amount: pay,
      pay_unit,
      skill_level,
      source_url: sourceUrl?.trim() || null,
      description: desc?.trim() || null,
    });
  }

  return { ok, errors };
}

/** 엑셀 기준표 한 줄: 구인 화면 JOB_TYPE_PRESETS 순서·라벨과 맞춤 */
export type JobBulkTemplateSubRow = JobBulkSubMeta & {
  parent_name: string;
  /** 구인 등록 화면 태그 텍스트(유리청소, 상가청소 …) */
  screen_label: string;
  /** DB에 해당 slug 소분류가 없을 때 */
  missing_in_db?: boolean;
};

/**
 * DB 소분류 목록을 slug로 매칭해, 구인 화면과 동일한 순서·라벨로 기준표 행 생성.
 * (상가청소 ↔ slug office ↔ DB 이름 "사무실청소" 처럼 라벨과 DB명이 다를 수 있음)
 */
export function buildPresetAlignedTemplateRows(
  subs: JobBulkSubMeta[],
  mainNameById: Map<string, string>
): JobBulkTemplateSubRow[] {
  const bySlug = new Map<string, JobBulkSubMeta[]>();
  for (const s of subs) {
    const sl = (s.slug ?? "").trim();
    if (!sl) continue;
    const arr = bySlug.get(sl) ?? [];
    arr.push(s);
    bySlug.set(sl, arr);
  }

  const rows: JobBulkTemplateSubRow[] = [];
  for (const preset of JOB_TYPE_PRESETS) {
    const matches = bySlug.get(preset.subSlug) ?? [];
    const sub = matches[0];
    if (sub) {
      rows.push({
        ...sub,
        parent_name: mainNameById.get(sub.parent_id) ?? "",
        screen_label: preset.label,
        missing_in_db: false,
      });
    } else {
      rows.push({
        id: "",
        parent_id: "",
        name: "",
        slug: preset.subSlug,
        sort_order: null,
        parent_name: "",
        screen_label: preset.label,
        missing_in_db: true,
      });
    }
  }
  return rows;
}

function categoryTemplateRowToAoA(s: JobBulkTemplateSubRow): unknown[] {
  return [s.id, s.screen_label, s.name || "(없음)"];
}

export function buildJobBulkTemplateWorkbook(presetRows: JobBulkTemplateSubRow[]): XLSXNS.WorkBook {
  const wb = XLSX.utils.book_new();

  const firstWithId = presetRows.find((s) => s.id && !s.missing_in_db);
  const exampleSubId = firstWithId?.id ?? "";

  const exampleRow = [
    "2025-01-15",
    "예시) 서대문 오피스텔 청소",
    "서울",
    "서대문구",
    "",
    "010-0000-0000",
    "마감",
    exampleSubId,
    "120000",
    "일당",
    "보조",
    "",
    "예시 행은 삭제 후 실제 데이터만 남기세요",
  ];
  const dataSheet = XLSX.utils.aoa_to_sheet([
    [...JOB_BULK_HEADERS],
    exampleRow,
    ...Array.from({ length: 20 }, () => JOB_BULK_HEADERS.map(() => "")),
  ]);
  XLSX.utils.book_append_sheet(wb, dataSheet, JOB_BULK_SHEET_DATA);

  const catRows: unknown[][] = [
    ["uuid", "구인화면명", "db카테고리명"],
    ["※ 구인 화면에서 선택 가능한 업종만 표시됩니다. category_sub_id에는 uuid를 사용하세요.", "", ""],
    ...presetRows.map(categoryTemplateRowToAoA),
  ];
  const catSheet = XLSX.utils.aoa_to_sheet(catRows);
  XLSX.utils.book_append_sheet(wb, catSheet, JOB_BULK_SHEET_CATEGORIES);

  return wb;
}
