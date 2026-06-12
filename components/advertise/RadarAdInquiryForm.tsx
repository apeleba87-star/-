"use client";

import Link from "next/link";
import { useState } from "react";
import {
  RADAR_AD_SLOT_CATEGORY_LABELS,
  type RadarAdSlotCategory,
} from "@/lib/demand/radar-ads-shared";
import type { RadarAdInquiryScope } from "@/lib/demand/radar-ad-inquiry";

const SCOPES: { value: RadarAdInquiryScope; label: string; hint: string }[] = [
  {
    value: "national",
    label: "전국 배너",
    hint: "입주레이더·채용·일당 등 여러 화면에 동일 노출",
  },
  {
    value: "regional",
    label: "지역 배너",
    hint: "선택한 시·구를 본 사용자에게만 노출",
  },
  {
    value: "both",
    label: "전국 + 지역",
    hint: "브랜드와 지역 타깃을 함께",
  },
];

function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function RadarAdInquiryForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<RadarAdInquiryScope | "">("");
  const [regionInterest, setRegionInterest] = useState("");
  const [category, setCategory] = useState<RadarAdSlotCategory | "">("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState("");

  const needsRegion = scope === "regional" || scope === "both";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/demand/radar-ads/inquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          contact_name: contactName,
          phone,
          email,
          scope,
          region_interest: regionInterest,
          category,
          message,
          consent_personal: consent,
          website,
        }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setError(data.error ?? "접수에 실패했습니다.");
        return;
      }
      setDone(true);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-teal-200 bg-teal-50/80 p-8 text-center">
        <p className="text-lg font-semibold text-teal-900">문의가 접수되었습니다</p>
        <p className="mt-2 text-sm text-teal-800/90">
          영업일 기준 1~2일 내 연락드리겠습니다. 급하시면 문의 시 남겨주신 번호로 연락 주세요.
        </p>
        <Link
          href="/demand"
          className="mt-6 inline-flex rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700"
        >
          입주레이더로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void submit(e)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-slate-800">업체명 *</span>
          <input
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="input mt-1 w-full"
            placeholder="(주)○○클린"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">담당자명 *</span>
          <input
            required
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            className="input mt-1 w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">휴대폰 *</span>
          <input
            required
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(formatPhoneInput(e.target.value))}
            className="input mt-1 w-full"
            placeholder="010-0000-0000"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-sm font-semibold text-slate-800">이메일 (선택)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input mt-1 w-full"
          />
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-slate-800">희망 광고 유형 *</legend>
        <div className="mt-2 space-y-2">
          {SCOPES.map((s) => (
            <label
              key={s.value}
              className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 bg-white p-3 has-[:checked]:border-teal-400 has-[:checked]:ring-1 has-[:checked]:ring-teal-200"
            >
              <input
                type="radio"
                name="scope"
                value={s.value}
                checked={scope === s.value}
                onChange={() => setScope(s.value)}
                className="mt-1"
                required
              />
              <span>
                <span className="block text-sm font-medium text-slate-900">{s.label}</span>
                <span className="block text-xs text-slate-500">{s.hint}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {needsRegion ? (
        <label className="block">
          <span className="text-sm font-semibold text-slate-800">희망 지역 (시·구) *</span>
          <input
            required={needsRegion}
            value={regionInterest}
            onChange={(e) => setRegionInterest(e.target.value)}
            className="input mt-1 w-full"
            placeholder="예: 서울 강서구, 부산 해운대구"
          />
        </label>
      ) : null}

      <label className="block">
        <span className="text-sm font-semibold text-slate-800">업종 (선택)</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RadarAdSlotCategory | "")}
          className="input mt-1 w-full"
        >
          <option value="">선택 안 함</option>
          {(Object.keys(RADAR_AD_SLOT_CATEGORY_LABELS) as RadarAdSlotCategory[]).map((key) => (
            <option key={key} value={key}>
              {RADAR_AD_SLOT_CATEGORY_LABELS[key]}
            </option>
          ))}
        </select>
      </label>

      <label className="block">
        <span className="text-sm font-semibold text-slate-800">문의 내용 (선택)</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="input mt-1 w-full resize-y"
          placeholder="희망 기간, 예산, 랜딩 URL 등"
        />
      </label>

      <label className="hidden" aria-hidden>
        <span>Website</span>
        <input
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </label>

      <label className="flex gap-2 text-sm text-slate-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1"
          required
        />
        <span>
          광고 문의 처리를 위해 연락처·업체명을 수집·이용하는 것에 동의합니다.{" "}
          <Link href="/privacy" className="font-medium text-teal-700 hover:underline">
            개인정보처리방침
          </Link>
        </span>
      </label>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-teal-600 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60"
      >
        {loading ? "접수 중…" : "광고 문의 보내기"}
      </button>
    </form>
  );
}
