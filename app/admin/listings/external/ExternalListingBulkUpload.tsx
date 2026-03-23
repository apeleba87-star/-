"use client";

import { useState } from "react";

type UploadResult = {
  inserted: number;
  parseErrors: { rowIndex: number; message: string }[];
  insertFailures: { rowIndex: number; message: string }[];
  message?: string;
  error?: string;
};

export default function ExternalListingBulkUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<UploadResult | null>(null);

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/admin/listings/bulk-upload", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as UploadResult & { error?: string };
      if (!res.ok) {
        setResult({
          inserted: 0,
          parseErrors: [],
          insertFailures: [],
          error: data.error ?? `요청 실패 (${res.status})`,
        });
      } else {
        setResult(data);
      }
    } catch {
      setResult({
        inserted: 0,
        parseErrors: [],
        insertFailures: [],
        error: "네트워크 오류",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">엑셀 대량 업로드</h2>
      <p className="mt-1 text-sm text-slate-600">
        시트 「<strong>집계안내</strong>」에 <code className="rounded bg-slate-100 px-1 text-xs">listing_benchmarks</code>{" "}
        집계 기준을 적어 두었습니다. 「<strong>현장거래기준표</strong>」에서{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">category_main_id</code> /{" "}
        <code className="rounded bg-slate-100 px-1 text-xs">category_sub_id</code>를 복사하고, 거래유형에 맞게 월수금·
        매매가(성사금액)·배수를 넣으세요.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <a
          href="/api/admin/listings/bulk-template"
          className="inline-flex items-center rounded-lg border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100"
        >
          템플릿 엑셀 다운로드
        </a>
      </div>

      <form onSubmit={handleUpload} className="mt-6 space-y-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">채운 엑셀 파일</label>
          <input
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="mt-1 block w-full text-sm text-slate-600"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <button
          type="submit"
          disabled={!file || loading}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "업로드 중…" : "업로드 및 등록"}
        </button>
      </form>

      {result && (
        <div className="mt-6 space-y-3 text-sm">
          {result.error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-red-800">{result.error}</div>
          )}
          {result.message && !result.error && (
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-900">{result.message}</div>
          )}
          {result.parseErrors.length > 0 && (
            <div>
              <p className="font-medium text-amber-900">파싱·검증 오류 ({result.parseErrors.length}건)</p>
              <ul className="mt-1 max-h-40 list-inside list-disc overflow-y-auto text-amber-800">
                {result.parseErrors.map((e, i) => (
                  <li key={i}>
                    {e.rowIndex}행: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {result.insertFailures.length > 0 && (
            <div>
              <p className="font-medium text-red-900">DB 저장 실패 ({result.insertFailures.length}건)</p>
              <ul className="mt-1 max-h-40 list-inside list-disc overflow-y-auto text-red-800">
                {result.insertFailures.map((e, i) => (
                  <li key={i}>
                    {e.rowIndex}행: {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
