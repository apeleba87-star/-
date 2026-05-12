"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import {
  BETA_AVAILABILITY_OPTIONS,
  BETA_DESIRED_FEATURE_OPTIONS,
  BETA_DISPUTE_OPTIONS,
  BETA_EMPLOYEE_BAND_OPTIONS,
  BETA_INDUSTRY_OPTIONS,
  BETA_PAIN_EXPERIENCE_OPTIONS,
  BETA_RECORD_MANAGEMENT_OPTIONS,
  isValidKrMobileDigits,
  normalizePhoneDigits,
  type BetaApplicationPayload,
  type BetaAvailability,
  type BetaDesiredFeature,
  type BetaDispute,
  type BetaEmployeeBand,
  type BetaIndustry,
  type BetaPainExperience,
  type BetaRecordManagement,
} from "@/lib/beta-application";

const DISPLAY = "[font-family:var(--font-site-display),sans-serif]";

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function toggleInList<T extends string>(list: T[], item: T): T[] {
  return list.includes(item) ? list.filter((x) => x !== item) : [...list, item];
}

const STEPS = 4;

export default function BetaTesterApplyForm() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [applicantName, setApplicantName] = useState("");
  const [contact, setContact] = useState("");
  const [phone, setPhone] = useState("");
  const [industry, setIndustry] = useState<BetaIndustry | "">("");
  const [employeeBand, setEmployeeBand] = useState<BetaEmployeeBand | "">("");
  const [recordManagement, setRecordManagement] = useState<BetaRecordManagement | "">("");
  const [painExperiences, setPainExperiences] = useState<BetaPainExperience[]>([]);
  const [disputeLastYear, setDisputeLastYear] = useState<BetaDispute | "">("");
  const [desiredFeatures, setDesiredFeatures] = useState<BetaDesiredFeature[]>([]);
  const [biggestPain, setBiggestPain] = useState("");
  const [availability, setAvailability] = useState<BetaAvailability | "">("");
  const [consentPersonal, setConsentPersonal] = useState(false);

  const validateStep = useCallback(
    (s: number): string | null => {
      if (s === 1) {
        if (!applicantName.trim()) return "이름을 입력해 주세요.";
        if (!contact.trim()) return "연락처를 입력해 주세요.";
        if (!isValidKrMobileDigits(normalizePhoneDigits(phone))) return "휴대폰 번호를 확인해 주세요.";
        if (!industry) return "운영 중인 업종을 선택해 주세요.";
        if (!employeeBand) return "직원 수를 선택해 주세요.";
      }
      if (s === 2) {
        if (!recordManagement) return "현장 기록 관리 방식을 선택해 주세요.";
        if (painExperiences.length === 0) return "경험 항목을 한 가지 이상 선택해 주세요.";
      }
      if (s === 3) {
        if (!disputeLastYear) return "최근 1년 미수·분쟁 여부를 선택해 주세요.";
        if (desiredFeatures.length === 0) return "필요 기능을 한 가지 이상 선택해 주세요.";
        if (biggestPain.trim().length < 5) return "현재 가장 불편한 점을 조금만 더 적어 주세요. (5자 이상)";
      }
      if (s === 4) {
        if (!availability) return "선정 시 일정 가능 여부를 선택해 주세요.";
        if (!consentPersonal) return "개인정보 수집·이용에 동의해 주세요.";
      }
      return null;
    },
    [
      applicantName,
      contact,
      phone,
      industry,
      employeeBand,
      recordManagement,
      painExperiences.length,
      disputeLastYear,
      desiredFeatures.length,
      biggestPain,
      availability,
      consentPersonal,
    ],
  );

  const goNext = () => {
    const err = validateStep(step);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setStep((x) => Math.min(x + 1, STEPS));
  };

  const goPrev = () => {
    setError(null);
    setStep((x) => Math.max(x - 1, 1));
  };

  const submit = async () => {
    const err = validateStep(4);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setLoading(true);
    const payload: BetaApplicationPayload = {
      applicantName: applicantName.trim(),
      contact: contact.trim(),
      phone: normalizePhoneDigits(phone),
      industry: industry as BetaIndustry,
      employeeBand: employeeBand as BetaEmployeeBand,
      recordManagement: recordManagement as BetaRecordManagement,
      painExperiences,
      disputeLastYear: disputeLastYear as BetaDispute,
      desiredFeatures,
      biggestPain: biggestPain.trim(),
      availability: availability as BetaAvailability,
      consentPersonal: true,
    };
    try {
      const res = await fetch("/api/beta-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(json.error ?? "제출에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="rounded-2xl border border-teal-200/80 bg-teal-50/50 px-6 py-10 text-center">
        <p className={`${DISPLAY} text-xl font-normal tracking-tight text-zinc-900`}>지원해 주셔서 감사합니다.</p>
        <p className="mt-3 text-sm leading-relaxed text-zinc-600">
          검토 후 순차적으로 연락드리겠습니다. 베타 온보딩 안내는 입력하신 연락처로 안내드립니다.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
          >
            홈으로
          </Link>
          <Link
            href="/signup"
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:from-teal-500 hover:to-emerald-500"
          >
            회원가입 바로가기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white/90 p-5 shadow-sm sm:p-8">
      <div className="mb-8 flex items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          지원서 {step}/{STEPS}
        </p>
        <div className="flex gap-1">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-1.5 w-6 rounded-full ${i < step ? "bg-teal-500" : "bg-zinc-200"}`}
              aria-hidden
            />
          ))}
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800" role="alert">
          {error}
        </p>
      ) : null}

      {step === 1 ? (
        <div className="space-y-6">
          <div>
            <label htmlFor="bt-name" className="block text-sm font-semibold text-zinc-800">
              이름
            </label>
            <input
              id="bt-name"
              name="applicantName"
              autoComplete="name"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none ring-teal-500/30 focus:border-teal-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="bt-contact" className="block text-sm font-semibold text-zinc-800">
              연락처
            </label>
            <p className="mt-0.5 text-xs text-zinc-500">이메일, 카카오 채널 등 연락 가능한 정보를 적어 주세요.</p>
            <input
              id="bt-contact"
              name="contact"
              autoComplete="email"
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none ring-teal-500/30 focus:border-teal-500 focus:ring-2"
            />
          </div>
          <div>
            <label htmlFor="bt-phone" className="block text-sm font-semibold text-zinc-800">
              휴대폰 번호
            </label>
            <input
              id="bt-phone"
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
              placeholder="010-0000-0000"
              className="mt-1.5 w-full rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none ring-teal-500/30 focus:border-teal-500 focus:ring-2"
            />
          </div>
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800">운영 중인 업종은 무엇인가요?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BETA_INDUSTRY_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    industry === opt ? "border-teal-500 bg-teal-50/80 text-teal-900" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="industry"
                    value={opt}
                    checked={industry === opt}
                    onChange={() => setIndustry(opt)}
                    className="text-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800">현재 직원은 몇 명인가요?</legend>
            <p className="mt-1 text-xs font-medium text-teal-700">※ 이 질문 중요함 — 진짜 돈 되는 고객 선별에 도움이 됩니다.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BETA_EMPLOYEE_BAND_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    employeeBand === opt ? "border-teal-500 bg-teal-50/80 text-teal-900" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="employeeBand"
                    value={opt}
                    checked={employeeBand === opt}
                    onChange={() => setEmployeeBand(opt)}
                    className="text-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800">현재 현장 기록은 어떻게 관리하고 있나요?</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BETA_RECORD_MANAGEMENT_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    recordManagement === opt ? "border-teal-500 bg-teal-50/80 text-teal-900" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="recordManagement"
                    value={opt}
                    checked={recordManagement === opt}
                    onChange={() => setRecordManagement(opt)}
                    className="text-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800">이런 경험이 있으신가요? (중복 선택)</legend>
            <p className="mt-1 text-xs font-medium text-teal-700">※ 이 질문 핵심 — 고통 강도 파악에 도움이 됩니다.</p>
            <div className="mt-3 grid gap-2">
              {BETA_PAIN_EXPERIENCE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    painExperiences.includes(opt) ? "border-teal-500 bg-teal-50/80 text-teal-900" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={painExperiences.includes(opt)}
                    onChange={() => setPainExperiences((prev) => toggleInList(prev, opt))}
                    className="mt-0.5 text-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800">최근 1년 내 미수금 또는 분쟁 경험이 있으신가요?</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {BETA_DISPUTE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                    disputeLastYear === opt ? "border-teal-500 bg-teal-50/80 text-teal-900" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="disputeLastYear"
                    value={opt}
                    checked={disputeLastYear === opt}
                    onChange={() => setDisputeLastYear(opt)}
                    className="text-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800">가장 필요하다고 느끼는 기능은 무엇인가요? (중복 선택)</legend>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {BETA_DESIRED_FEATURE_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2.5 text-sm transition ${
                    desiredFeatures.includes(opt) ? "border-teal-500 bg-teal-50/80 text-teal-900" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={desiredFeatures.includes(opt)}
                    onChange={() => setDesiredFeatures((prev) => toggleInList(prev, opt))}
                    className="mt-0.5 text-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label htmlFor="bt-pain" className="block text-sm font-semibold text-zinc-800">
              현재 가장 불편한 점은 무엇인가요?
            </label>
            <p className="mt-1 text-xs font-medium text-teal-700">※ 여기서 진짜 시장 데이터가 나옵니다. 편하게 길게 적어 주세요.</p>
            <textarea
              id="bt-pain"
              name="biggestPain"
              rows={6}
              value={biggestPain}
              onChange={(e) => setBiggestPain(e.target.value)}
              className="mt-1.5 w-full resize-y rounded-xl border border-zinc-200 px-3 py-2.5 text-sm outline-none ring-teal-500/30 focus:border-teal-500 focus:ring-2"
            />
          </div>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="space-y-6">
          <fieldset>
            <legend className="text-sm font-semibold text-zinc-800">베타테스터 선정 시 바로 사용 가능하신가요?</legend>
            <div className="mt-3 flex flex-wrap gap-3">
              {BETA_AVAILABILITY_OPTIONS.map((opt) => (
                <label
                  key={opt}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm transition ${
                    availability === opt ? "border-teal-500 bg-teal-50/80 text-teal-900" : "border-zinc-200 hover:border-zinc-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="availability"
                    value={opt}
                    checked={availability === opt}
                    onChange={() => setAvailability(opt)}
                    className="text-teal-600"
                  />
                  {opt}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="rounded-xl border border-zinc-200/90 bg-zinc-50/80 px-4 py-5 text-center text-zinc-800">
            <p className={`${DISPLAY} text-lg leading-snug tracking-tight sm:text-xl`}>
              현장업은
              <br />
              <span className="text-zinc-500">&quot;일을 잘하는 것&quot;만으로는 부족합니다.</span>
            </p>
            <p className={`${DISPLAY} mt-4 text-lg leading-snug tracking-tight sm:text-xl`}>
              이제는
              <br />
              <span className="bg-gradient-to-r from-teal-600 to-emerald-600 bg-clip-text text-transparent">기록이 남아야 합니다.</span>
            </p>
            <p className="mt-5 text-sm leading-relaxed text-zinc-600">
              클린아이덱스 베타테스터로 참여하시고
              <br />
              현장업의 새로운 기준을 함께 만들어주세요.
            </p>
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-200 px-3 py-3 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={consentPersonal}
              onChange={(e) => setConsentPersonal(e.target.checked)}
              className="mt-0.5 text-teal-600"
            />
            <span>
              <strong className="text-zinc-900">개인정보 수집·이용에 동의합니다.</strong> 베타 선정·연락·온보딩 목적으로 이름·연락처·휴대폰·지원
              내용을 수집·이용합니다. 목적 달성 후 지체 없이 파기하며, 관련 문의는 고객센터로 연락 주세요.
            </span>
          </label>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-zinc-100 pt-6">
        <button
          type="button"
          onClick={goPrev}
          disabled={step === 1 || loading}
          className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-zinc-200 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
        >
          이전
        </button>
        {step < STEPS ? (
          <button
            type="button"
            onClick={goNext}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50"
          >
            다음
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={loading}
            className="inline-flex min-h-[44px] items-center justify-center rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 px-6 py-2.5 text-sm font-semibold text-white hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50"
          >
            {loading ? "제출 중…" : "베타 지원하기"}
          </button>
        )}
      </div>
    </div>
  );
}
