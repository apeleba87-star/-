"use client";

import { useState } from "react";
import { saveEstimateConfig } from "./actions";
import type { EstimateConfig } from "@/lib/estimate-config";

const LABELS: Record<keyof EstimateConfig, string> = {
  office_avg_unit_by_visits: "정기 청소 업계 평균 회당 평당 (주1~7회순, 원)",
  stairs_base_monthly: "계단 4층 기준 주 1회 월액 (원)",
  stairs_extra_per_floor: "계단 층당 추가 (원)",
  stairs_visit_multiplier: "계단 주 1~3회 배율 (쉼표 구분)",
  office_restroom_per_unit: "정기 청소 화장실 1칸당 월 단가 (원)",
  office_recycle_monthly: "정기 청소 분리수거 월 (원)",
  office_elevator_monthly: "정기 청소 엘리베이터 월 (원)",
  stairs_restroom_unit: "계단 화장실 1개당 월 (원)",
  stairs_elevator_monthly: "계단 엘리베이터 월 (원)",
  stairs_parking_monthly: "계단 주차장 월 (원)",
  stairs_window_monthly: "계단 창틀 먼지 월 (원)",
  stairs_recycle_monthly: "계단 분리수거 월 (원)",
};

export default function EstimateConfigForm({ initialConfig }: { initialConfig: EstimateConfig }) {
  const [config, setConfig] = useState(initialConfig);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    const res = await saveEstimateConfig(config);
    setSaving(false);
    setMessage(res.ok ? { ok: true, text: "저장되었습니다." } : { ok: false, text: res.error ?? "저장 실패" });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {message && (
        <p className={message.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>{message.text}</p>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">정기 청소 (면적 기준)</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.office_avg_unit_by_visits}</span>
            <input
              type="text"
              value={config.office_avg_unit_by_visits.join(",")}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  office_avg_unit_by_visits: e.target.value
                    .split(",")
                    .map((n) => Number(n.trim()) || 0)
                    .slice(0, 7),
                }))
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="2000, 1850, 1750, ..."
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.office_restroom_per_unit}</span>
            <input
              type="number"
              value={config.office_restroom_per_unit}
              onChange={(e) => setConfig((c) => ({ ...c, office_restroom_per_unit: Number(e.target.value) || 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.office_recycle_monthly}</span>
            <input
              type="number"
              value={config.office_recycle_monthly}
              onChange={(e) => setConfig((c) => ({ ...c, office_recycle_monthly: Number(e.target.value) || 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.office_elevator_monthly}</span>
            <input
              type="number"
              value={config.office_elevator_monthly}
              onChange={(e) => setConfig((c) => ({ ...c, office_elevator_monthly: Number(e.target.value) || 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">계단 청소</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_base_monthly}</span>
            <input
              type="number"
              value={config.stairs_base_monthly}
              onChange={(e) => setConfig((c) => ({ ...c, stairs_base_monthly: Number(e.target.value) || 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_extra_per_floor}</span>
            <input
              type="number"
              value={config.stairs_extra_per_floor}
              onChange={(e) => setConfig((c) => ({ ...c, stairs_extra_per_floor: Number(e.target.value) ?? 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_visit_multiplier}</span>
            <input
              type="text"
              value={config.stairs_visit_multiplier.join(", ")}
              onChange={(e) =>
                setConfig((c) => ({
                  ...c,
                  stairs_visit_multiplier: e.target.value
                    .split(/[\s,]+/)
                    .map((n) => Number(n) || 0)
                    .slice(0, 3),
                }))
              }
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
              placeholder="1, 1.9, 2.7"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_restroom_unit}</span>
            <input
              type="number"
              value={config.stairs_restroom_unit}
              onChange={(e) => setConfig((c) => ({ ...c, stairs_restroom_unit: Number(e.target.value) ?? 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_elevator_monthly}</span>
            <input
              type="number"
              value={config.stairs_elevator_monthly}
              onChange={(e) => setConfig((c) => ({ ...c, stairs_elevator_monthly: Number(e.target.value) ?? 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_parking_monthly}</span>
            <input
              type="number"
              value={config.stairs_parking_monthly}
              onChange={(e) => setConfig((c) => ({ ...c, stairs_parking_monthly: Number(e.target.value) ?? 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_window_monthly}</span>
            <input
              type="number"
              value={config.stairs_window_monthly}
              onChange={(e) => setConfig((c) => ({ ...c, stairs_window_monthly: Number(e.target.value) ?? 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm text-slate-600">{LABELS.stairs_recycle_monthly}</span>
            <input
              type="number"
              value={config.stairs_recycle_monthly}
              onChange={(e) => setConfig((c) => ({ ...c, stairs_recycle_monthly: Number(e.target.value) ?? 0 }))}
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-lg bg-slate-800 px-6 py-2.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
      >
        {saving ? "저장 중…" : "저장"}
      </button>
    </form>
  );
}
