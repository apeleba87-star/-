"use client";

import { useState, useCallback } from "react";
import Link from "next/link";

type LicenseStats = {
  licenseReflectedCount: number;
  tendersWithPrimaryIndustry: number;
  sampleTenders: { bid_ntce_no: string; bid_ntce_ord: string; primary_industry_code: string; bid_ntce_nm: string }[];
  sqlForSupabase: string;
};

type Result = {
  ok: boolean;
  tenders?: number;
  inserted?: number;
  updated?: number;
  licenseReflected?: number;
  /** 목록 API 업종 매칭 공고 수 (extractIndustryMatchesFromRaw) */
  listApiMatchedCount?: number;
  /** ServcPPSSrch(업종코드별)로 반영한 공고 수 */
  ppssrchMatchedCount?: number;
  /** 면허제한 API에서 수집된 원본 건수 (grouping 전) */
  licenseRawCount?: number;
  /** 면허제한 API 오류 메시지 (있으면 실패) */
  licenseError?: string;
  /** 개발용: 면허제한 API에서 받은 공고 키 (공고번호|차수) */
  licenseKeys?: string[];
  /** 개발용: 목록과 매칭되어 DB에 반영된 키 */
  matchedLicenseKeys?: string[];
  /** 개발용: 목록 수집 키 (형식 비교용) */
  listKeys?: string[];
  error?: string;
};

type Progress = {
  phase: string;
  total?: number;
  done?: number;
  message?: string;
};

const FALLBACK_MSG = "오류가 발생했습니다. API 키·네트워크를 확인하세요.";

const SUPABASE_SQL = `-- Supabase SQL Editor에서 면허제한 API 반영 건수 확인
-- 1) 면허제한 API로 저장된 공고 수 (tender_industries, match_source = 'detail_api' 기준 distinct tender_id)
SELECT count(DISTINCT tender_id) AS license_reflected_count
FROM tender_industries
WHERE match_source = 'detail_api';

-- 2) primary_industry_code가 있는 입찰 건수
SELECT count(*) AS tenders_with_industry
FROM tenders
WHERE primary_industry_code IS NOT NULL;

-- 3) 최근 반영 공고 샘플
SELECT bid_ntce_no, bid_ntce_ord, primary_industry_code, bid_ntce_nm
FROM tenders
WHERE primary_industry_code IS NOT NULL
ORDER BY updated_at DESC NULLS LAST
LIMIT 20;
`;

function toErrorText(v: unknown): string {
  if (v == null) return FALLBACK_MSG;
  if (typeof v === "string") {
    const t = v.trim();
    return t === "" || t === "[object Object]" ? FALLBACK_MSG : t;
  }
  if (typeof v === "object" && v !== null) {
    if ("message" in v && typeof (v as { message: unknown }).message === "string") {
      return (v as { message: string }).message;
    }
    try {
      const s = JSON.stringify(v);
      if (s && s !== "{}") return s;
    } catch {
      // ignore
    }
  }
  const s = String(v);
  return s === "[object Object]" ? FALLBACK_MSG : s;
}

export default function G2bFetchButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [licenseStats, setLicenseStats] = useState<LicenseStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [showSql, setShowSql] = useState(false);
  const [showLicenseKeys, setShowLicenseKeys] = useState(false);

  const runFetch = useCallback(async () => {
    setLoading(true);
    setResult(null);
    setProgress(null);
    try {
      const res = await fetch("/api/admin/fetch-g2b?stream=1", { method: "POST" });
      if (!res.ok || !res.body) {
        const text = await res.text();
        let err: string;
        try {
          const j = JSON.parse(text) as { error?: string };
          err = (j?.error ?? text) || `서버 오류 (${res.status})`;
        } catch {
          err = text || `서버 오류 (${res.status})`;
        }
        setResult({ ok: false, error: err });
        return;
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let gotComplete = false;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const t = line.trim();
          if (!t) continue;
          try {
            const data = JSON.parse(t) as { type?: string; phase?: string; total?: number; done?: number; message?: string; ok?: boolean; tenders?: number; inserted?: number; updated?: number; licenseReflected?: number; listApiMatchedCount?: number; ppssrchMatchedCount?: number; licenseRawCount?: number; licenseError?: string; licenseKeys?: string[]; matchedLicenseKeys?: string[]; listKeys?: string[]; error?: string };
            if (data.type === "progress") {
              setProgress({
                phase: data.phase ?? "upsert",
                total: data.total,
                done: data.done,
                message: data.message,
              });
            } else if (data.type === "complete") {
              gotComplete = true;
              const err = data.ok
                ? undefined
                : (typeof data.error === "string" && data.error.trim()
                    ? data.error.trim()
                    : data.error != null && typeof data.error === "object" && "message" in data.error
                      ? String((data.error as { message: unknown }).message)
                      : data.error != null
                        ? String(data.error)
                        : "수집 실패. 서버에서 오류 내용을 받지 못했습니다. (중간에 끊겼거나 시간 초과일 수 있습니다.)");
              setResult({
                ok: data.ok === true,
                tenders: Number(data.tenders) ?? 0,
                inserted: Number(data.inserted) ?? 0,
                updated: Number(data.updated) ?? 0,
                licenseReflected: data.licenseReflected != null ? Number(data.licenseReflected) : 0,
                listApiMatchedCount: data.listApiMatchedCount != null ? Number(data.listApiMatchedCount) : undefined,
                ppssrchMatchedCount: data.ppssrchMatchedCount != null ? Number(data.ppssrchMatchedCount) : undefined,
                licenseRawCount: data.licenseRawCount != null ? Number(data.licenseRawCount) : undefined,
                licenseError: typeof data.licenseError === "string" ? data.licenseError : undefined,
                licenseKeys: Array.isArray(data.licenseKeys) ? data.licenseKeys : undefined,
                matchedLicenseKeys: Array.isArray(data.matchedLicenseKeys) ? data.matchedLicenseKeys : undefined,
                listKeys: Array.isArray(data.listKeys) ? data.listKeys : undefined,
                error: err,
              });
              setProgress(null);
            }
          } catch {
            // skip malformed line
          }
        }
      }
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer.trim()) as { type?: string; phase?: string; total?: number; done?: number; message?: string; ok?: boolean; tenders?: number; inserted?: number; updated?: number; licenseReflected?: number; listApiMatchedCount?: number; ppssrchMatchedCount?: number; licenseRawCount?: number; licenseError?: string; licenseKeys?: string[]; matchedLicenseKeys?: string[]; listKeys?: string[]; error?: string };
          if (data.type === "complete") {
            gotComplete = true;
            const err = data.ok
              ? undefined
              : (typeof data.error === "string" && data.error.trim()
                  ? data.error.trim()
                  : data.error != null && typeof data.error === "object" && "message" in data.error
                    ? String((data.error as { message: unknown }).message)
                    : data.error != null
                      ? String(data.error)
                      : "수집 실패. 서버에서 오류 내용을 받지 못했습니다. (중간에 끊겼거나 시간 초과일 수 있습니다.)");
            setResult({
              ok: data.ok === true,
              tenders: Number(data.tenders) ?? 0,
              inserted: Number(data.inserted) ?? 0,
              updated: Number(data.updated) ?? 0,
              licenseReflected: data.licenseReflected != null ? Number(data.licenseReflected) : 0,
              listApiMatchedCount: data.listApiMatchedCount != null ? Number(data.listApiMatchedCount) : undefined,
              ppssrchMatchedCount: data.ppssrchMatchedCount != null ? Number(data.ppssrchMatchedCount) : undefined,
              licenseRawCount: data.licenseRawCount != null ? Number(data.licenseRawCount) : undefined,
              licenseError: typeof data.licenseError === "string" ? data.licenseError : undefined,
              licenseKeys: Array.isArray(data.licenseKeys) ? data.licenseKeys : undefined,
              matchedLicenseKeys: Array.isArray(data.matchedLicenseKeys) ? data.matchedLicenseKeys : undefined,
              listKeys: Array.isArray(data.listKeys) ? data.listKeys : undefined,
              error: err,
            });
            setProgress(null);
          }
        } catch {
          // ignore
        }
      }
      if (!gotComplete) {
        setResult({
          ok: false,
          error: "수집이 중간에 끊겼습니다. 연결 시간 초과일 수 있습니다. 잠시 후 다시 시도해 보세요.",
        });
        setProgress(null);
      }
    } catch (e) {
      setResult({
        ok: false,
        error: e instanceof Error ? e.message : "요청 실패",
      });
      setProgress(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const displayError = result?.error != null ? toErrorText(result.error) : "";

  return (
    <div className="card block">
      <h3 className="text-sm font-medium text-slate-500">나라장터 수집</h3>
      <p className="mt-1 text-sm text-slate-600">
        최근 1일치 입찰 공고를 수집합니다. 추후 cron으로 자동 실행 예정입니다.
      </p>
      <button
        type="button"
        onClick={runFetch}
        disabled={loading}
        className="mt-3 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {loading ? "수집 중…" : "지금 수집 실행"}
      </button>

      {loading && progress && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
          <p className="font-medium text-slate-700">
            {progress.phase === "fetch" ? progress.message : progress.message ?? "저장 중…"}
          </p>
          {progress.total != null && progress.total > 0 && (
            <>
              <p className="mt-1 text-slate-600">
                총 <span className="font-semibold text-blue-600">{progress.total.toLocaleString()}</span>건 중{" "}
                <span className="font-semibold text-blue-600">{(progress.done ?? 0).toLocaleString()}</span>건 수집 중
              </p>
              <p className="mt-0.5 text-slate-500">
                <span className="font-medium text-amber-600">
                  {progress.total && progress.total > 0
                    ? `${Math.round(100 - ((progress.done ?? 0) / progress.total) * 100)}% 남음`
                    : "—"}
                </span>
              </p>
              <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${Math.min(100, ((progress.done ?? 0) / progress.total) * 100)}%` }}
                />
              </div>
            </>
          )}
        </div>
      )}

      {result && !loading && (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
          {result.ok ? (
            <>
              <p className="font-medium text-emerald-700">수집 성공</p>
              <p className="mt-1 text-slate-700">
                신규 {result.inserted ?? 0}건, 갱신 {result.updated ?? 0}건 (총 {result.tenders ?? 0}건)
              </p>
              {result.listApiMatchedCount != null && (
                <p className="mt-1 text-slate-600 text-sm">
                  목록 API 업종 매칭:{" "}
                  {(result.listApiMatchedCount ?? 0) > 0 ? (
                    <span className="font-medium text-emerald-700">{result.listApiMatchedCount}건 반영</span>
                  ) : (
                    <span className="text-slate-400">0건 (공고명에 업종 키워드 없음)</span>
                  )}
                </p>
              )}
              {result.ppssrchMatchedCount != null && (
                <p className="mt-1 text-slate-600 text-sm">
                  업종(PPSSrch):{" "}
                  <span className="font-medium text-emerald-700">{result.ppssrchMatchedCount}건 반영</span>
                  <span className="ml-1 text-slate-400 text-xs">(건물위생관리업 등 업종코드별 조회)</span>
                </p>
              )}
              <p className="mt-1 text-slate-500 text-xs">
                면허제한 API:{" "}
                {result.licenseError ? (
                  <span className="text-red-600">오류 - {result.licenseError}</span>
                ) : (result.licenseReflected ?? 0) > 0 ? (
                  `${result.licenseReflected}건 추가 반영`
                ) : (
                  "추가 반영 없음"
                )}
                {result.licenseRawCount != null && !result.licenseError && (
                  <span className="ml-1 text-slate-400">(14일치 {result.licenseRawCount}건 수집)</span>
                )}
              </p>
              {((result.listKeys?.length ?? 0) > 0 || (result.licenseKeys?.length ?? 0) > 0) && (
                <div className="mt-2 border-t border-slate-200 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLicenseKeys((v) => !v)}
                    className="text-xs font-medium text-slate-600 hover:text-slate-900"
                  >
                    {showLicenseKeys ? "숨기기" : "개발용: 목록/면허제한 키 비교 보기"}
                  </button>
                  {showLicenseKeys && (
                    <div className="mt-1.5 space-y-2 text-xs">
                      <p className="text-slate-600">
                        목록 수집 키 (fullIdByKey): {result.listKeys?.length ?? 0}건
                      </p>
                      {(result.listKeys?.length ?? 0) > 0 && (
                        <pre className="max-h-24 overflow-auto rounded border border-slate-200 bg-white p-2 font-mono text-[11px]">
                          {result.listKeys!.slice(0, 30).join("\n")}
                          {(result.listKeys!.length ?? 0) > 30 ? `\n… 외 ${result.listKeys!.length! - 30}건` : ""}
                        </pre>
                      )}
                      <p className="text-slate-600">
                        면허제한 API에서 받은 키 (공고번호|차수): {result.licenseKeys!.length}건
                      </p>
                      <pre className="max-h-32 overflow-auto rounded border border-slate-200 bg-white p-2 font-mono text-[11px]">
                        {result.licenseKeys!.join("\n")}
                      </pre>
                      <p className="text-slate-600">
                        목록과 매칭되어 DB에 반영된 키: {(result.matchedLicenseKeys?.length ?? 0)}건
                      </p>
                      {(result.matchedLicenseKeys?.length ?? 0) > 0 && (
                        <pre className="max-h-24 overflow-auto rounded border border-slate-200 bg-white p-2 font-mono text-[11px]">
                          {result.matchedLicenseKeys!.join("\n")}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              )}
              <p className="mt-1.5 text-sm text-slate-600">
                <Link href="/tenders" className="underline hover:text-slate-900">
                  입찰 공고
                </Link>
                에서 새 데이터를 확인하세요. 등록일순 정렬로 최신 공고를 먼저 볼 수 있습니다.
              </p>
              <div className="mt-3 border-t border-slate-200 pt-3">
                <p className="mb-2 text-xs font-medium text-slate-600">Supabase에서 직접 확인</p>
                <button
                  type="button"
                  onClick={async () => {
                    setStatsLoading(true);
                    setLicenseStats(null);
                    try {
                      const r = await fetch("/api/admin/g2b-license-stats");
                      const data = await r.json();
                      if (r.ok) setLicenseStats(data);
                    } finally {
                      setStatsLoading(false);
                    }
                  }}
                  disabled={statsLoading}
                  className="rounded bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300 disabled:opacity-50"
                >
                  {statsLoading ? "조회 중…" : "DB 반영 건수 조회"}
                </button>
                {licenseStats && (
                  <div className="mt-2 text-xs text-slate-600">
                    <p>면허제한 API 반영 공고 수: {licenseStats.licenseReflectedCount}건</p>
                    <p>primary_industry_code 있는 공고 수: {licenseStats.tendersWithPrimaryIndustry}건</p>
                    {licenseStats.sampleTenders.length > 0 && (
                      <p className="mt-1">샘플: {licenseStats.sampleTenders[0].bid_ntce_no} …</p>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => setShowSql((v) => !v)}
                  className="ml-2 rounded bg-slate-200 px-2 py-1 text-xs hover:bg-slate-300"
                >
                  {showSql ? "SQL 숨기기" : "Supabase SQL 보기"}
                </button>
                {showSql && (
                  <div className="mt-2">
                    <p className="mb-1 text-xs text-slate-500">Supabase SQL Editor에 붙여넣어 실행하면 동일하게 확인할 수 있습니다.</p>
                    <textarea readOnly className="h-44 w-full resize-y rounded border border-slate-300 bg-white p-2 font-mono text-xs" value={SUPABASE_SQL} />
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="font-medium text-red-700">수집 실패</p>
              <p className="mt-1 text-red-700">{displayError}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
