"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitOnboarding, type OnboardingChoice } from "./actions";
import Button from "@/components/Button";

const OPTIONS: { value: OnboardingChoice; label: string }[] = [
  { value: "work", label: "현장에서 일을 하고 싶어요 (구직)" },
  { value: "operate", label: "현장 운영 (구인 등)" },
  { value: "promote", label: "제품 홍보" },
];

export default function OnboardingForm() {
  const router = useRouter();
  const [choices, setChoices] = useState<OnboardingChoice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(value: OnboardingChoice) {
    setChoices((prev) => (prev.includes(value) ? prev.filter((c) => c !== value) : [...prev, value]));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await submitOnboarding(choices);
    if (!result.ok) {
      setError(result.error ?? "저장에 실패했습니다.");
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="card space-y-6">
      <div className="space-y-3">
        {OPTIONS.map((opt) => (
          <label key={opt.value} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={choices.includes(opt.value)}
              onChange={() => toggle(opt.value)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600"
            />
            <span className="text-slate-800">{opt.label}</span>
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || choices.length === 0} className="w-full">
        {loading ? "저장 중…" : "다음"}
      </Button>
    </form>
  );
}
