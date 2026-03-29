"use client";

import { useRef, useState, useTransition } from "react";
import * as XLSX from "xlsx";
import { bulkImportNaverTrendKeywordGroups, type BulkNaverTrendRowInput } from "./actions";
import type { KeywordGroupRow } from "./NaverTrendKeywordsManager";

type Props = {
  pending: boolean;
  startTransition: (cb: () => void) => void;
  onImported: (rows: KeywordGroupRow[]) => void;
  setMsg: (s: string | null) => void;
};

type HeaderKey =
  | "group_name"
  | "keywords_raw"
  | "sub_raw"
  | "size_raw"
  | "templates_raw"
  | "sort_order"
  | "is_active"
  | null;

/** 헤더 셀 → 표준 필드명 */
function canonicalField(header: string): HeaderKey {
  const t = header.trim();
  const lower = t.toLowerCase().replace(/\s/g, "");
  if (["주제어", "그룹명"].includes(t) || lower === "group_name" || lower === "group") return "group_name";
  if (
    t === "키워드" ||
    t === "메인" ||
    t === "메인키워드" ||
    lower === "keywords" ||
    lower === "keyword" ||
    lower === "main" ||
    lower === "mainkeyword"
  )
    return "keywords_raw";
  if (t === "서브" || lower === "sub" || lower === "subs" || lower === "sub_keywords") return "sub_raw";
  if (
    t === "크기" ||
    t === "평형" ||
    t === "유형" ||
    lower === "size" ||
    lower === "sizes" ||
    lower === "size_keywords"
  )
    return "size_raw";
  if (t === "템플릿" || lower === "templates" || lower === "template" || lower === "title_templates") return "templates_raw";
  if (t === "순서" || lower === "sort_order" || lower === "sort" || lower === "order") return "sort_order";
  if (t === "활성" || lower === "is_active" || lower === "active" || t === "사용") return "is_active";
  return null;
}

/** 메인 키워드 셀: 쉼표·세미콜론·줄바꿈으로 여러 값이 있으면 첫 값만 사용(경고는 상위에서) */
function parseKeywordsCell(val: unknown): string[] {
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  return s
    .split(/[,，;；\n\r]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

/** 서브·크기: 쉼표(,) 구분 기본. 세미콜론·줄바꿈도 허용 */
function parseSubsCell(val: unknown): string[] {
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  return s
    .split(/[,，;；\n\r]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

const parseSizesCell = parseSubsCell;

/** 템플릿: 줄바꿈이 여러 개면 줄 단위. 한 줄이면 쉼표·세미콜론으로 여러 템플릿 구분(문장 안 쉼표는 줄바꿈으로만 나누는 것을 권장) */
function parseTemplatesCell(val: unknown): string[] {
  if (val == null) return [];
  const s = String(val).trim();
  if (!s) return [];
  const byLine = s.split(/\n+/).map((x) => x.trim()).filter(Boolean);
  if (byLine.length > 1) return byLine;
  return byLine[0]!
    .split(/[,，;；]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function parseBoolCell(val: unknown): boolean {
  if (val === true || val === false) return val;
  const s = String(val ?? "")
    .trim()
    .toLowerCase();
  if (s === "" || s === "1" || s === "y" || s === "yes" || s === "o" || s === "예" || s === "true") return true;
  if (s === "0" || s === "n" || s === "no" || s === "x" || s === "아니오" || s === "false") return false;
  return true;
}

function parseSheetToRows(sheet: XLSX.WorkSheet): { rows: BulkNaverTrendRowInput[]; errors: string[] } {
  const matrix = XLSX.utils.sheet_to_json<(string | number | boolean | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  if (matrix.length < 2) {
    return { rows: [], errors: ["데이터가 없습니다. 1행은 헤더, 2행부터 입력하세요."] };
  }

  const headerRow = matrix[0].map((c) => String(c ?? "").trim());
  const colMap: Partial<Record<NonNullable<HeaderKey>, number>> = {};
  headerRow.forEach((h, idx) => {
    const key = canonicalField(h);
    if (key) colMap[key] = idx;
  });

  if (colMap.group_name == null) {
    return {
      rows: [],
      errors: ['필수 열이 없습니다. 첫 행에 "주제어"(또는 group_name)가 있어야 합니다. "키워드"(메인 1개)는 비우면 주제어와 동일하게 저장됩니다.'],
    };
  }

  const rows: BulkNaverTrendRowInput[] = [];
  const errors: string[] = [];

  for (let r = 1; r < matrix.length; r += 1) {
    const line = r + 1;
    const row = matrix[r];
    if (!row || row.every((c) => String(c ?? "").trim() === "")) continue;

    const gn = String(row[colMap.group_name!] ?? "").trim();
    const kwCell = colMap.keywords_raw != null ? row[colMap.keywords_raw!] : "";
    const parsedKw = parseKeywordsCell(kwCell);
    const keywords = parsedKw.length > 0 ? parsedKw : gn ? [gn] : [];

    const sub_keywords =
      colMap.sub_raw != null ? parseSubsCell(row[colMap.sub_raw!]) : [];
    const size_keywords =
      colMap.size_raw != null ? parseSizesCell(row[colMap.size_raw!]) : [];
    const title_templates =
      colMap.templates_raw != null ? parseTemplatesCell(row[colMap.templates_raw!]) : [];

    let sort_order = 0;
    if (colMap.sort_order != null && row[colMap.sort_order] !== undefined && row[colMap.sort_order] !== "") {
      const n = Number(String(row[colMap.sort_order]).replace(/,/g, ""));
      sort_order = Number.isFinite(n) ? Math.floor(n) : 0;
    }

    let is_active = true;
    if (colMap.is_active != null && row[colMap.is_active] !== undefined && String(row[colMap.is_active]).trim() !== "") {
      is_active = parseBoolCell(row[colMap.is_active]);
    }

    if (!gn && keywords.length === 0) continue;
    if (!gn) {
      errors.push(`${line}행: 주제어가 비어 있습니다.`);
      continue;
    }
    if (keywords.length < 1) {
      errors.push(`${line}행「${gn}」: 메인 키워드를 알 수 없습니다.`);
      continue;
    }
    if (parsedKw.length > 1) {
      errors.push(`${line}행「${gn}」: 메인은 1개만 사용합니다. 첫 값만 저장합니다.`);
    }

    rows.push({
      group_name: gn,
      keywords,
      sub_keywords,
      size_keywords,
      title_templates,
      sort_order,
      is_active,
    });
  }

  return { rows, errors };
}

function downloadSample() {
  const aoa = [
    ["주제어", "키워드", "서브", "크기", "템플릿", "순서", "활성"],
    [
      "입주청소",
      "입주청소",
      "비용, 후기",
      "10평, 11평, 원룸, 투룸",
      "{지역} {크기} {메인} {서브} 총정리, {메인} {서브} {크기} 꿀팁",
      0,
      "예",
    ],
    ["학교청소", "", "화장실, 복도", "", "{메인} {서브} 체크리스트", 1, "예"],
  ];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "키워드");
  XLSX.writeFile(wb, "naver-trend-keywords-sample.xlsx");
}

export default function NaverTrendExcelUpload({ pending, startTransition, onImported, setMsg }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [localErr, setLocalErr] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-dashed border-blue-200 bg-blue-50/40 p-4">
      <h2 className="text-sm font-semibold text-slate-800">엑셀 일괄 등록</h2>
      <p className="mt-1 text-xs text-slate-600">
        1행 헤더: <strong>주제어</strong>(필수), <strong>키워드</strong> 또는 <strong>메인</strong>(비우면 주제어와 동일·데이터랩 1개만), 선택{" "}
        <strong>서브</strong>(쉼표 나열: <code className="rounded bg-white px-0.5">비용, 후기</code>), <strong>크기</strong>(쉼표 나열:{" "}
        <code className="rounded bg-white px-0.5">10평, 11평, 원룸, 투룸</code>. 서브·크기를 모두 넣으면 조합 후보가 됩니다), <strong>템플릿</strong>
        (쉼표 또는 줄바꿈으로 여러 개. 플레이스홀더 <code className="rounded bg-white px-0.5">{`{메인}`}</code>{" "}
        <code className="rounded bg-white px-0.5">{`{서브}`}</code> <code className="rounded bg-white px-0.5">{`{크기}`}</code>{" "}
        <code className="rounded bg-white px-0.5">{`{지역}`}</code>), <strong>순서</strong>, <strong>활성</strong>. 영문: group_name, keywords,
        sub_keywords, size_keywords, title_templates.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setLocalErr(null);
            setMsg(null);
            startTransition(async () => {
              try {
                const buf = await file.arrayBuffer();
                const wb = XLSX.read(buf, { type: "array" });
                const name = wb.SheetNames[0];
                if (!name) {
                  setLocalErr("시트가 없습니다.");
                  return;
                }
                const sheet = wb.Sheets[name];
                const { rows, errors } = parseSheetToRows(sheet);
                if (errors.length > 0 && rows.length === 0) {
                  setLocalErr(errors.join("\n"));
                  return;
                }
                const r = await bulkImportNaverTrendKeywordGroups(rows);
                if (!r.ok) {
                  setLocalErr(r.error);
                  return;
                }
                const imported = (r.rows ?? []) as KeywordGroupRow[];
                onImported(imported);
                const parts = [`${r.inserted}건 등록했습니다.`];
                if (errors.length) parts.push(`스킵/경고:\n${errors.join("\n")}`);
                if (r.warnings?.length) parts.push(r.warnings.join("\n"));
                setMsg(parts.join("\n\n"));
                if (errors.length > 0 || r.warnings?.length) setLocalErr(null);
              } catch (err) {
                setLocalErr(err instanceof Error ? err.message : String(err));
              }
            });
          }}
        />
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          엑셀 파일 선택 (.xlsx / .xls)
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={downloadSample}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          샘플 엑셀 받기
        </button>
      </div>
      {localErr && (
        <pre className="mt-3 max-h-40 overflow-auto whitespace-pre-wrap rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-900">
          {localErr}
        </pre>
      )}
    </section>
  );
}
