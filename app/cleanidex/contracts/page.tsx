"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { contractStatusLabelKo } from "@/lib/cleanidex/contract-display";

export const dynamic = "force-dynamic";

type ContractRow = {
  id: string;
  client_id: string;
  site_id: string | null;
  status: string;
  title: string | null;
  source_pdf_file_id: string | null;
  owner_signed_pdf_file_id: string | null;
  final_pdf_file_id: string | null;
  owner_signed_at: string | null;
  client_signed_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  deleted_reason: string | null;
  client_name: string | null;
  site_name: string | null;
};

type ListPagination = {
  has_more: boolean;
  limit: number;
  next_cursor: { created_at: string; id: string } | null;
};

type Tab = "completed" | "in_progress" | "all" | "trash";

type SignedUrls = {
  source_pdf: string | null;
  owner_signed_pdf: string | null;
  final_pdf: string | null;
};

type DetailContract = ContractRow & {
  template_id: string | null;
  signed_pdf_file_id: string | null;
  owner_signature_file_id: string | null;
  final_pdf_sha256: string | null;
  owner_signature_placement: unknown;
  client_signature_placement: unknown;
  text_overlays: unknown;
  signed_urls?: SignedUrls;
  signed_urls_expires_in_seconds?: number;
};

const TAB_LABEL: Record<Tab, string> = {
  completed: "완료",
  in_progress: "진행 중",
  all: "전체",
  trash: "휴지통",
};

const STATUS_PILL_KO: Record<string, { bg: string; fg: string }> = {
  draft: { bg: "bg-slate-100", fg: "text-slate-700" },
  owner_signed: { bg: "bg-amber-100", fg: "text-amber-800" },
  sent: { bg: "bg-indigo-100", fg: "text-indigo-800" },
  client_signed: { bg: "bg-emerald-100", fg: "text-emerald-800" },
  completed: { bg: "bg-emerald-600", fg: "text-white" },
  cancelled: { bg: "bg-rose-100", fg: "text-rose-800" },
};

function formatKoDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
}

function formatKoDateTime(iso: string | null | undefined): string {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString("ko-KR");
}

function StatusPill({ status }: { status: string }) {
  const c = STATUS_PILL_KO[status] ?? { bg: "bg-slate-100", fg: "text-slate-700" };
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${c.bg} ${c.fg}`}>
      {contractStatusLabelKo(status)}
    </span>
  );
}

export default function CleanidexContractsManagePage() {
  const [tab, setTab] = useState<Tab>("completed");
  const [titleQuery, setTitleQuery] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [rows, setRows] = useState<ContractRow[]>([]);
  const [pagination, setPagination] = useState<ListPagination | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailContract | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailReloadKey, setDetailReloadKey] = useState(0);
  const [confirmTarget, setConfirmTarget] = useState<DetailContract | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [confirmReason, setConfirmReason] = useState("");
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const reqSeq = useRef(0);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(titleQuery.trim()), 250);
    return () => clearTimeout(t);
  }, [titleQuery]);

  const buildQuery = useCallback(
    (cursor: { created_at: string; id: string } | null) => {
      const sp = new URLSearchParams();
      sp.set("limit", "30");
      if (debouncedQ) sp.set("q", debouncedQ);
      if (tab === "completed") sp.set("status", "completed");
      else if (tab === "in_progress") {
        // 진행 중: 완료/취소 제외
        sp.set("status", "");
      }
      if (tab === "trash") sp.set("trash", "1");
      if (cursor) {
        sp.set("cursor_created_at", cursor.created_at);
        sp.set("cursor_id", cursor.id);
      }
      return sp;
    },
    [debouncedQ, tab],
  );

  const loadInitial = useCallback(async () => {
    const seq = ++reqSeq.current;
    setLoading(true);
    setError(null);
    try {
      const sp = buildQuery(null);
      const res = await fetch(`/api/cleanidex/contracts?${sp.toString()}`);
      const json = await res.json();
      if (seq !== reqSeq.current) return;
      if (!res.ok) {
        setError(json.error ?? "load_failed");
        setRows([]);
        setPagination(null);
        return;
      }
      const data = (json.data ?? []) as ContractRow[];
      const filtered =
        tab === "in_progress"
          ? data.filter((r) => r.status !== "completed" && r.status !== "cancelled")
          : data;
      setRows(filtered);
      setPagination(json.pagination ?? null);
    } catch (e) {
      if (seq !== reqSeq.current) return;
      setError(e instanceof Error ? e.message : "load_failed");
    } finally {
      if (seq === reqSeq.current) setLoading(false);
    }
  }, [buildQuery, tab]);

  const loadMore = useCallback(async () => {
    if (!pagination?.next_cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const sp = buildQuery(pagination.next_cursor);
      const res = await fetch(`/api/cleanidex/contracts?${sp.toString()}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? "load_failed");
        return;
      }
      const data = (json.data ?? []) as ContractRow[];
      const filtered =
        tab === "in_progress"
          ? data.filter((r) => r.status !== "completed" && r.status !== "cancelled")
          : data;
      setRows((prev) => [...prev, ...filtered]);
      setPagination(json.pagination ?? null);
    } finally {
      setLoadingMore(false);
    }
  }, [buildQuery, loadingMore, pagination, tab]);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  useEffect(() => {
    if (!selectedId) {
      setDetail(null);
      setDetailError(null);
      return;
    }
    const ctrl = new AbortController();
    setDetailLoading(true);
    setDetailError(null);
    const url = `/api/cleanidex/contracts/${selectedId}?include_deleted=1&signed_urls=1`;
    fetch(url, { signal: ctrl.signal })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) {
          setDetailError(json.error ?? "detail_load_failed");
          setDetail(null);
          return;
        }
        setDetail(json.data as DetailContract);
      })
      .catch((e) => {
        if ((e as Error).name === "AbortError") return;
        setDetailError(e instanceof Error ? e.message : "detail_load_failed");
      })
      .finally(() => setDetailLoading(false));
    return () => ctrl.abort();
  }, [selectedId, detailReloadKey]);

  const onOpenContractPdf = useCallback(async (contractId: string) => {
    try {
      const res = await fetch(
        `/api/cleanidex/contracts/${contractId}?signed_urls=1&include_deleted=1`,
      );
      const json = await res.json();
      if (!res.ok) {
        alert(json.error ?? "PDF 열기에 실패했습니다.");
        return;
      }
      const urls = (json.data?.signed_urls ?? null) as SignedUrls | null;
      const pick = urls?.final_pdf ?? urls?.owner_signed_pdf ?? urls?.source_pdf ?? null;
      if (!pick) {
        alert("열 수 있는 PDF가 없습니다.");
        return;
      }
      window.open(pick, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e instanceof Error ? e.message : "PDF 열기에 실패했습니다.");
    }
  }, []);

  const openDeleteConfirm = useCallback((target: DetailContract) => {
    setConfirmTarget(target);
    setConfirmText("");
    setConfirmReason("");
    setConfirmError(null);
  }, []);

  const closeDeleteConfirm = useCallback(() => {
    if (confirmBusy) return;
    setConfirmTarget(null);
    setConfirmText("");
    setConfirmReason("");
    setConfirmError(null);
  }, [confirmBusy]);

  const confirmExpected = useMemo(() => {
    if (!confirmTarget) return "";
    const t = confirmTarget.title?.trim();
    if (t) return t;
    const c = confirmTarget.client_name?.trim();
    if (c) return c;
    return confirmTarget.id.slice(0, 8);
  }, [confirmTarget]);

  const confirmTextValid = confirmTarget
    ? confirmText.trim() === confirmExpected
    : false;

  const onConfirmDelete = useCallback(async () => {
    if (!confirmTarget || !confirmTextValid || confirmBusy) return;
    setConfirmBusy(true);
    setConfirmError(null);
    try {
      const res = await fetch(`/api/cleanidex/contracts/${confirmTarget.id}`, {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: confirmReason.trim() || null }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        setConfirmError(json.error ?? "delete_failed");
        return;
      }
      setRows((prev) => prev.filter((r) => r.id !== confirmTarget.id));
      setConfirmTarget(null);
      setConfirmText("");
      setConfirmReason("");
      setSelectedId(null);
      setDetail(null);
      void loadInitial();
    } catch (e) {
      setConfirmError(e instanceof Error ? e.message : "delete_failed");
    } finally {
      setConfirmBusy(false);
    }
  }, [confirmBusy, confirmReason, confirmTarget, confirmTextValid, loadInitial]);

  const onRestore = useCallback(
    async (id: string) => {
      if (restoringId) return;
      setRestoringId(id);
      try {
        const res = await fetch(`/api/cleanidex/contracts/${id}/restore`, {
          method: "POST",
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          alert(json.error ?? "복구에 실패했습니다.");
          return;
        }
        setDetailReloadKey((k) => k + 1);
        void loadInitial();
      } catch (e) {
        alert(e instanceof Error ? e.message : "복구에 실패했습니다.");
      } finally {
        setRestoringId(null);
      }
    },
    [loadInitial, restoringId],
  );

  const detailSignedUrls = detail?.signed_urls ?? null;

  const headerNote = useMemo(() => {
    if (loading) return "불러오는 중…";
    if (error) return error;
    return `${rows.length}건 표시${pagination?.has_more ? " (더 있음)" : ""}`;
  }, [loading, error, rows.length, pagination]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-shell py-6 sm:py-8">
        <div className="mx-auto max-w-6xl space-y-4">
          <header className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-900">전자계약 관리</h1>
              <p className="mt-1 text-xs text-slate-500">
                서명·진행 상태별 계약을 한눈에 확인하고, PDF 열람·검색을 합니다.
              </p>
            </div>
            <Link
              href="/cleanidex/contracts/e-sign"
              className="inline-flex rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              새 전자계약 만들기
            </Link>
          </header>

          <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setTab(t);
                    setSelectedId(null);
                  }}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                    tab === t ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {TAB_LABEL[t]}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-2">
                <input
                  value={titleQuery}
                  onChange={(e) => setTitleQuery(e.target.value)}
                  placeholder="계약명 검색"
                  className="w-56 rounded border border-slate-300 px-3 py-1.5 text-sm"
                />
                <button
                  type="button"
                  onClick={() => void loadInitial()}
                  className="rounded bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
                >
                  새로고침
                </button>
              </div>
            </div>
            <p className="mt-2 text-xs text-slate-500">{headerNote}</p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">거래처</th>
                      <th className="px-3 py-2 text-left">현장</th>
                      <th className="px-3 py-2 text-left">계약명</th>
                      <th className="px-3 py-2 text-left">상태</th>
                      <th className="px-3 py-2 text-left">완료일</th>
                      <th className="px-3 py-2 text-left">생성일</th>
                      <th className="px-3 py-2 text-right">액션</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r) => {
                      const selected = selectedId === r.id;
                      return (
                        <tr
                          key={r.id}
                          onClick={() => setSelectedId(r.id)}
                          className={`cursor-pointer transition-colors ${
                            selected ? "bg-emerald-50" : "hover:bg-slate-50"
                          } ${r.deleted_at ? "opacity-60" : ""}`}
                        >
                          <td className="px-3 py-2 text-slate-800">{r.client_name ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-700">{r.site_name ?? "-"}</td>
                          <td className="px-3 py-2 text-slate-800">{r.title?.trim() || "(제목 없음)"}</td>
                          <td className="px-3 py-2">
                            {r.deleted_at ? (
                              <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                                휴지통
                              </span>
                            ) : (
                              <StatusPill status={r.status} />
                            )}
                          </td>
                          <td className="px-3 py-2 text-slate-700">{formatKoDate(r.completed_at)}</td>
                          <td className="px-3 py-2 text-slate-500">{formatKoDate(r.created_at)}</td>
                          <td className="px-3 py-2 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void onOpenContractPdf(r.id);
                              }}
                              className="rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                            >
                              PDF 열기
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {!loading && rows.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                          표시할 계약이 없습니다.
                        </td>
                      </tr>
                    ) : null}
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-3 py-8 text-center text-sm text-slate-500">
                          불러오는 중…
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
              {pagination?.has_more ? (
                <div className="border-t border-slate-100 p-3 text-center">
                  <button
                    type="button"
                    onClick={() => void loadMore()}
                    disabled={loadingMore}
                    className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                  >
                    {loadingMore ? "불러오는 중…" : "더 보기"}
                  </button>
                </div>
              ) : null}
            </div>

            <aside className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {!selectedId ? (
                <p className="text-sm text-slate-500">
                  표에서 계약 행을 선택하면 상세가 여기에 표시됩니다.
                </p>
              ) : detailLoading ? (
                <p className="text-sm text-slate-500">상세를 불러오는 중…</p>
              ) : detailError ? (
                <p className="text-sm text-rose-700">{detailError}</p>
              ) : detail ? (
                <div className="space-y-3 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">
                        {detail.title?.trim() || "(제목 없음)"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {detail.client_name ?? "거래처 미상"}
                        {detail.site_name ? ` · ${detail.site_name}` : ""}
                      </p>
                    </div>
                    {detail.deleted_at ? (
                      <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-medium text-rose-700">
                        휴지통
                      </span>
                    ) : (
                      <StatusPill status={detail.status} />
                    )}
                  </div>

                  <dl className="grid grid-cols-3 gap-x-2 gap-y-1 text-xs text-slate-600">
                    <dt>생성일</dt>
                    <dd className="col-span-2 text-slate-800">{formatKoDateTime(detail.created_at)}</dd>
                    <dt>사장 서명</dt>
                    <dd className="col-span-2 text-slate-800">{formatKoDateTime(detail.owner_signed_at)}</dd>
                    <dt>거래처 서명</dt>
                    <dd className="col-span-2 text-slate-800">{formatKoDateTime(detail.client_signed_at)}</dd>
                    <dt>완료일</dt>
                    <dd className="col-span-2 text-slate-800">{formatKoDateTime(detail.completed_at)}</dd>
                    {detail.deleted_at ? (
                      <>
                        <dt>삭제일</dt>
                        <dd className="col-span-2 text-slate-800">
                          {formatKoDateTime(detail.deleted_at)}
                        </dd>
                        {detail.deleted_reason ? (
                          <>
                            <dt>삭제 사유</dt>
                            <dd className="col-span-2 text-slate-800">{detail.deleted_reason}</dd>
                          </>
                        ) : null}
                      </>
                    ) : null}
                    {detail.final_pdf_sha256 ? (
                      <>
                        <dt>최종 SHA-256</dt>
                        <dd className="col-span-2 break-all font-mono text-[10px] text-slate-500">
                          {detail.final_pdf_sha256}
                        </dd>
                      </>
                    ) : null}
                  </dl>

                  <div className="space-y-1.5">
                    <p className="text-xs font-semibold text-slate-700">PDF</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={detailSignedUrls?.source_pdf ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => {
                          e.preventDefault();
                          void onOpenContractPdf(detail.id);
                        }}
                        className="inline-flex rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white"
                      >
                        대표 PDF 열기
                      </a>
                      {detailSignedUrls?.final_pdf ? (
                        <a
                          href={detailSignedUrls.final_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded bg-emerald-600 px-2 py-1 text-xs font-medium text-white"
                        >
                          최종 PDF
                        </a>
                      ) : null}
                      {detailSignedUrls?.owner_signed_pdf ? (
                        <a
                          href={detailSignedUrls.owner_signed_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded bg-amber-600 px-2 py-1 text-xs font-medium text-white"
                        >
                          사장 서명본
                        </a>
                      ) : null}
                      {detailSignedUrls?.source_pdf ? (
                        <a
                          href={detailSignedUrls.source_pdf}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex rounded bg-slate-200 px-2 py-1 text-xs font-medium text-slate-800"
                        >
                          원본 PDF
                        </a>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      서명된 PDF 링크는 약 {Math.round((detail.signed_urls_expires_in_seconds ?? 600) / 60)}분 후 만료됩니다.
                    </p>
                  </div>

                  {!detail.deleted_at && detail.status !== "completed" && detail.status !== "cancelled" ? (
                    <Link
                      href={`/cleanidex/contracts/e-sign?contractId=${detail.id}`}
                      className="inline-flex rounded bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white"
                    >
                      e-sign에서 이어서 작업
                    </Link>
                  ) : null}

                  <div className="border-t border-slate-100 pt-3">
                    {detail.deleted_at ? (
                      <button
                        type="button"
                        onClick={() => void onRestore(detail.id)}
                        disabled={restoringId === detail.id}
                        className="inline-flex rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:bg-emerald-300"
                      >
                        {restoringId === detail.id ? "복구 중…" : "휴지통에서 복구"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openDeleteConfirm(detail)}
                        className="inline-flex rounded bg-rose-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-rose-700"
                      >
                        삭제 (휴지통으로)
                      </button>
                    )}
                    <p className="mt-1.5 text-[11px] text-slate-500">
                      삭제 시 거래처 서명 링크가 즉시 무효화됩니다. 휴지통에서 30일간 복구할 수 있습니다.
                    </p>
                  </div>
                </div>
              ) : null}
            </aside>
          </div>
        </div>

        {confirmTarget ? (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onClick={closeDeleteConfirm}
          >
            <div
              className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-base font-semibold text-slate-900">계약 삭제(휴지통으로)</h2>
              <p className="mt-1 text-xs text-slate-600">
                해당 계약을 휴지통으로 옮깁니다. 진행 중인 거래처 서명 링크는 즉시 무효화됩니다.
              </p>

              <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-3 text-xs">
                <p className="font-medium text-slate-800">
                  {confirmTarget.title?.trim() || "(제목 없음)"}
                </p>
                <p className="text-slate-600">
                  {confirmTarget.client_name ?? "거래처 미상"}
                  {confirmTarget.site_name ? ` · ${confirmTarget.site_name}` : ""}
                </p>
              </div>

              <label className="mt-3 block text-xs text-slate-700">
                확인을 위해 <span className="font-mono font-semibold">{confirmExpected}</span>{" "}
                를 그대로 입력하세요
              </label>
              <input
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={confirmExpected}
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
                autoFocus
              />

              <label className="mt-3 block text-xs text-slate-700">삭제 사유 (선택)</label>
              <textarea
                value={confirmReason}
                onChange={(e) => setConfirmReason(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="예: 잘못된 거래처로 발급"
                className="mt-1 w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />

              {confirmError ? (
                <p className="mt-2 text-xs font-medium text-rose-700">{confirmError}</p>
              ) : null}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeDeleteConfirm}
                  disabled={confirmBusy}
                  className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 disabled:opacity-60"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void onConfirmDelete()}
                  disabled={!confirmTextValid || confirmBusy}
                  className="rounded bg-rose-600 px-3 py-1.5 text-sm font-medium text-white disabled:bg-rose-300"
                >
                  {confirmBusy ? "삭제 중…" : "삭제"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
