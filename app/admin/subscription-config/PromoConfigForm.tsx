"use client";

import { useState } from "react";
import { saveSubscriptionPromo } from "./actions";
import type { SubscriptionPromoConfig } from "@/lib/app-settings";

type Props = { initialPromo: SubscriptionPromoConfig };

export default function PromoConfigForm({ initialPromo }: Props) {
  const [enabled, setEnabled] = useState(initialPromo.enabled);
  const [amount, setAmount] = useState(String(initialPromo.amount_cents));
  const [months, setMonths] = useState(String(initialPromo.months));
  const [startDate, setStartDate] = useState(initialPromo.start_date ?? "");
  const [endDate, setEndDate] = useState(initialPromo.end_date ?? "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("promo_enabled", enabled ? "on" : "false");
    formData.set("promo_amount_cents", amount);
    formData.set("promo_months", months);
    formData.set("promo_start_date", startDate);
    formData.set("promo_end_date", endDate);
    const res = await saveSubscriptionPromo(formData);
    setLoading(false);
    if (res.ok) {
      setMessage({ ok: true, text: "프로모 설정이 저장되었습니다." });
    } else {
      setMessage({ ok: false, text: res.error ?? "저장에 실패했습니다." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">이벤트 프로모 (첫 N개월 특가)</h2>
        <p className="mt-1 text-xs text-slate-500">
          기간을 설정하면 해당 기간 내 신규 구독만 첫 1~3개월(설정값) 특가, 이후 정상가로 자동 전환됩니다.
        </p>
      </div>

      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
        />
        <span className="text-sm font-medium text-slate-700">프로모 활성화</span>
      </label>

      <div>
        <label htmlFor="promo_amount_cents" className="mb-1 block text-sm font-medium text-slate-700">
          프로모 월 금액 (원)
        </label>
        <input
          id="promo_amount_cents"
          name="promo_amount_cents"
          type="number"
          min={0}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <p className="mt-1 text-xs text-slate-500">예: 100 (첫 N개월 동안 이 금액으로 결제)</p>
      </div>

      <div>
        <label htmlFor="promo_months" className="mb-1 block text-sm font-medium text-slate-700">
          프로모 적용 개월 수 (1~12)
        </label>
        <input
          id="promo_months"
          name="promo_months"
          type="number"
          min={1}
          max={12}
          value={months}
          onChange={(e) => setMonths(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <p className="mt-1 text-xs text-slate-500">첫 1개월만 100원, 또는 최대 3개월 등</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="promo_start_date" className="mb-1 block text-sm font-medium text-slate-700">
            이벤트 시작일 (선택)
          </label>
          <input
            id="promo_start_date"
            name="promo_start_date"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
        <div>
          <label htmlFor="promo_end_date" className="mb-1 block text-sm font-medium text-slate-700">
            이벤트 종료일 (선택)
          </label>
          <input
            id="promo_end_date"
            name="promo_end_date"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        시작일·종료일을 비우면 기간 제한 없이 프로모가 적용됩니다. 설정 시 해당 기간 내 가입한 사용자만 프로모 혜택을 받습니다.
      </p>

      {message && (
        <p className={message.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-amber-500 px-4 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-60"
      >
        {loading ? "저장 중…" : "프로모 설정 저장"}
      </button>
    </form>
  );
}
