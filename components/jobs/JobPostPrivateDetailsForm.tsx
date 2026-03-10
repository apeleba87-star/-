"use client";

import { useState } from "react";
import { saveJobPostPrivateDetails } from "@/app/jobs/[id]/save-private-details";
import { glassCard } from "@/lib/ui-styles";

type Props = {
  jobPostId: string;
  initial: {
    full_address: string | null;
    contact_phone: string | null;
    access_instructions: string | null;
    parking_info: string | null;
    notes: string | null;
  };
};

const inputClass =
  "mt-1.5 w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20";

export default function JobPostPrivateDetailsForm({ jobPostId, initial }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fullAddress, setFullAddress] = useState(initial.full_address ?? "");
  const [contactPhone, setContactPhone] = useState(initial.contact_phone ?? "");
  const [accessInstructions, setAccessInstructions] = useState(initial.access_instructions ?? "");
  const [parkingInfo, setParkingInfo] = useState(initial.parking_info ?? "");
  const [notes, setNotes] = useState(initial.notes ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await saveJobPostPrivateDetails({
      job_post_id: jobPostId,
      full_address: fullAddress || null,
      contact_phone: contactPhone || null,
      access_instructions: accessInstructions || null,
      parking_info: parkingInfo || null,
      notes: notes || null,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "저장 실패");
      return;
    }
    window.location.reload();
  }

  return (
    <section className={`${glassCard} p-5`}>
      <h2 className="text-base font-semibold text-slate-800">현장 상세 정보</h2>
      <p className="mt-0.5 text-xs text-slate-500">지원자를 확정한 후 해당 지원자에게만 공개됩니다.</p>
      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="private-full-address" className="block text-sm font-medium text-slate-700">
            상세 주소
          </label>
          <input
            id="private-full-address"
            type="text"
            value={fullAddress}
            onChange={(e) => setFullAddress(e.target.value)}
            className={inputClass}
            placeholder="예: 서울 성북구 길음로15길 55"
          />
        </div>
        <div>
          <label htmlFor="private-contact-phone" className="block text-sm font-medium text-slate-700">
            담당자 연락처
          </label>
          <input
            id="private-contact-phone"
            type="tel"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            className={inputClass}
            placeholder="010-0000-0000"
          />
        </div>
        <div>
          <label htmlFor="private-access" className="block text-sm font-medium text-slate-700">
            출입 방법
          </label>
          <textarea
            id="private-access"
            value={accessInstructions}
            onChange={(e) => setAccessInstructions(e.target.value)}
            rows={2}
            className={inputClass}
            placeholder="예: 정문 경비실에서 출입증 수령"
          />
        </div>
        <div>
          <label htmlFor="private-parking" className="block text-sm font-medium text-slate-700">
            주차 안내
          </label>
          <input
            id="private-parking"
            type="text"
            value={parkingInfo}
            onChange={(e) => setParkingInfo(e.target.value)}
            className={inputClass}
            placeholder="예: 병설 유치원 내 주차"
          />
        </div>
        <div>
          <label htmlFor="private-notes" className="block text-sm font-medium text-slate-700">
            주의사항
          </label>
          <textarea
            id="private-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className={inputClass}
            placeholder="개인 준비물, 신분증 등"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "저장 중…" : "저장"}
        </button>
      </form>
    </section>
  );
}
