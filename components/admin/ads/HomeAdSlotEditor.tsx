"use client";

import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ImageUp, Calendar, ArrowUpDown, Code } from "lucide-react";
import CoupangApiSlotPanel from "@/app/admin/ads/CoupangApiSlotPanel";
import type { CoupangSlotConfig } from "@/lib/coupang-partners/types";
import type { CampaignInput, SlotType } from "@/app/admin/ads/actions";
import type { AdPlacementBlock } from "@/lib/admin/ad-slot-placement";
import { summarizeAdSlotStatus } from "@/components/admin/ads/ad-slot-status";
import { cn } from "@/lib/utils";

const TODAY = new Date().toISOString().slice(0, 10);

export type EditorSlot = {
  id: string;
  key: string;
  name: string;
  enabled: boolean;
  slot_type: SlotType | null;
  script_content: string | null;
  fallback_type: "google" | "coupang" | null;
  fallback_script_content: string | null;
};

export type EditorCampaign = {
  id: string;
  home_ad_slot_id: string;
  title: string | null;
  description: string | null;
  cta_text: string | null;
  cta_url: string | null;
  image_url: string | null;
  start_date: string;
  end_date: string;
  sort_order: number;
};

type CoupangCacheInfo = {
  fetched_at: string | null;
  fetch_error: string | null;
  product_count: number;
};

function statusLabel(start: string, end: string): string {
  if (TODAY < start) return "대기중";
  if (TODAY > end) return "종료";
  return "진행중";
}

function statusColor(s: string) {
  if (s === "진행중") return "bg-emerald-100 text-emerald-800";
  if (s === "대기중") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-600";
}

const STATUS_TONE_CLASS = {
  live: "bg-emerald-100 text-emerald-800",
  off: "bg-slate-100 text-slate-500",
  idle: "bg-amber-50 text-amber-800",
  warn: "bg-orange-100 text-orange-800",
} as const;

type Props = {
  slot: EditorSlot;
  placement?: AdPlacementBlock;
  pagePath?: string;
  previewHref?: string;
  campaigns: EditorCampaign[];
  coupangCache?: CoupangCacheInfo | null;
  coupangConfig?: CoupangSlotConfig | null;
  coupangApiConfigured: boolean;
  compact?: boolean;
  defaultExpanded?: boolean;
  scriptDraft: string;
  fallbackDraft: string;
  fallbackType: "google" | "coupang" | "";
  savingScript: boolean;
  savingFallback: boolean;
  uploading: boolean;
  form: CampaignInput;
  editingId: string | null;
  addingSlotId: string | null;
  onToggle: (enabled: boolean) => void;
  onSlotTypeChange: (type: SlotType) => void;
  onScriptDraftChange: (v: string) => void;
  onSaveScript: () => void;
  onFallbackTypeChange: (t: "google" | "coupang" | "") => void;
  onFallbackDraftChange: (v: string) => void;
  onSaveFallback: () => void;
  onStartAdd: () => void;
  onStartEdit: (c: EditorCampaign) => void;
  onDeleteCampaign: (id: string) => void;
  onSubmitForm: (e: React.FormEvent) => void;
  onCancelForm: () => void;
  onFormChange: (patch: Partial<CampaignInput>) => void;
  onImageChange: (file: File) => void;
};

export default function HomeAdSlotEditor({
  slot,
  placement,
  pagePath,
  previewHref,
  campaigns,
  coupangCache,
  coupangConfig,
  coupangApiConfigured,
  compact = false,
  defaultExpanded = false,
  scriptDraft,
  fallbackDraft,
  fallbackType,
  savingScript,
  savingFallback,
  uploading,
  form,
  editingId,
  addingSlotId,
  onToggle,
  onSlotTypeChange,
  onScriptDraftChange,
  onSaveScript,
  onFallbackTypeChange,
  onFallbackDraftChange,
  onSaveFallback,
  onStartAdd,
  onStartEdit,
  onDeleteCampaign,
  onSubmitForm,
  onCancelForm,
  onFormChange,
  onImageChange,
}: Props) {
  const slotCampaigns = campaigns
    .filter((c) => c.home_ad_slot_id === slot.id)
    .sort((a, b) => a.sort_order - b.sort_order);
  const isFormOpen = addingSlotId === slot.id || (editingId && slotCampaigns.some((c) => c.id === editingId));
  const summary = summarizeAdSlotStatus(slot, slotCampaigns, coupangCache);
  const title = placement?.label ?? slot.name;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "rounded-xl border bg-white shadow-sm",
        compact ? "border-teal-200 ring-1 ring-teal-100" : "border-slate-200 p-6"
      )}
    >
      <details className="group" open={defaultExpanded || undefined}>
        <summary
          className={cn(
            "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
            compact ? "px-4 py-3" : "mb-0"
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase",
                    STATUS_TONE_CLASS[summary.tone]
                  )}
                >
                  {summary.text}
                </span>
                {placement?.kind === "affiliate_slot" ? (
                  <span className="text-[10px] font-medium text-teal-700">제휴 슬롯</span>
                ) : null}
              </div>
              <h3 className="mt-1 text-base font-bold text-slate-900">{title}</h3>
              {placement?.detail ? (
                <p className="mt-0.5 text-xs text-slate-600">{placement.detail}</p>
              ) : null}
              <p className="mt-1 font-mono text-[10px] text-slate-400">{slot.key}</p>
            </div>
            <div className="flex shrink-0 items-center gap-3">
              {previewHref ? (
                <a
                  href={previewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-teal-700 hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  미리보기
                </a>
              ) : null}
              <label
                className="flex items-center gap-2"
                onClick={(e) => e.preventDefault()}
              >
                <span className="text-xs text-slate-600">노출</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slot.enabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggle(!slot.enabled);
                  }}
                  className={cn(
                    "relative h-6 w-10 rounded-full transition-colors",
                    slot.enabled ? "bg-emerald-500" : "bg-slate-300"
                  )}
                >
                  <span
                    className={cn(
                      "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                      slot.enabled ? "left-[18px]" : "left-0.5"
                    )}
                  />
                </button>
              </label>
              <span className="text-xs text-slate-400 group-open:rotate-180">▼</span>
            </div>
          </div>
        </summary>

        <div className={cn("border-t border-slate-100", compact ? "px-4 pb-4 pt-3" : "mt-4 pt-4")}>
          {pagePath ? (
            <p className="mb-3 text-xs text-slate-500">
              페이지: <code className="text-slate-600">{pagePath}</code>
            </p>
          ) : null}

          <div className="mb-4">
            <span className="mb-2 block text-sm font-medium text-slate-700">광고 유형</span>
            <div className="flex flex-wrap gap-2">
              {(["direct", "coupang_api", "google", "coupang"] as const).map((t) => {
                const isActive = (slot.slot_type ?? "direct") === t;
                const labels = {
                  direct: "직접 수주",
                  coupang_api: "쿠팡 API",
                  google: "구글",
                  coupang: "쿠팡 스크립트",
                };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onSlotTypeChange(t)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-sm font-medium",
                      isActive
                        ? "border-slate-800 bg-slate-800 text-white"
                        : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>
          </div>

          {(slot.slot_type ?? "direct") === "coupang_api" ? (
            <CoupangApiSlotPanel
              slotId={slot.id}
              slotKey={slot.key}
              initialConfig={coupangConfig ?? null}
              cache={coupangCache ?? null}
              apiConfigured={coupangApiConfigured}
            />
          ) : (slot.slot_type ?? "direct") === "google" || (slot.slot_type ?? "direct") === "coupang" ? (
            <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
              <label className="mb-2 flex items-center gap-1 text-sm font-medium text-slate-700">
                <Code className="h-4 w-4" />
                {(slot.slot_type ?? "direct") === "google" ? "구글" : "쿠팡"} 광고 스크립트
              </label>
              <textarea
                value={scriptDraft}
                onChange={(e) => onScriptDraftChange(e.target.value)}
                placeholder='<script>...</script>'
                rows={5}
                className="mb-2 w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
              />
              <button
                type="button"
                disabled={savingScript}
                onClick={onSaveScript}
                className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
              >
                {savingScript ? "저장 중…" : "스크립트 저장"}
              </button>
            </div>
          ) : (
            <>
              <ul className="mb-4 space-y-2">
                {slotCampaigns.length === 0 ? (
                  <li className="rounded-lg border border-dashed border-slate-200 py-4 text-center text-sm text-slate-500">
                    등록된 광고 없음
                  </li>
                ) : (
                  slotCampaigns.map((c) => {
                    const status = statusLabel(c.start_date, c.end_date);
                    return (
                      <li
                        key={c.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-3 py-2"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={cn("rounded px-2 py-0.5 text-xs font-medium", statusColor(status))}>
                            {status}
                          </span>
                          <span className="text-sm font-medium text-slate-800">{c.title || "(제목 없음)"}</span>
                          <span className="text-xs text-slate-500">
                            {c.start_date} ~ {c.end_date}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onStartEdit(c)}
                            className="rounded p-1.5 text-slate-600 hover:bg-slate-200"
                            aria-label="수정"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteCampaign(c.id)}
                            className="rounded p-1.5 text-red-600 hover:bg-red-50"
                            aria-label="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })
                )}
              </ul>

              {!isFormOpen ? (
                <button
                  type="button"
                  onClick={onStartAdd}
                  className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Plus className="h-4 w-4" />
                  광고 추가
                </button>
              ) : null}

              {isFormOpen ? (
                <form onSubmit={onSubmitForm} className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">제목</span>
                      <input
                        type="text"
                        value={form.title ?? ""}
                        onChange={(e) => onFormChange({ title: e.target.value || null })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">링크 URL</span>
                      <input
                        type="url"
                        value={form.cta_url ?? ""}
                        onChange={(e) => onFormChange({ cta_url: e.target.value || null })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">설명</span>
                    <textarea
                      value={form.description ?? ""}
                      onChange={(e) => onFormChange({ description: e.target.value || null })}
                      rows={2}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">버튼 문구</span>
                    <input
                      type="text"
                      value={form.cta_text ?? ""}
                      onChange={(e) => onFormChange({ cta_text: e.target.value || null })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">이미지 / GIF</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) onImageChange(f);
                      }}
                      className="block w-full text-sm file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5"
                    />
                    {form.image_url ? (
                      <a
                        href={form.image_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline"
                      >
                        <ImageUp className="h-3 w-3" /> 업로드됨
                      </a>
                    ) : null}
                  </label>
                  <div className="grid gap-4 sm:grid-cols-3">
                    <label className="block">
                      <span className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                        <Calendar className="h-4 w-4" /> 시작일
                      </span>
                      <input
                        type="date"
                        value={form.start_date}
                        onChange={(e) => onFormChange({ start_date: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-sm font-medium text-slate-700">종료일</span>
                      <input
                        type="date"
                        value={form.end_date}
                        onChange={(e) => onFormChange({ end_date: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                        <ArrowUpDown className="h-4 w-4" /> 대기순서
                      </span>
                      <input
                        type="number"
                        min={0}
                        value={form.sort_order}
                        onChange={(e) => onFormChange({ sort_order: Number(e.target.value) || 0 })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </label>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
                    >
                      {editingId ? "수정" : "추가"}
                    </button>
                    <button
                      type="button"
                      onClick={onCancelForm}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      취소
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="mt-6 rounded-lg border border-violet-200 bg-violet-50/40 p-4">
                <p className="mb-1 text-sm font-medium text-slate-800">직접 캠페인 없을 때 대체 (쿠팡/구글)</p>
                <div className="mb-2 flex flex-wrap gap-2">
                  {(["", "coupang", "google"] as const).map((t) => {
                    const active = fallbackType === t;
                    const label = t === "" ? "없음" : t === "coupang" ? "쿠팡" : "구글";
                    return (
                      <button
                        key={t || "none"}
                        type="button"
                        onClick={() => onFallbackTypeChange(t)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 text-sm font-medium",
                          active
                            ? "border-violet-700 bg-violet-700 text-white"
                            : "border-slate-300 bg-white text-slate-600"
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <textarea
                  value={fallbackDraft}
                  onChange={(e) => onFallbackDraftChange(e.target.value)}
                  placeholder="대체 배너 스크립트"
                  rows={3}
                  className="mb-2 w-full rounded border border-slate-300 px-3 py-2 font-mono text-sm"
                />
                <button
                  type="button"
                  disabled={savingFallback}
                  onClick={onSaveFallback}
                  className="rounded-lg bg-violet-700 px-4 py-2 text-sm font-medium text-white hover:bg-violet-800 disabled:opacity-50"
                >
                  {savingFallback ? "저장 중…" : "대체 광고 저장"}
                </button>
              </div>
            </>
          )}
        </div>
      </details>
    </motion.section>
  );
}
