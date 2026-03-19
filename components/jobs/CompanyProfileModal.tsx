"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { saveCompanyProfile } from "@/app/jobs/new/actions";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function formatBusinessNumber(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

export type InitialCompany = {
  company_name: string;
  representative_name: string;
  business_number: string;
  contact_phone: string;
};

type Props = {
  initialCompany: InitialCompany;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function CompanyProfileModal({
  initialCompany,
  onSuccess,
  onCancel,
}: Props) {
  const [companyName, setCompanyName] = useState(initialCompany.company_name ?? "");
  const [representativeName, setRepresentativeName] = useState(initialCompany.representative_name ?? "");
  const [businessNumber, setBusinessNumber] = useState(initialCompany.business_number ?? "");
  const [contactPhone, setContactPhone] = useState(initialCompany.contact_phone ?? "");
  const [consentCollect, setConsentCollect] = useState(false);
  const [consentThirdParty, setConsentThirdParty] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consentCollect || !consentThirdParty) {
      setError("개인정보 수집·이용 동의와 제3자 제공 동의에 모두 체크해 주세요.");
      return;
    }
    const companyNameTrim = companyName.trim();
    const representativeNameTrim = representativeName.trim();
    const businessNumberDigits = businessNumber.replace(/\D/g, "");
    const contactPhoneTrim = contactPhone.trim().replace(/-/g, "");
    if (!companyNameTrim) {
      setError("업체명을 입력해 주세요.");
      return;
    }
    if (!representativeNameTrim) {
      setError("구인자 이름을 입력해 주세요.");
      return;
    }
    if (businessNumberDigits.length !== 10) {
      setError("사업자번호 10자리를 입력해 주세요.");
      return;
    }
    if (!contactPhoneTrim || contactPhoneTrim.length < 10) {
      setError("연락처를 입력해 주세요.");
      return;
    }
    setLoading(true);
    const result = await saveCompanyProfile({
      company_name: companyNameTrim,
      representative_name: representativeNameTrim,
      business_number: businessNumberDigits,
      contact_phone: contactPhoneTrim,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "저장에 실패했습니다.");
      return;
    }
    onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" aria-hidden onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-modal-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 id="company-modal-title" className="text-lg font-semibold text-slate-900">
            업체 정보 입력
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            구인글을 올리려면 업체 정보가 필요합니다. 한 번 입력하면 저장되며, 다음 구인글부터 자동으로 사용됩니다.
          </p>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">업체명 *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
              placeholder="(주)회사명 또는 상호"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">구인자 이름 *</label>
            <input
              type="text"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
              placeholder="담당자 성함"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">사업자번호 *</label>
            <input
              type="text"
              inputMode="numeric"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(formatBusinessNumber(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
              placeholder="000-00-00000"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">연락처 *</label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(formatPhoneInput(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
              placeholder="010-0000-0000"
              required
            />
          </div>

          <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            <p className="font-medium">안내</p>
            <p className="mt-1 text-amber-800">
              입력하신 정보가 잘못되어 발생한 모든 불이익은 사용자 본인이 책임지며, 위 정보는 구직 지원자에게 제공될 수 있습니다.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentCollect}
                onChange={(e) => setConsentCollect(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-emerald-600"
              />
              <span className="text-sm text-slate-700">
                <strong>개인정보 수집·이용 동의</strong> (필수): 구인 활동 및 구직자 연락을 위해 위 정보를 수집·이용하는 것에 동의합니다.
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={consentThirdParty}
                onChange={(e) => setConsentThirdParty(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-emerald-600"
              />
              <span className="text-sm text-slate-700">
                <strong>제3자 제공 동의</strong> (필수): 구인글 지원 시 위 정보가 해당 구직자에게 제공되는 것에 동의합니다.
              </span>
            </label>
          </div>

          {error && (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  처리 중…
                </>
              ) : (
                "동의하고 저장"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
