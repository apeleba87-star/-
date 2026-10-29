"use client";

import { useState } from "react";
import { saveAiBlogAmount, saveAiBlogPromo, saveAiBlogTrial } from "./actions";
import type { AiBlogPromoConfig, AiBlogTrialConfig } from "@/lib/ai-blog/billing-settings";

export function AmountForm({ initialAmountCents }: { initialAmountCents: number }) {
  const [amount, setAmount] = useState(String(initialAmountCents));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("amount_cents", amount);
    const res = await saveAiBlogAmount(fd);
    setLoading(false);
    setMessage(
      res.ok
        ? { ok: true, text: "정상 금액이 저장되었습니다." }
        : { ok: false, text: res.error ?? "저장 실패" },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <h2 className="text-lg font-semibold text-slate-900">정상 월 금액</h2>
      <p className="text-xs text-slate-500">프로모 종료 후 자동 결제되는 금액(원)</p>
      <input
        type="number"
        min={0}
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2"
      />
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "저장 중…" : "저장"}
      </button>
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}

export function PromoForm({ initialPromo }: { initialPromo: AiBlogPromoConfig }) {
  const [enabled, setEnabled] = useState(initialPromo.enabled);
  const [amount, setAmount] = useState(String(initialPromo.amount_cents));
  const [options, setOptions] = useState(initialPromo.month_options.join(","));
  const [startDate, setStartDate] = useState(initialPromo.start_date ?? "");
  const [endDate, setEndDate] = useState(initialPromo.end_date ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("promo_enabled", enabled ? "on" : "false");
    fd.set("promo_amount_cents", amount);
    fd.set("promo_month_options", options);
    fd.set("promo_start_date", startDate);
    fd.set("promo_end_date", endDate);
    const res = await saveAiBlogPromo(fd);
    setLoading(false);
    setMessage(
      res.ok
        ? { ok: true, text: "프로모 설정이 저장되었습니다." }
        : { ok: false, text: res.error ?? "저장 실패" },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <h2 className="text-lg font-semibold text-slate-900">프로모 (100원 선택형)</h2>
      <p className="text-xs text-slate-500">
        운영자(고객)가 결제 화면에서 개월을 고릅니다. 예: 1,2 → 100원 1개월 / 100원 2개월 선택 후 정상가 자동결제.
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        프로모 활성화
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium">프로모 금액 (원)</label>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">선택 가능 개월 (쉼표 구분)</label>
        <input
          type="text"
          value={options}
          onChange={(e) => setOptions(e.target.value)}
          placeholder="1,2"
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">시작일</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium">종료일</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "저장 중…" : "저장"}
      </button>
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}

export function TrialForm({ initialTrial }: { initialTrial: AiBlogTrialConfig }) {
  const [enabled, setEnabled] = useState(initialTrial.enabled);
  const [days, setDays] = useState(String(initialTrial.days));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("trial_enabled", enabled ? "on" : "false");
    fd.set("trial_days", days);
    const res = await saveAiBlogTrial(fd);
    setLoading(false);
    setMessage(
      res.ok
        ? { ok: true, text: "체험 설정이 저장되었습니다." }
        : { ok: false, text: res.error ?? "저장 실패" },
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <h2 className="text-lg font-semibold text-slate-900">무료 체험</h2>
      <p className="text-xs text-slate-500">
        기본: 3일 · TRIAL 플랜(블로그 3개). 켜면 AI 블로그 진입 시 계정당 1회 자동 부여됩니다.{" "}
        <strong>교육생에게 바로 100원 결제를 유도할 때는 끄세요.</strong>
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        체험 활성화
      </label>
      <div>
        <label className="mb-1 block text-sm font-medium">체험 일수</label>
        <input
          type="number"
          min={1}
          max={30}
          value={days}
          onChange={(e) => setDays(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
      >
        {loading ? "저장 중…" : "저장"}
      </button>
      {message && (
        <p className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>
      )}
    </form>
  );
}
