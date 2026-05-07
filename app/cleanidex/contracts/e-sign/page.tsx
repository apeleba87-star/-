"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import type { ContractTextOverlay } from "@/lib/cleanidex/contract-text-overlay";
import { parseContractTextOverlays } from "@/lib/cleanidex/contract-text-overlay";
import { MANUAL_CLIENT_SIGNATURE_PLACEMENT_PRESET } from "@/lib/cleanidex/contract-pdf";
import { contractStatusLabelKo } from "@/lib/cleanidex/contract-display";

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
  client_name?: string | null;
  site_name?: string | null;
  created_at?: string | null;
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

type CardId = "pdf" | "owner" | "client" | "text" | "link";

const defaultPlacement: Placement = { pageIndex: 0, x: 0.55, y: 0.82, width: 0.38, height: 0.12 };

export default function CleanidexContractESignSetupPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [clientId, setClientId] = useState("");
  const [title, setTitle] = useState("");
  const [contractId, setContractId] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractRow | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [placement, setPlacement] = useState<Placement>(defaultPlacement);
  const [signLink, setSignLink] = useState("");
  const [linkCopied, setLinkCopied] = useState(false);
  const [clientPlacement, setClientPlacement] = useState<Placement>(MANUAL_CLIENT_SIGNATURE_PLACEMENT_PRESET);
  const [clientPlacementAuto, setClientPlacementAuto] = useState(true);
  const [placementSaving, setPlacementSaving] = useState(false);
  const [signedUrls, setSignedUrls] = useState<SignedUrlBundle | null>(null);
  const [previewSignedUrls, setPreviewSignedUrls] = useState<SignedUrlBundle | null>(null);
  const [textOverlays, setTextOverlays] = useState<ContractTextOverlay[]>([]);
  const [textSaving, setTextSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [openId, setOpenId] = useState<CardId | null>(null);

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

  /** 현재 진행해야 하는 카드. 사용자가 다른 카드를 임의로 열면 그쪽이 우선. */
  const currentCard: CardId | null = useMemo(() => {
    if (!contract) return null;
    if (!contract.source_pdf_file_id) return "pdf";
    if (
      !contract.owner_signature_file_id ||
      (contract.status === "draft" && !contract.owner_signed_pdf_file_id)
    ) {
      return "owner";
    }
    if (contract.status === "owner_signed") return "link";
    return null;
  }, [contract]);

  // 단계가 바뀌면 그 카드를 자동으로 펼쳐 둠. 이미 다른 카드를 펼친 상태면 건드리지 않음.
  useEffect(() => {
    if (!currentCard) return;
    setOpenId((prev) => prev ?? currentCard);
  }, [currentCard]);

  function toggleCard(id: CardId) {
    setOpenId((prev) => (prev === id ? null : id));
  }

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
    setOpenId("pdf");
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
      setOpenId("owner");
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 오류");
    } finally {
      setUploading(false);
    }
  }

  /** 서명 이미지+위치 저장 후 곧바로 PDF 합성까지 한 번에 진행. */
  async function saveAndApplyOwnerSignature(dataUrl: string) {
    if (!contractId) return;
    setBusy(true);
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

      const apply = await fetch(`/api/cleanidex/contracts/${contractId}/apply-owner-signature`, {
        method: "POST",
      });
      const applyJson = await apply.json();
      if (!apply.ok) {
        const hint = applyJson.detail ? `${applyJson.error}: ${applyJson.detail}` : applyJson.error ?? "사장 서명 PDF 합성 실패";
        throw new Error(hint);
      }

      setNotice("사장 서명이 PDF에 반영되었습니다.");
      await refreshContract(contractId);
      setOpenId("link");
    } catch (e) {
      setError(e instanceof Error ? e.message : "사장 서명 처리 오류");
    } finally {
      setBusy(false);
    }
  }

  /** 서명 이미지는 이미 저장됐고 PDF 합성만 다시 하는 케이스. */
  async function applyOwnerSignatureOnly() {
    if (!contractId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/cleanidex/contracts/${contractId}/apply-owner-signature`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        const hint = json.detail ? `${json.error}: ${json.detail}` : json.error ?? "사장 서명 PDF 합성 실패";
        throw new Error(hint);
      }
      setNotice("사장 서명이 PDF에 반영되었습니다.");
      await refreshContract(contractId);
      setOpenId("link");
    } catch (e) {
      setError(e instanceof Error ? e.message : "PDF 합성 오류");
    } finally {
      setBusy(false);
    }
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
    setLinkCopied(false);
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
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(abs);
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      } catch {
        /* ignore: clipboard 권한 없음 */
      }
    }
    await refreshContract(contractId);
  }

  async function copySignLink() {
    if (!signLink || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(signLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2500);
    } catch {
      /* ignore */
    }
  }

  // === 빈 상태: 계약 만들기 ===
  if (!contractId) {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="mx-auto max-w-lg space-y-4">
          <PageHeader />
          {error ? <Alert tone="rose">{error}</Alert> : null}
          {notice ? <Alert tone="emerald">{notice}</Alert> : null}

          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-semibold text-slate-800">새 전자계약</h2>
            <p className="text-xs text-slate-500">거래처와 계약명을 정해 초안을 만든 뒤, 다음 단계에서 PDF·사장 서명·링크 발급까지 한 화면에서 진행합니다.</p>
            <label className="block text-xs font-medium text-slate-600">거래처</label>
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
            <label className="block text-xs font-medium text-slate-600">계약명 (선택)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="예: 2025 청소 용역 계약"
            />
            <button
              type="button"
              onClick={() => void createContract()}
              className="w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
            >
              계약 초안 만들기
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === 계약 진행 화면 ===
  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto max-w-2xl space-y-4">
        <PageHeader />

        <ContractSummaryStrip
          title={contract?.title ?? null}
          clientName={contract?.client_name ?? null}
          siteName={contract?.site_name ?? null}
          status={contract?.status ?? "draft"}
          contractId={contractId}
        />

        {error ? <Alert tone="rose">{error}</Alert> : null}
        {notice ? <Alert tone="emerald">{notice}</Alert> : null}

        <Section
          id="pdf"
          title="원본 PDF"
          status={
            contract?.source_pdf_file_id ? (
              <Badge tone="ok">연결됨</Badge>
            ) : (
              <Badge tone="todo">필요</Badge>
            )
          }
          openId={openId}
          onToggle={toggleCard}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm"
          />
          <button
            type="button"
            disabled={uploading || !pdfFile || contract?.status !== "draft"}
            onClick={() => void uploadPdf()}
            className="rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:bg-slate-400"
          >
            {uploading ? "업로드 중…" : contract?.source_pdf_file_id ? "원본 PDF 다시 업로드" : "PDF 업로드"}
          </button>
          {contract?.source_pdf_file_id && contract.status !== "draft" ? (
            <p className="text-xs text-slate-500">초안 상태에서만 PDF를 다시 올릴 수 있습니다.</p>
          ) : null}
        </Section>

        <Section
          id="owner"
          title="사장 서명"
          status={
            contract?.owner_signed_pdf_file_id ? (
              <Badge tone="ok">PDF 반영 완료</Badge>
            ) : contract?.owner_signature_file_id ? (
              <Badge tone="todo">PDF 반영 필요</Badge>
            ) : (
              <Badge tone="todo">서명 필요</Badge>
            )
          }
          openId={openId}
          onToggle={toggleCard}
          locked={!contract?.source_pdf_file_id}
          lockedNote="먼저 원본 PDF를 업로드하세요."
        >
          <p className="text-xs text-slate-500">
            점선 박스를 드래그·리사이즈해 서명이 들어갈 위치를 정한 뒤, 캔버스에 사장 서명을 그리고 한 번에 저장하세요.
          </p>
          <ContractPdfPlacementEditor
            pdfUrl={ownerPreviewPdfUrl}
            placement={placement}
            onPlacementChange={setPlacement}
            fieldLabel="사장 서명"
            accentBorderClassName="border-slate-900"
            disabled={contract?.status !== "draft" || busy}
          />
          <OwnerSignatureCanvas
            disabled={contract?.status !== "draft" || busy}
            onCaptured={(dataUrl) => void saveAndApplyOwnerSignature(dataUrl)}
            existingMessage={
              contract?.owner_signature_file_id && !contract?.owner_signed_pdf_file_id
                ? "이전에 저장한 서명이 있습니다. 다시 그리지 않고 PDF에만 반영할 수 있습니다."
                : null
            }
            secondaryAction={
              contract?.owner_signature_file_id && !contract?.owner_signed_pdf_file_id ? (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void applyOwnerSignatureOnly()}
                  className="rounded border border-slate-400 px-3 py-2 text-sm text-slate-700 disabled:opacity-50"
                >
                  {busy ? "처리 중…" : "이전 서명으로 PDF 반영"}
                </button>
              ) : null
            }
          />
        </Section>

        <Section
          id="link"
          title="거래처 서명 링크"
          status={
            contract?.status === "completed" ? (
              <Badge tone="ok">계약 완료</Badge>
            ) : contract?.status === "sent" ? (
              <Badge tone="wait">거래처 서명 대기</Badge>
            ) : contract?.status === "owner_signed" ? (
              <Badge tone="todo">발급 가능</Badge>
            ) : (
              <Badge tone="muted">사장 서명 후 가능</Badge>
            )
          }
          openId={openId}
          onToggle={toggleCard}
          locked={contract?.status !== "owner_signed" && contract?.status !== "sent" && contract?.status !== "completed"}
          lockedNote="사장 서명을 PDF에 반영해야 링크를 만들 수 있습니다."
        >
          {contract?.status === "owner_signed" || (contract?.status === "sent" && !signLink) ? (
            <button
              type="button"
              disabled={busy || contract?.status !== "owner_signed"}
              onClick={() => void createSignLink()}
              className="w-full rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:bg-indigo-300"
            >
              {contract?.status === "sent" ? "이미 링크가 발급되었습니다 (재발급은 곧 지원)" : "링크 만들기 + 복사"}
            </button>
          ) : null}

          {signLink ? (
            <div className="space-y-2">
              <div className="break-all rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-800">
                {signLink}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void copySignLink()}
                  className="rounded bg-slate-900 px-3 py-2 text-xs text-white"
                >
                  {linkCopied ? "복사됨" : "다시 복사"}
                </button>
                <a
                  href={signLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-700"
                >
                  새 창에서 열기
                </a>
              </div>
              <p className="text-xs text-slate-500">
                이 링크를 거래처에게 전달하세요. 거래처가 서명을 끝내면 이 화면이 자동으로 “계약 완료”로 바뀝니다.
              </p>
            </div>
          ) : null}

          {contract?.status === "completed" ? (
            <CompletedBlock contract={contract} signedUrls={signedUrls} />
          ) : null}
        </Section>

        <Section
          id="client"
          title="고급: 거래처 서명란 위치"
          status={
            contract?.client_signature_placement ? (
              <Badge tone="muted">수동 지정</Badge>
            ) : (
              <Badge tone="muted">자동 (마지막 페이지)</Badge>
            )
          }
          openId={openId}
          onToggle={toggleCard}
          locked={!contract?.source_pdf_file_id || contract?.status === "completed" || contract?.status === "cancelled"}
          lockedNote={contract?.status === "completed" || contract?.status === "cancelled" ? "완료/취소된 계약은 수정할 수 없습니다." : "먼저 원본 PDF를 업로드하세요."}
        >
          <p className="text-xs text-slate-500">
            기본은 사장 서명이 반영된 PDF의 마지막 페이지 하단에 자동 배치됩니다. 직접 위치를 정하고 싶을 때만 사용하세요.
          </p>
          {contract?.status === "sent" ? (
            <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-800">링크 발급 후에도 서명 전까지는 거래처 서명 위치만 수정할 수 있습니다.</p>
          ) : null}
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={clientPlacementAuto}
              disabled={placementSaving || contract?.status === "completed" || contract?.status === "cancelled"}
              onChange={(e) => setClientPlacementAuto(e.target.checked)}
            />
            마지막 페이지 하단에 자동 배치 (권장)
          </label>
          {!clientPlacementAuto ? (
            <ContractPdfPlacementEditor
              pdfUrl={clientPreviewPdfUrl}
              placement={clientPlacement}
              onPlacementChange={setClientPlacement}
              fieldLabel="거래처 서명"
              accentBorderClassName="border-amber-600"
              disabled={placementSaving || contract?.status === "completed" || contract?.status === "cancelled"}
            />
          ) : null}
          <button
            type="button"
            disabled={placementSaving || contract?.status === "completed" || contract?.status === "cancelled"}
            onClick={() => void saveClientPlacement()}
            className="rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white disabled:bg-amber-300"
          >
            {placementSaving ? "저장 중…" : "거래처 서명 위치 저장"}
          </button>
        </Section>

        <Section
          id="text"
          title="고급: PDF 위 고정 텍스트"
          status={
            textOverlays.length > 0 ? (
              <Badge tone="muted">{textOverlays.length}개</Badge>
            ) : (
              <Badge tone="muted">없음</Badge>
            )
          }
          openId={openId}
          onToggle={toggleCard}
          locked={!contract?.source_pdf_file_id || contract?.status !== "draft"}
          lockedNote={
            contract?.status !== "draft"
              ? "초안 상태에서만 텍스트를 편집할 수 있습니다."
              : "먼저 원본 PDF를 업로드하세요."
          }
        >
          <p className="text-xs text-slate-500">계약번호·주소·안내 문구 등을 PDF 위에 직접 인쇄합니다. 사장 서명 합성 시 함께 반영됩니다.</p>
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
            disabled={!contractId || contract?.status !== "draft" || textSaving || !contract?.source_pdf_file_id}
            onClick={() => void saveTextOverlays()}
            className="rounded bg-violet-700 px-3 py-2 text-sm font-medium text-white disabled:bg-violet-300"
          >
            {textSaving ? "저장 중…" : "텍스트 필드 저장"}
          </button>
        </Section>
      </div>
    </div>
  );
}

function PageHeader() {
  return (
    <div className="flex items-center justify-between">
      <h1 className="text-xl font-bold text-slate-900">전자계약 (사장)</h1>
      <Link href="/cleanidex" className="text-sm text-indigo-600 hover:underline">
        대시보드
      </Link>
    </div>
  );
}

function Alert({ tone, children }: { tone: "rose" | "emerald"; children: React.ReactNode }) {
  const cls = tone === "rose" ? "border-rose-200 bg-rose-50 text-rose-800" : "border-emerald-200 bg-emerald-50 text-emerald-800";
  return <p className={`rounded-lg border px-3 py-2 text-sm ${cls}`}>{children}</p>;
}

function ContractSummaryStrip({
  title,
  clientName,
  siteName,
  status,
  contractId,
}: {
  title: string | null;
  clientName: string | null;
  siteName: string | null;
  status: string;
  contractId: string | null;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className="text-sm font-semibold text-slate-900">
          {title?.trim() ? title.trim() : <span className="text-slate-500">(제목 없음)</span>}
        </p>
        {clientName?.trim() ? (
          <p className="text-xs text-slate-600">
            · {clientName.trim()}
            {siteName?.trim() ? ` · ${siteName.trim()}` : ""}
          </p>
        ) : null}
        <Badge tone={status === "completed" ? "ok" : status === "owner_signed" || status === "sent" ? "todo" : "muted"}>
          {contractStatusLabelKo(status)}
        </Badge>
      </div>
      {contractId ? (
        <p className="mt-1 text-[11px] text-slate-400">ID {contractId.slice(0, 8)}…</p>
      ) : null}
    </div>
  );
}

function Badge({ tone, children }: { tone: "ok" | "todo" | "wait" | "muted"; children: React.ReactNode }) {
  const cls =
    tone === "ok"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "todo"
      ? "bg-amber-100 text-amber-800"
      : tone === "wait"
      ? "bg-sky-100 text-sky-800"
      : "bg-slate-100 text-slate-600";
  return <span className={`ml-auto rounded-full px-2 py-0.5 text-[11px] font-medium ${cls}`}>{children}</span>;
}

function Section({
  id,
  title,
  status,
  openId,
  onToggle,
  locked,
  lockedNote,
  children,
}: {
  id: CardId;
  title: string;
  status?: React.ReactNode;
  openId: CardId | null;
  onToggle: (id: CardId) => void;
  locked?: boolean;
  lockedNote?: string;
  children: React.ReactNode;
}) {
  const open = openId === id;
  return (
    <div className={`overflow-hidden rounded-xl border bg-white ${locked ? "border-slate-200 opacity-70" : "border-slate-200"}`}>
      <button
        type="button"
        onClick={() => !locked && onToggle(id)}
        disabled={locked}
        className="flex w-full items-center gap-2 px-4 py-3 text-left disabled:cursor-not-allowed"
      >
        <span className="text-sm font-semibold text-slate-800">{title}</span>
        {status}
        <span className="ml-1 text-xs text-slate-400">{open ? "▲" : "▼"}</span>
      </button>
      {open ? (
        <div className="space-y-3 border-t border-slate-100 px-4 py-4">
          {locked && lockedNote ? <p className="text-xs text-slate-500">{lockedNote}</p> : children}
        </div>
      ) : null}
    </div>
  );
}

function CompletedBlock({
  contract,
  signedUrls,
}: {
  contract: ContractRow;
  signedUrls: SignedUrlBundle | null;
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
      <h3 className="font-semibold text-emerald-900">계약 완료</h3>
      {contract.completed_at ? (
        <p className="mt-1 text-xs">완료 시각: {new Date(contract.completed_at).toLocaleString()}</p>
      ) : null}
      {contract.final_pdf_sha256 ? (
        <p className="mt-1 break-all text-xs opacity-90">SHA-256: {contract.final_pdf_sha256}</p>
      ) : null}
      <div className="mt-2 flex flex-wrap gap-2">
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
      <p className="mt-2 text-xs text-emerald-800/90">다운로드 링크는 약 10분 후 만료됩니다. 필요 시 새로고침 하세요.</p>
    </div>
  );
}

function OwnerSignatureCanvas({
  disabled,
  onCaptured,
  existingMessage,
  secondaryAction,
}: {
  disabled: boolean;
  onCaptured: (dataUrl: string) => void;
  existingMessage: string | null;
  secondaryAction: React.ReactNode;
}) {
  const sigRef = useRef<SignatureCanvas>(null);
  return (
    <div className="space-y-2">
      {existingMessage ? <p className="rounded bg-slate-50 px-2 py-1 text-xs text-slate-600">{existingMessage}</p> : null}
      <div className="rounded border border-slate-300 bg-white p-2">
        <SignatureCanvas
          ref={sigRef}
          penColor="#0f172a"
          canvasProps={{ className: "h-32 w-full rounded border border-dashed border-slate-200" }}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => sigRef.current?.clear()}
          className="rounded border border-slate-300 px-3 py-2 text-xs text-slate-700"
        >
          다시 그리기
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!sigRef.current || sigRef.current.isEmpty()) return;
            onCaptured(sigRef.current.toDataURL("image/png"));
          }}
          className="rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-emerald-300"
        >
          서명 저장 + PDF에 반영
        </button>
        {secondaryAction}
      </div>
    </div>
  );
}
