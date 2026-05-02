"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import type { ContractTextOverlay } from "@/lib/cleanidex/contract-text-overlay";
import { parseContractTextOverlays } from "@/lib/cleanidex/contract-text-overlay";
import { MANUAL_CLIENT_SIGNATURE_PLACEMENT_PRESET } from "@/lib/cleanidex/contract-pdf";

const ContractPdfPlacementEditor = dynamic(
  () => import("@/components/cleanidex/contract-pdf-placement-editor"),
  {
    ssr: false,
    loading: () => <p className="text-sm text-slate-500">미리보기 편집기를 불러오는 중…</p>,
  }
);

const ContractPdfTextOverlaysEditor = dynamic(
  () => import("@/components/cleanidex/contract-pdf-text-overlays-editor"),
  {
    ssr: false,
    loading: () => <p className="text-sm text-slate-500">텍스트 편집기를 불러오는 중…</p>,
  }
);

type Client = { id: string; name: string };
type ContractRow = {
  id: string;
  status: string;
  title: string | null;
  source_pdf_file_id: string | null;
  owner_signature_file_id: string | null;
  owner_signed_pdf_file_id: string | null;
  final_pdf_file_id: string | null;
  owner_signature_placement: Placement | null;
  client_signature_placement: Placement | null;
  text_overlays?: ContractTextOverlay[] | unknown;
  completed_at: string | null;
  final_pdf_sha256: string | null;
};

type Placement = { pageIndex: number; x: number; y: number; width: number; height: number };

type SignedUrlBundle = {
  source_pdf: string | null;
  owner_signed_pdf: string | null;
  final_pdf: string | null;
};

const defaultPlacement: Placement = { pageIndex: 0, x: 0.55, y: 0.82, width: 0.38, height: 0.12 };

export default function CleanidexContractESignSetupPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [contractId, setContractId] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [placement, setPlacement] = useState<Placement>(defaultPlacement);
  const [signLink, setSignLink] = useState("");
  const [clientPlacement, setClientPlacement] = useState<Placement>(MANUAL_CLIENT_SIGNATURE_PLACEMENT_PRESET);
  const [clientPlacementAuto, setClientPlacementAuto] = useState(true);
  const [placementSaving, setPlacementSaving] = useState(false);
  const [signedUrls, setSignedUrls] = useState<SignedUrlBundle | null>(null);
  const [previewSignedUrls, setPreviewSignedUrls] = useState<SignedUrlBundle | null>(null);
  const [textOverlays, setTextOverlays] = useState<ContractTextOverlay[]>([]);
  const [textSaving, setTextSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/cleanidex/clients");
    const json = await res.json();
    if (res.ok && json.data) setClients(json.data);
  }, []);

  useEffect(() => {
    void loadClients();
  }, [loadClients]);

  const refreshContract = useCallback(async (id: string) => {
    const res = await fetch(`/api/cleanidex/contracts/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "계약을 불러오지 못했습니다.");
      return;
    }
    const row = json.data as ContractRow;
    setContract(row);
    if (row.owner_signature_placement) {
      setPlacement(row.owner_signature_placement as Placement);
    }
    const hasClientPlacement = row.client_signature_placement != null;
    setClientPlacementAuto(!hasClientPlacement);
    if (hasClientPlacement && row.client_signature_placement) {
      setClientPlacement(row.client_signature_placement as Placement);
    } else {
      setClientPlacement(MANUAL_CLIENT_SIGNATURE_PLACEMENT_PRESET);
    }
    try {
      setTextOverlays(parseContractTextOverlays(row.text_overlays ?? []));
    } catch {
      setTextOverlays([]);
    }
    if (row.status !== "completed") {
      setSignedUrls(null);
    }
  }, []);

  const refreshSignedUrls = useCallback(async (id: string) => {
    const res = await fetch(`/api/cleanidex/contracts/${id}?signed_urls=1`);
    const json = await res.json();
    if (!res.ok || !json.data?.signed_urls) return;
    setSignedUrls(json.data.signed_urls as SignedUrlBundle);
  }, []);

  useEffect(() => {
    if (contractId) void refreshContract(contractId);
  }, [contractId, refreshContract]);

  useEffect(() => {
    if (!contractId || contract?.status !== "completed") return;
    void refreshSignedUrls(contractId);
  }, [contractId, contract?.status, refreshSignedUrls]);

  useEffect(() => {
    if (!contractId || !contract?.source_pdf_file_id || contract?.status === "cancelled") {
      setPreviewSignedUrls(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/cleanidex/contracts/${contractId}?signed_urls=1`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && j.ok && j.data?.signed_urls) {
          setPreviewSignedUrls(j.data.signed_urls as SignedUrlBundle);
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewSignedUrls(null);
      });
    return () => {
      cancelled = true;
    };
  }, [contractId, contract?.source_pdf_file_id, contract?.owner_signed_pdf_file_id, contract?.status]);

  const ownerPreviewPdfUrl = previewSignedUrls?.source_pdf ?? null;
  const clientPreviewPdfUrl =
    previewSignedUrls?.owner_signed_pdf ?? previewSignedUrls?.source_pdf ?? null;

  async function createContract() {
    setError(null);
    if (!clientId) {
      setError("거래처를 선택하세요.");
      return;
    }
    const res = await fetch("/api/cleanidex/contracts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ client_id: clientId, title: title.trim() || null }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "계약 생성 실패");
      return;
    }
    setContractId(json.data.id);
    setNotice("계약 초안이 생성되었습니다. PDF를 업로드하세요.");
  }

  async function uploadPdf() {
    if (!contractId || !pdfFile) {
      setError("PDF 파일을 선택하세요.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const su = await fetch("/api/cleanidex/files/signed-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file_type: "contract_pdf", extension: "pdf" }),
      });
      const suJson = await su.json();
      if (!su.ok) throw new Error(suJson.error ?? "업로드 URL 발급 실패");

      const put = await fetch(suJson.data.signed_url, {
        method: "PUT",
        headers: { "content-type": "application/pdf" },
        body: pdfFile,
      });
      if (!put.ok) throw new Error("스토리지 업로드 실패");

      const reg = await fetch("/api/cleanidex/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          file_path: suJson.data.file_path,
          file_type: "contract_pdf",
          mime_type: "application/pdf",
          size: pdfFile.size,
        }),
      });
      const regJson = await reg.json();
      if (!reg.ok) throw new Error(regJson.error ?? "파일 등록 실패");

      const patch = await fetch(`/api/cleanidex/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ source_pdf_file_id: regJson.data.id }),
      });
      const patchJson = await patch.json();
      if (!patch.ok) throw new Error(patchJson.error ?? "계약에 PDF 연결 실패");

      setNotice("원본 PDF가 연결되었습니다.");
      await refreshContract(contractId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 오류");
    } finally {
      setUploading(false);
    }
  }

  async function uploadOwnerSignature(dataUrl: string) {
    if (!contractId) return;
    setUploading(true);
    setError(null);
    try {
      const base64 = dataUrl.slice("data:image/png;base64,".length);
      const bin = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

      const su = await fetch("/api/cleanidex/files/signed-upload", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ file_type: "signature", extension: "png" }),
      });
      const suJson = await su.json();
      if (!su.ok) throw new Error(suJson.error ?? "업로드 URL 발급 실패");

      const put = await fetch(suJson.data.signed_url, {
        method: "PUT",
        headers: { "content-type": "image/png" },
        body: bin,
      });
      if (!put.ok) throw new Error("서명 이미지 업로드 실패");

      const reg = await fetch("/api/cleanidex/files", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          file_path: suJson.data.file_path,
          file_type: "signature",
          mime_type: "image/png",
          size: bin.length,
        }),
      });
      const regJson = await reg.json();
      if (!reg.ok) throw new Error(regJson.error ?? "파일 등록 실패");

      const patch = await fetch(`/api/cleanidex/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          owner_signature_file_id: regJson.data.id,
          owner_signature_placement: placement,
        }),
      });
      const patchJson = await patch.json();
      if (!patch.ok) throw new Error(patchJson.error ?? "서명 정보 저장 실패");

      setNotice("사장 서명이 저장되었습니다.");
      await refreshContract(contractId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "서명 업로드 오류");
    } finally {
      setUploading(false);
    }
  }

  async function applyOwnerSignature() {
    if (!contractId) return;
    setError(null);
    const res = await fetch(`/api/cleanidex/contracts/${contractId}/apply-owner-signature`, { method: "POST" });
    const json = await res.json();
    if (!res.ok) {
      const hint = json.detail ? `${json.error}: ${json.detail}` : (json.error ?? "사장 서명 PDF 합성 실패");
      setError(hint);
      return;
    }
    setNotice("사장 서명이 PDF에 반영되었습니다.");
    await refreshContract(contractId);
  }

  async function saveTextOverlays() {
    if (!contractId || contract?.status !== "draft") return;
    setTextSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/cleanidex/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text_overlays: textOverlays }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "텍스트 저장 실패");
      setNotice("PDF 텍스트 필드가 저장되었습니다.");
      await refreshContract(contractId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 오류");
    } finally {
      setTextSaving(false);
    }
  }

  async function saveClientPlacement() {
    if (!contractId) return;
    setPlacementSaving(true);
    setError(null);
    try {
      const body = clientPlacementAuto
        ? { client_signature_placement: null }
        : { client_signature_placement: clientPlacement };
      const res = await fetch(`/api/cleanidex/contracts/${contractId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "저장 실패");
      setNotice(clientPlacementAuto ? "거래처 서명 위치: 마지막 페이지 자동" : "거래처 서명 위치가 저장되었습니다.");
      await refreshContract(contractId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 오류");
    } finally {
      setPlacementSaving(false);
    }
  }

  async function createSignLink() {
    if (!contractId) return;
    setError(null);
    const res = await fetch("/api/cleanidex/contracts/sign-request", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ contract_id: contractId, signer_type: "client" }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "링크 생성 실패");
      return;
    }
    const path = json.data.sign_path as string;
    const abs = typeof window !== "undefined" ? `${window.location.origin}${path}` : path;
    setSignLink(abs);
    setNotice("거래처 서명 링크가 발급되었습니다.");
    await refreshContract(contractId);
  }

  const stepLabel = useMemo(() => {
    if (!contractId) return "1. 계약 생성";
    if (!contract?.source_pdf_file_id) return "2. PDF 업로드";
    if (!contract?.owner_signature_file_id) return "3. 서명란 위치(드래그) + 사장 서명";
    if (contract.status === "draft") return "4. PDF에 사장 서명 합성";
    if (contract.status === "owner_signed") return "5. 거래처 링크 발급";
    if (contract.status === "sent") return "6. 거래처 서명 대기";
    if (contract.status === "completed") return "완료";
    return contract.status;
  }, [contract, contractId]);

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-lg space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">전자계약 (사장)</h1>
          <Link href="/cleanidex" className="text-sm text-indigo-600 hover:underline">
            대시보드
          </Link>
        </div>
        <p className="text-sm text-slate-600">{stepLabel}</p>
        {error ? <p className="text-sm text-rose-700">{error}</p> : null}
        {notice ? <p className="text-sm text-emerald-800">{notice}</p> : null}

        {!contractId ? (
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <label className="block text-sm font-medium text-slate-700">거래처</label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">선택</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-slate-700">계약명 (선택)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="예: 2025 청소 용역 계약"
            />
            <button
              type="button"
              onClick={() => void createContract()}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white"
            >
              계약 초안 만들기
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-600">
              계약 ID: <span className="font-mono">{contractId}</span>
              {contract?.status ? (
                <>
                  {" "}
                  · 상태: <strong>{contract.status}</strong>
                </>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">원본 PDF</h2>
              <input type="file" accept="application/pdf" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
              <button
                type="button"
                disabled={uploading || !pdfFile || contract?.status !== "draft"}
                onClick={() => void uploadPdf()}
                className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:bg-slate-400"
              >
                {contract?.source_pdf_file_id ? "원본 PDF 다시 업로드" : "PDF 업로드"}
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
              <h2 className="text-sm font-semibold text-slate-800">PDF에 넣을 고정 텍스트</h2>
              <p className="text-xs text-slate-500">
                계약번호·주소·안내 문구 등 PDF 위에 직접 인쇄됩니다. 사장 서명 합성 시 함께 반영됩니다.
              </p>
              <ContractPdfTextOverlaysEditor
                pdfUrl={ownerPreviewPdfUrl}
                overlays={textOverlays}
                onOverlaysChange={setTextOverlays}
                disabled={
                  !contract?.source_pdf_file_id || contract.status !== "draft" || textSaving || uploading
                }
              />
              <button
                type="button"
                disabled={
                  !contractId ||
                  contract?.status !== "draft" ||
                  textSaving ||
                  !contract?.source_pdf_file_id
                }
                onClick={() => void saveTextOverlays()}
                className="rounded bg-violet-700 px-3 py-2 text-sm font-medium text-white disabled:bg-violet-300"
              >
                {textSaving ? "저장 중…" : "텍스트 필드 저장"}
              </button>
            </div>

            <OwnerSignatureBlock
              pdfUrl={ownerPreviewPdfUrl}
              disabled={!contract?.source_pdf_file_id || contract.status !== "draft" || uploading}
              placement={placement}
              onPlacementChange={setPlacement}
              onCaptured={(dataUrl) => void uploadOwnerSignature(dataUrl)}
            />

            <ClientPlacementBlock
              pdfUrl={clientPreviewPdfUrl}
              disabled={
                !contract?.source_pdf_file_id ||
                contract.status === "completed" ||
                contract.status === "cancelled" ||
                placementSaving
              }
              auto={clientPlacementAuto}
              onAutoChange={setClientPlacementAuto}
              placement={clientPlacement}
              onPlacementChange={setClientPlacement}
              onSave={() => void saveClientPlacement()}
              saving={placementSaving}
              statusNote={
                contract?.status === "sent"
                  ? "링크 발급 후에도 서명 전까지는 거래처 서명 위치만 수정할 수 있습니다."
                  : undefined
              }
            />

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">사장 서명 PDF 합성</h2>
              <button
                type="button"
                disabled={
                  contract?.status !== "draft" ||
                  !contract?.owner_signature_file_id ||
                  !contract?.source_pdf_file_id ||
                  uploading
                }
                onClick={() => void applyOwnerSignature()}
                className="rounded bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:bg-emerald-300"
              >
                PDF에 사장 서명 반영
              </button>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
              <h2 className="text-sm font-semibold text-slate-800">거래처 서명 링크</h2>
              <button
                type="button"
                disabled={contract?.status !== "owner_signed" || uploading}
                onClick={() => void createSignLink()}
                className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:bg-indigo-300"
              >
                링크 생성
              </button>
              {signLink ? (
                <div className="mt-2 break-all rounded bg-slate-50 p-2 text-xs text-slate-800">{signLink}</div>
              ) : null}
            </div>

            {contract?.status === "completed" ? (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-3 text-sm text-emerald-950">
                <h2 className="font-semibold text-emerald-900">계약 완료</h2>
                {contract.completed_at ? (
                  <p className="text-xs">완료 시각: {new Date(contract.completed_at).toLocaleString()}</p>
                ) : null}
                {contract.final_pdf_sha256 ? (
                  <p className="break-all text-xs opacity-90">SHA-256: {contract.final_pdf_sha256}</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  {signedUrls?.final_pdf ? (
                    <a
                      href={signedUrls.final_pdf}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded bg-emerald-700 px-3 py-2 text-xs font-medium text-white"
                    >
                      최종 계약서 PDF
                    </a>
                  ) : (
                    <span className="text-xs text-emerald-800">PDF 링크 불러오는 중…</span>
                  )}
                  {signedUrls?.owner_signed_pdf ? (
                    <a
                      href={signedUrls.owner_signed_pdf}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded border border-emerald-600 px-3 py-2 text-xs font-medium text-emerald-900"
                    >
                      사장 서명본 PDF
                    </a>
                  ) : null}
                  {signedUrls?.source_pdf ? (
                    <a
                      href={signedUrls.source_pdf}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex rounded border border-emerald-600 px-3 py-2 text-xs font-medium text-emerald-900"
                    >
                      원본 PDF
                    </a>
                  ) : null}
                </div>
                <p className="text-xs text-emerald-800/90">다운로드 링크는 약 10분 후 만료됩니다. 필요 시 새로고침 하세요.</p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function ClientPlacementBlock({
  pdfUrl,
  disabled,
  auto,
  onAutoChange,
  placement,
  onPlacementChange,
  onSave,
  saving,
  statusNote,
}: {
  pdfUrl: string | null;
  disabled: boolean;
  auto: boolean;
  onAutoChange: (v: boolean) => void;
  placement: Placement;
  onPlacementChange: (p: Placement) => void;
  onSave: () => void;
  saving: boolean;
  statusNote?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">거래처 서명란</h2>
      <p className="text-xs text-slate-500">
        사장 서명이 반영된 PDF가 있으면 그 위에서 표시됩니다. 없으면 원본 PDF 기준입니다. 박스를 드래그·리사이즈하여
        거래처 서명이 들어갈 칸을 지정하세요.
      </p>
      <p className="text-xs text-slate-400">
        고정 텍스트(회사명·계약일 등)를 PDF에 직접 찍는 필드는 다음 단계에서 같은 방식으로 확장할 수 있습니다.
      </p>
      {statusNote ? <p className="text-xs text-amber-800 bg-amber-50 rounded px-2 py-1">{statusNote}</p> : null}
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={auto}
          disabled={disabled}
          onChange={(e) => onAutoChange(e.target.checked)}
        />
        마지막 페이지 하단에 자동 배치 (권장)
      </label>
      {!auto ? (
        <ContractPdfPlacementEditor
          pdfUrl={pdfUrl}
          placement={placement}
          onPlacementChange={onPlacementChange}
          fieldLabel="거래처 서명"
          accentBorderClassName="border-amber-600"
          disabled={disabled}
        />
      ) : null}
      <button
        type="button"
        disabled={disabled || saving}
        onClick={onSave}
        className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:bg-amber-300"
      >
        {saving ? "저장 중…" : "거래처 서명 위치 저장"}
      </button>
    </div>
  );
}

function OwnerSignatureBlock({
  pdfUrl,
  disabled,
  placement,
  onPlacementChange,
  onCaptured,
}: {
  pdfUrl: string | null;
  disabled: boolean;
  placement: Placement;
  onPlacementChange: (p: Placement) => void;
  onCaptured: (dataUrl: string) => void;
}) {
  const sigRef = useRef<SignatureCanvas>(null);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
      <h2 className="text-sm font-semibold text-slate-800">사장 서명란</h2>
      <p className="text-xs text-slate-500">
        아래 PDF에서 점선 박스를 드래그·리사이즈해 서명이 들어갈 위치를 정한 뒤, 맨 아래 캔버스에 사장 서명을 그리고
        「서명 저장」을 누르세요.
      </p>
      <ContractPdfPlacementEditor
        pdfUrl={pdfUrl}
        placement={placement}
        onPlacementChange={onPlacementChange}
        fieldLabel="사장 서명"
        accentBorderClassName="border-slate-900"
        disabled={disabled}
      />
      <div className="rounded border border-slate-300 bg-white p-2">
        <SignatureCanvas
          ref={sigRef}
          penColor="#0f172a"
          canvasProps={{ className: "h-28 w-full rounded border border-dashed border-slate-200" }}
        />
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!sigRef.current || sigRef.current.isEmpty()) return;
          onCaptured(sigRef.current.toDataURL("image/png"));
        }}
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white disabled:bg-slate-400"
      >
        서명 저장
      </button>
    </div>
  );
}
