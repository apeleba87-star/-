"use client";

import { useState } from "react";
import { saveSubscriptionAmount } from "./actions";

type Props = { initialAmountCents: number };

export default function SubscriptionConfigForm({ initialAmountCents }: Props) {
  const [amount, setAmount] = useState(String(initialAmountCents));
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const formData = new FormData();
    formData.set("amount_cents", amount);
    const res = await saveSubscriptionAmount(formData);
    setLoading(false);
    if (res.ok) {
      setMessage({ ok: true, text: "저장되었습니다." });
    } else {
      setMessage({ ok: false, text: res.error ?? "저장에 실패했습니다." });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md space-y-4">
      <div>
        <label htmlFor="amount_cents" className="mb-1 block text-sm font-medium text-slate-700">
          월 구독 금액 (원)
        </label>
        <input
          id="amount_cents"
          name="amount_cents"
          type="number"
          min={0}
          step={1}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
        />
        <p className="mt-1 text-xs text-slate-500">
          테스트 시 100원 등으로 설정 가능. 실제 서비스에서는 9,900원 등으로 설정하세요.
        </p>
      </div>
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
        {loading ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
