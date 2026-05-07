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

/** 입력값에서 숫자만 추려 최대 max자리까지 자릅니다. */
function digitsOnly(input: string, max: number): string {
  return input.replace(/\D/g, "").slice(0, max);
}

/** 분리된 세 부분이 한국식 전화번호 형식을 만족하는지 검증합니다. */
function isPhonePartsValid(p1: string, p2: string, p3: string): boolean {
  return /^\d{2,3}$/.test(p1) && /^\d{3,4}$/.test(p2) && /^\d{4}$/.test(p3);
}

export default function CleanidexContractSignPage() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [data, setData] = useState<SignView | null>(null);
  const [signerName, setSignerName] = useState("");
  const [phonePart1, setPhonePart1] = useState("010");
  const [phonePart2, setPhonePart2] = useState("");
  const [phonePart3, setPhonePart3] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneData, setDoneData] = useState<DonePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const sigRef = useRef<SignatureCanvas | null>(null);
  const phone2Ref = useRef<HTMLInputElement | null>(null);
  const phone3Ref = useRef<HTMLInputElement | null>(null);

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

  const trimmedName = signerName.trim();
  const phoneValid = isPhonePartsValid(phonePart1, phonePart2, phonePart3);
  const phoneCombined = `${phonePart1}-${phonePart2}-${phonePart3}`;
  const phoneTouched = phonePart2.length > 0 || phonePart3.length > 0;
  const canSubmit =
    !!data && !submitting && consent && trimmedName.length > 0 && phoneValid && hasSignature;

  async function onSign() {
    if (!token || submitting) return;
    if (!trimmedName) {
      setError("이름을 입력해주세요.");
      return;
    }
    if (!phoneValid) {
      setError("연락처를 010-1234-5678 형식으로 입력해주세요.");
      return;
    }
    if (!consent) {
      setError("위 내용에 동의해주세요.");
      return;
    }
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
        signer_name: trimmedName,
        signer_phone: phoneCombined,
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
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  이름 <span className="text-rose-600">*</span>
                </label>
                <input
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  placeholder="실명"
                  required
                  aria-required="true"
                  className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  연락처 <span className="text-rose-600">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    value={phonePart1}
                    onChange={(e) => {
                      const v = digitsOnly(e.target.value, 3);
                      setPhonePart1(v);
                      if (v.length === 3) phone2Ref.current?.focus();
                    }}
                    placeholder="010"
                    inputMode="numeric"
                    autoComplete="tel-area-code"
                    maxLength={3}
                    required
                    aria-required="true"
                    className="w-16 rounded border border-slate-300 px-3 py-2 text-center text-sm tabular-nums"
                  />
                  <span aria-hidden="true" className="text-slate-400">-</span>
                  <input
                    ref={phone2Ref}
                    value={phonePart2}
                    onChange={(e) => {
                      const v = digitsOnly(e.target.value, 4);
                      setPhonePart2(v);
                      if (v.length === 4) phone3Ref.current?.focus();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && phonePart2.length === 0) {
                        e.preventDefault();
                        (e.currentTarget.previousElementSibling?.previousElementSibling as HTMLInputElement | null)?.focus();
                      }
                    }}
                    placeholder="1234"
                    inputMode="numeric"
                    autoComplete="tel-local-prefix"
                    maxLength={4}
                    required
                    aria-required="true"
                    className="w-20 rounded border border-slate-300 px-3 py-2 text-center text-sm tabular-nums"
                  />
                  <span aria-hidden="true" className="text-slate-400">-</span>
                  <input
                    ref={phone3Ref}
                    value={phonePart3}
                    onChange={(e) => setPhonePart3(digitsOnly(e.target.value, 4))}
                    onKeyDown={(e) => {
                      if (e.key === "Backspace" && phonePart3.length === 0) {
                        e.preventDefault();
                        phone2Ref.current?.focus();
                      }
                    }}
                    placeholder="5678"
                    inputMode="numeric"
                    autoComplete="tel-local-suffix"
                    maxLength={4}
                    required
                    aria-required="true"
                    aria-invalid={phoneTouched && !phoneValid}
                    className="w-20 rounded border border-slate-300 px-3 py-2 text-center text-sm tabular-nums"
                  />
                </div>
                {phoneTouched && !phoneValid ? (
                  <p className="mt-1 text-xs text-rose-600">
                    010-1234-5678 형식으로 입력해주세요.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-slate-500">
                    숫자만 입력하면 자동으로 다음 칸으로 이동합니다.
                  </p>
                )}
              </div>
              <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs leading-relaxed text-slate-800 whitespace-pre-line">
                {data?.consent_text ?? ""}
              </div>
              <label className="flex items-start gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
                위 내용에 동의합니다.
              </label>
              <div>
                <div
                  className={`rounded border bg-white p-2 ${
                    hasSignature ? "border-slate-300" : "border-dashed border-slate-300"
                  }`}
                >
                  <SignatureCanvas
                    ref={(ref) => {
                      sigRef.current = ref;
                    }}
                    penColor="#0f172a"
                    backgroundColor="#ffffff"
                    onEnd={() => setHasSignature(!sigRef.current?.isEmpty())}
                    canvasProps={{ className: "h-32 w-full rounded" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      sigRef.current?.clear();
                      setHasSignature(false);
                    }}
                    className="mt-2 rounded bg-slate-100 px-2 py-1 text-xs text-slate-700"
                  >
                    서명 지우기
                  </button>
                </div>
                {!hasSignature ? (
                  <p className="mt-1 text-xs text-slate-500">
                    위 박스에 직접 서명을 그려주세요.
                  </p>
                ) : null}
              </div>
            </div>
          ) : null}

          {!done ? (
            <button
              type="button"
              onClick={() => void onSign()}
              disabled={!canSubmit}
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
