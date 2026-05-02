"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { CLIENT_ESIGN_CONSENT_VERSION } from "@/lib/cleanidex/consent";

type SignView = {
  request_id: string;
  contract_id: string;
  signer_type: "client" | "company";
  token_expires_at: string;
  source_pdf_signed_url: string | null;
  contract_title: string | null;
  consent_text: string;
  consent_version: string;
  completed_at: string | null;
};

type DonePayload = {
  signed_at: string;
  completed_at: string;
  final_pdf_signed_url: string | null;
};

export default function CleanidexContractSignPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [data, setData] = useState<SignView | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerPhone, setSignerPhone] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneData, setDoneData] = useState<DonePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const sigRef = useRef<SignatureCanvas | null>(null);

  useEffect(() => {
    if (!token) {
      setError("유효하지 않은 링크입니다.");
      return;
    }
    fetch(`/api/cleanidex/contracts/sign/verify?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) {
          setError(json.error ?? "서명 요청을 불러오지 못했습니다.");
          return;
        }
        setData(json.data);
      })
      .catch(() => setError("네트워크 오류가 발생했습니다."));
  }, [token]);

  async function onSign() {
    if (!token || !signerName.trim() || !signerPhone.trim() || !consent || submitting) return;
    if (!sigRef.current || sigRef.current.isEmpty()) {
      setError("서명란에 서명을 입력해주세요.");
      return;
    }
    setSubmitting(true);
    setError(null);
    const signatureDataUrl = sigRef.current.toDataURL("image/png");
    const res = await fetch(`/api/cleanidex/contracts/sign/verify?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        signer_name: signerName.trim(),
        signer_phone: signerPhone.trim(),
        signature_data_url: signatureDataUrl,
        consent: true,
        consent_text_version: CLIENT_ESIGN_CONSENT_VERSION,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "서명 처리에 실패했습니다.");
      setSubmitting(false);
      return;
    }
    setDoneData(json.data as DonePayload);
    setDone(true);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-xl p-4 py-10">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h1 className="text-xl font-bold text-slate-900">계약 전자서명</h1>
          <p className="mt-1 text-sm text-slate-600">계약 내용을 확인한 후 정보 입력과 서명으로 완료합니다.</p>

          {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}

          {done && doneData ? (
            <div className="mt-4 space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">
              <p className="font-semibold">전자서명이 완료되었습니다.</p>
              <p>완료 시각: {new Date(doneData.completed_at).toLocaleString()}</p>
              {doneData.final_pdf_signed_url ? (
                <a
                  href={doneData.final_pdf_signed_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white"
                >
                  최종 계약서 PDF 열기
                </a>
              ) : null}
            </div>
          ) : null}

          {!done && data ? (
            <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
              {data.contract_title ? <p>계약명: {data.contract_title}</p> : null}
              <p>만료: {new Date(data.token_expires_at).toLocaleString()}</p>
            </div>
          ) : null}

          {!done && data?.source_pdf_signed_url ? (
            <a
              href={data.source_pdf_signed_url}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white"
            >
              계약서 보기 (PDF)
            </a>
          ) : null}

          {!done ? (
            <div className="mt-4 space-y-3">
              <input
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                placeholder="이름 (실명)"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                value={signerPhone}
                onChange={(e) => setSignerPhone(e.target.value)}
                placeholder="연락처 (휴대폰)"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              />
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 whitespace-pre-line">
                {data?.consent_text ?? ""}
              </div>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                위 내용에 동의합니다.
              </label>
              <div className="rounded border border-slate-300 bg-white p-2">
                <SignatureCanvas
                  ref={(ref) => {
                    sigRef.current = ref;
                  }}
                  penColor="#0f172a"
                  backgroundColor="#ffffff"
                  canvasProps={{ className: "h-32 w-full rounded" }}
                />
                <button
                  type="button"
                  onClick={() => sigRef.current?.clear()}
                  className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                >
                  서명 지우기
                </button>
              </div>
            </div>
          ) : null}

          {!done ? (
            <button
              type="button"
              onClick={() => void onSign()}
              disabled={!data || submitting || !consent || !signerName.trim() || !signerPhone.trim()}
              className="mt-4 w-full rounded bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
            >
              {submitting ? "처리 중..." : "계약 내용에 동의하고 전자서명 완료"}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
