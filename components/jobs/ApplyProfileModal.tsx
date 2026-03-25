"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { applyWithProfile } from "@/app/jobs/[id]/actions";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

type InitialWorker = {
  nickname: string;
  birth_date: string | null;
  gender: string | null;
  contact_phone: string | null;
};

type Props = {
  initialWorker: InitialWorker;
  positionId: string;
  jobPostId: string;
  shareRef?: boolean;
  shareChannel?: string;
  onSuccess: () => void;
  onCancel: () => void;
};

export default function ApplyProfileModal({
  initialWorker,
  positionId,
  jobPostId,
  shareRef = false,
  shareChannel = "unknown",
  onSuccess,
  onCancel,
}: Props) {
  const [nickname, setNickname] = useState(initialWorker.nickname ?? "");
  const [birthDate, setBirthDate] = useState(initialWorker.birth_date ?? "");
  const [gender, setGender] = useState<string>(initialWorker.gender ?? "");
  const [contactPhone, setContactPhone] = useState(initialWorker.contact_phone ?? "");
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
    if (!(nickname.trim() && birthDate.trim() && (gender === "M" || gender === "F") && contactPhone.trim())) {
      setError("이름, 생년월일, 성별, 휴대폰 번호를 모두 입력해 주세요.");
      return;
    }
    setLoading(true);
    const result = await applyWithProfile(positionId, jobPostId, {
      nickname: nickname.trim(),
      birth_date: birthDate.trim(),
      gender: gender as "M" | "F",
      contact_phone: contactPhone.trim().replace(/-/g, ""),
    }, { shareRef, shareChannel });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "지원에 실패했습니다.");
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
        aria-labelledby="apply-modal-title"
        className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-xl"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 id="apply-modal-title" className="text-lg font-semibold text-slate-900">
            지원 정보 입력
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
            지원 시 구인자에게 보여질 정보입니다. 한 번 입력하면 마이페이지에 저장되며, 다음 지원부터는 자동으로 사용됩니다.
          </p>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">이름 *</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
              placeholder="구인자에게 보일 이름"
              required
            />
            {!(initialWorker.nickname ?? "").trim() && (
              <p className="mt-1 text-xs text-slate-500">
                카카오 로그인 시 이름란이 비어 있을 수 있습니다. 여기서 입력하면 마이페이지에 저장됩니다.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">생년월일 *</label>
            <input
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">성별 *</label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="M"
                  checked={gender === "M"}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-full border-slate-300 text-emerald-600"
                />
                <span className="text-slate-700">남</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="gender"
                  value="F"
                  checked={gender === "F"}
                  onChange={(e) => setGender(e.target.value)}
                  className="rounded-full border-slate-300 text-emerald-600"
                />
                <span className="text-slate-700">여</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">휴대폰 번호 *</label>
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
              입력하신 정보가 잘못되어 발생한 모든 불이익은 사용자 본인이 책임지며, 위 정보는 구인자에게 제공됩니다.
            </p>
          </div>

          <div className="space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentCollect}
                onChange={(e) => setConsentCollect(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-emerald-600"
              />
              <span className="text-sm text-slate-700">
                <strong>개인정보 수집·이용 동의</strong> (필수): 지원 및 구인자 연락을 위해 위 정보를 수집·이용하는 것에 동의합니다.
              </span>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consentThirdParty}
                onChange={(e) => setConsentThirdParty(e.target.checked)}
                className="mt-1 rounded border-slate-300 text-emerald-600"
              />
              <span className="text-sm text-slate-700">
                <strong>제3자 제공 동의</strong> (필수): 지원 시 위 정보가 해당 구인자에게 제공되는 것에 동의합니다.
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
              className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-3 text-sm font-semibold text-white hover:from-blue-600 hover:to-blue-700 disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  처리 중…
                </>
              ) : (
                "동의하고 지원하기"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
