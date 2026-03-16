"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createExternalListingsBulk, type BulkRowInput } from "./actions";

const COLUMNS = [
  "제목",
  "본문",
  "지역",
  "유형",
  "카테고리",
  "월수금",
  "매매가",
  "배수",
  "평수",
  "주회수",
  "연락처",
  "출처 URL",
] as const;

type CategoryRow = { id: string; name: string };

/** 탭 구분, 따옴표(") 안의 줄바꿈·탭은 한 셀로 유지 (구글 시트/엑셀 복사 형식) */
function parseTsvWithQuotes(text: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = "";
  let inQuotes = false;
  let i = 0;
  const len = text.length;

  while (i < len) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < len && text[i + 1] === '"') {
          currentCell += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      currentCell += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === "\t") {
      currentRow.push(currentCell);
      currentCell = "";
      i++;
      continue;
    }
    if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && i + 1 < len && text[i + 1] === "\n") i++;
      currentRow.push(currentCell);
      currentCell = "";
      rows.push(currentRow);
      currentRow = [];
      i++;
      continue;
    }
    currentCell += ch;
    i++;
  }
  currentRow.push(currentCell);
  if (currentRow.some((c) => c.length > 0)) rows.push(currentRow);
  return rows;
}

function parseNum(val: string | undefined): number | null {
  if (val == null || String(val).trim() === "") return null;
  const s = String(val).replace(/,/g, "").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function parsePaste(text: string): BulkRowInput[] {
  const lines = parseTsvWithQuotes(text).map((cells) => cells.map((c) => c.trim()));
  const nonEmpty = lines.filter((cells) => cells.some((c) => c.length > 0));
  if (nonEmpty.length === 0) return [];

  const first = nonEmpty[0];
  const isHeader =
    first.length > 0 &&
    /^(제목|title|본문|지역|유형|카테고리|월수금|매매가|배수|평수|주회수|연락처|출처)/i.test(first[0]);
  const dataLines = isHeader ? nonEmpty.slice(1) : nonEmpty;

  return dataLines.map((cells) => ({
    title: cells[0] ?? "",
    body: cells[1]?.trim() || null,
    region: cells[2] ?? "",
    listing_type: cells[3] ?? "",
    category_name: cells[4] ?? "",
    monthly_amount: parseNum(cells[5]) ?? null,
    deal_amount: parseNum(cells[6]) ?? null,
    sale_multiplier: parseNum(cells[7]) ?? null,
    area_pyeong: parseNum(cells[8]) ?? null,
    visits_per_week: parseNum(cells[9]) ?? null,
    contact_phone: cells[10] ?? "",
    source_url: cells[11]?.trim() || null,
  }));
}

export default function ExcelPasteForm({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [pasteText, setPasteText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ inserted: number; failed: { row: number; message: string }[] } | null>(null);

  const rows = parsePaste(pasteText);
  const rowCount = rows.length;

  const handleSubmit = useCallback(async () => {
    if (rowCount === 0) return;
    setResult(null);
    setLoading(true);
    const res = await createExternalListingsBulk(rows, categories);
    setLoading(false);
    if (res.ok) {
      setResult({ inserted: res.inserted, failed: res.failed });
      if (res.inserted > 0) router.refresh();
    } else {
      setResult({ inserted: 0, failed: [{ row: 0, message: res.error }] });
    }
  }, [rows, rowCount, categories, router]);

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">엑셀 붙여넣기 일괄 등록</h2>
        <p className="mt-1 text-sm text-slate-500">
          현장거래는 일당 없이 월수금·매매가·배수 등으로 입력합니다. 아래 열 순서로 엑셀에 정리한 뒤 복사하여 붙여넣기 하세요. 첫 줄이 헤더면 자동 제외됩니다.
        </p>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-300">
        <table className="w-full min-w-[800px] border-collapse bg-white text-left text-sm">
          <thead>
            <tr className="border-b border-slate-300 bg-slate-100">
              {COLUMNS.map((col, i) => (
                <th
                  key={col}
                  className="whitespace-nowrap border-r border-slate-200 px-3 py-2.5 font-semibold text-slate-800 last:border-r-0"
                  style={{
                    minWidth: i === 0 ? 120 : i === 1 ? 140 : 80,
                  }}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-slate-100 bg-slate-100/80 text-slate-400">
              <td className="border-r border-slate-100 px-3 py-2 text-xs italic">(예시) 청소 현장 매매</td>
              <td className="border-r border-slate-100 px-3 py-2 text-xs italic">상세 설명 (선택)</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">서울 강남구</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">정기 매매</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">일반청소</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">1500000</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">30000000</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">20</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">50</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">3</td>
              <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-xs italic">010-1234-5678</td>
              <td className="max-w-[140px] truncate px-3 py-2 text-xs italic">https://cafe.naver.com/...</td>
            </tr>
            <tr className="border-b border-slate-200">
              <td colSpan={COLUMNS.length} className="p-0 align-top">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="엑셀/구글 시트에서 복사한 내용을 붙여넣으세요. 본문에 줄바꿈이 있어도 한 행으로 인식됩니다."
                  rows={10}
                  className="w-full resize-y border-0 bg-slate-50/80 px-3 py-3 font-mono text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                />
              </td>
            </tr>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-b border-slate-100 bg-white hover:bg-slate-50/50">
                <td className="max-w-[200px] truncate border-r border-slate-100 px-3 py-2 text-slate-800" title={row.title}>
                  {row.title || "—"}
                </td>
                <td className="max-w-[180px] truncate border-r border-slate-100 px-3 py-2 text-slate-600" title={row.body ?? ""}>
                  {row.body || "—"}
                </td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">{row.region || "—"}</td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">{row.listing_type || "—"}</td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">{row.category_name || "—"}</td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">
                  {row.monthly_amount != null && row.monthly_amount > 0 ? row.monthly_amount.toLocaleString() : "—"}
                </td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">
                  {row.deal_amount != null && row.deal_amount > 0 ? row.deal_amount.toLocaleString() : "—"}
                </td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">
                  {row.sale_multiplier != null ? String(row.sale_multiplier) : "—"}
                </td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">
                  {row.area_pyeong != null ? String(row.area_pyeong) : "—"}
                </td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">
                  {row.visits_per_week != null ? String(row.visits_per_week) : "—"}
                </td>
                <td className="whitespace-nowrap border-r border-slate-100 px-3 py-2 text-slate-800">{row.contact_phone || "—"}</td>
                <td className="max-w-[140px] truncate px-3 py-2 text-slate-600" title={row.source_url ?? ""}>
                  {row.source_url || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rowCount > 0 && (
        <p className="text-sm text-slate-600">
          <strong>{rowCount}</strong>행 감지됨 → 위 표에서 내용 확인 후 일괄 등록 버튼을 누르세요.
        </p>
      )}

      {result && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            result.failed.length > 0 ? "border-amber-200 bg-amber-50 text-amber-800" : "border-green-200 bg-green-50 text-green-800"
          }`}
        >
          <p className="font-medium">
            {result.inserted}건 등록됨
            {result.failed.length > 0 && `, ${result.failed.length}건 실패`}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 list-inside list-disc">
              {result.failed.slice(0, 10).map((f, i) => (
                <li key={i}>
                  {f.row > 0 ? `${f.row}행: ${f.message}` : f.message}
                </li>
              ))}
              {result.failed.length > 10 && (
                <li>외 {result.failed.length - 10}건 …</li>
              )}
            </ul>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || rowCount === 0}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "등록 중…" : `${rowCount}건 일괄 등록`}
        </button>
      </div>
    </div>
  );
}
