"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateWorkerProfileForApply } from "./actions";
import Button from "@/components/Button";
import { glassCard } from "@/lib/ui-styles";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

type Props = {
  initial: {
    nickname: string;
    birth_year: number | null;
    gender: string | null;
    bio: string | null;
    contact_phone: string | null;
  };
};

export default function MyPageForm({ initial }: Props) {
  const router = useRouter();
  const [nickname, setNickname] = useState(initial.nickname ?? "");
  const [birthYear, setBirthYear] = useState(
    initial.birth_year != null ? String(initial.birth_year) : ""
  );
  const [gender, setGender] = useState(initial.gender ?? "");
  const [bio, setBio] = useState(initial.bio ?? "");
  const [contactPhone, setContactPhone] = useState(initial.contact_phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSaved(false);
    const result = await updateWorkerProfileForApply({
      nickname,
      birth_year: birthYear ? parseInt(birthYear, 10) : null,
      gender: gender || null,
      bio: bio || null,
      contact_phone: contactPhone || null,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "저장에 실패했습니다.");
      return;
    }
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 5000);
  }

  const currentYear = new Date().getFullYear();

  return (
    <form onSubmit={handleSubmit} className={`${glassCard} p-6 space-y-5`}>
      {saved && (
        <div
          role="alert"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800"
        >
          저장이 완료되었습니다.
        </div>
      )}
      <p className="text-sm text-slate-600">
        인력 구인에 지원할 때 구인자에게 보이는 정보입니다. 나이와 성별은 필수이며, 잘못 입력한 정보로 인한 피해는 본인에게 있습니다.
      </p>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">별명</label>
        <input
          type="text"
          value={nickname}
          readOnly
          tabIndex={-1}
          aria-readonly="true"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-slate-600 cursor-not-allowed"
        />
        <p className="mt-0.5 text-xs text-slate-500">별명은 가입 시 설정한 후 변경할 수 없습니다.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">출생년도 (나이) *</label>
        <input
          type="number"
          min={1900}
          max={2100}
          value={birthYear}
          onChange={(e) => { setSaved(false); setBirthYear(e.target.value); }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
          placeholder="예: 1990"
          required
        />
        <p className="mt-0.5 text-xs text-slate-500">{currentYear}년 기준 만 나이로 활용됩니다.</p>
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
              onChange={(e) => { setSaved(false); setGender(e.target.value); }}
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
              onChange={(e) => { setSaved(false); setGender(e.target.value); }}
              className="rounded-full border-slate-300 text-emerald-600"
            />
            <span className="text-slate-700">여</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="gender"
              value="other"
              checked={gender === "other"}
              onChange={(e) => { setSaved(false); setGender(e.target.value); }}
              className="rounded-full border-slate-300 text-emerald-600"
            />
            <span className="text-slate-700">기타</span>
          </label>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">한줄 소개</label>
        <textarea
          value={bio}
          onChange={(e) => { setSaved(false); setBio(e.target.value); }}
          rows={2}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
          placeholder="구인자에게 보일 간단한 소개"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">연락처</label>
        <input
          type="tel"
          value={contactPhone}
          onChange={(e) => { setSaved(false); setContactPhone(formatPhoneInput(e.target.value)); }}
          className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-800"
          placeholder="010-0000-0000"
        />
      </div>

      <div className="rounded-lg bg-amber-50 border border-amber-200/60 p-3 text-sm text-amber-900">
        <strong>안내:</strong> 나이·성별 등 지원 시 입력한 정보가 잘못되어 발생한 불이익이나 피해는 본인이 책임지셔야 합니다. 정확히 입력해 주세요.
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "저장 중…" : "저장"}
      </Button>
    </form>
  );
}
