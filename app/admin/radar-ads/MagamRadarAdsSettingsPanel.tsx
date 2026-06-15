"use client";

import { useState } from "react";
import type { MagamRadarAdSettings } from "@/lib/demand/magam-radar-ad-settings";
import { updateMagamRadarAdSettings } from "./actions";

type Props = {
  initial: MagamRadarAdSettings;
};

export default function MagamRadarAdsSettingsPanel({ initial }: Props) {
  const [nationalEnabled, setNationalEnabled] = useState(initial.nationalEnabled);
  const [regionalEnabled, setRegionalEnabled] = useState(initial.regionalEnabled);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    setError(null);
    const result = await updateMagamRadarAdSettings(nationalEnabled, regionalEnabled);
    setSaving(false);
    if (result.ok) {
      setMessage("마감앱 광고 설정을 저장했습니다.");
    } else {
      setError(result.error ?? "저장에 실패했습니다.");
    }
  }

  const dirty =
    nationalEnabled !== initial.nationalEnabled ||
    regionalEnabled !== initial.regionalEnabled;

  return (
    <section className="rounded-2xl border border-violet-200/90 bg-violet-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">마감앱 광고 노출</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            입주레이더·채용과 동일한 직거래 배너를 마감앱에도 불러옵니다. 기본은 꺼짐이며, 켜도
            아래에서 편집한 슬롯이 게재(active)·기간 내일 때만 보입니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={saving || !dirty}
          className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "저장 중…" : "저장"}
        </button>
      </div>

      {message ? (
        <p className="mt-3 text-sm text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/80 bg-white p-4 shadow-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={nationalEnabled}
            onChange={(e) => setNationalEnabled(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">전국 배너</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-600">
              내 공고·글쓰기·공유 화면 상단 등 — 지역과 무관하게 동일 캠페인
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/80 bg-white p-4 shadow-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={regionalEnabled}
            onChange={(e) => setRegionalEnabled(e.target.checked)}
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">지역 배너</span>
            <span className="mt-1 block text-xs leading-relaxed text-slate-600">
              글쓰기·공유에서 선택·표시된 시·군·구에 맞는 지역 캠페인
            </span>
          </span>
        </label>
      </div>
    </section>
  );
}
