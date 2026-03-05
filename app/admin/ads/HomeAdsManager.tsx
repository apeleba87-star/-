"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, ImageUp, Calendar, ArrowUpDown } from "lucide-react";
import {
  toggleSlotEnabled,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  uploadAdImage,
  type CampaignInput,
} from "./actions";

const TODAY = new Date().toISOString().slice(0, 10);

type Slot = { id: string; key: string; name: string; enabled: boolean };
type Campaign = {
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

export default function HomeAdsManager({
  slots,
  campaigns,
}: {
  slots: Slot[];
  campaigns: Campaign[];
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingSlotId, setAddingSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const defaultForm: CampaignInput = {
    home_ad_slot_id: "",
    title: "",
    description: "",
    cta_text: "",
    cta_url: "",
    image_url: null,
    start_date: TODAY,
    end_date: TODAY,
    sort_order: 0,
  };

  const [form, setForm] = useState<CampaignInput>(defaultForm);

  function startAdd(slotId: string) {
    setAddingSlotId(slotId);
    setEditingId(null);
    setForm({ ...defaultForm, home_ad_slot_id: slotId });
  }

  function startEdit(c: Campaign) {
    setEditingId(c.id);
    setAddingSlotId(null);
    setForm({
      home_ad_slot_id: c.home_ad_slot_id,
      title: c.title ?? "",
      description: c.description ?? "",
      cta_text: c.cta_text ?? "",
      cta_url: c.cta_url ?? "",
      image_url: c.image_url,
      start_date: c.start_date,
      end_date: c.end_date,
      sort_order: c.sort_order,
    });
  }

  function cancelForm() {
    setEditingId(null);
    setAddingSlotId(null);
    setForm(defaultForm);
  }

  async function handleToggle(slotId: string, enabled: boolean) {
    const res = await toggleSlotEnabled(slotId, enabled);
    setMessage(res.ok ? { ok: true, text: "저장되었습니다." } : { ok: false, text: res.error ?? "실패" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (editingId) {
      const res = await updateCampaign(editingId, form);
      setMessage(res.ok ? { ok: true, text: "수정되었습니다." } : { ok: false, text: res.error ?? "실패" });
      if (res.ok) cancelForm();
    } else {
      const res = await createCampaign(form);
      setMessage(res.ok ? { ok: true, text: "추가되었습니다." } : { ok: false, text: res.error ?? "실패" });
      if (res.ok) cancelForm();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 광고를 삭제할까요?")) return;
    const res = await deleteCampaign(id);
    setMessage(res.ok ? { ok: true, text: "삭제되었습니다." } : { ok: false, text: res.error ?? "실패" });
    if (res.ok) cancelForm();
  }

  async function handleImageChange(slotId: string, file: File) {
    if (!file.type.startsWith("image/")) {
      setMessage({ ok: false, text: "이미지 또는 GIF 파일만 업로드 가능합니다." });
      return;
    }
    setUploading(true);
    setMessage(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await uploadAdImage(fd);
    setUploading(false);
    if (res.ok) setForm((f) => (f.home_ad_slot_id === slotId ? { ...f, image_url: res.url } : f));
    else setMessage({ ok: false, text: res.error });
  }

  return (
    <div className="space-y-8">
      {message && (
        <p className={message.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>{message.text}</p>
      )}

      {slots.map((slot) => {
        const slotCampaigns = campaigns.filter((c) => c.home_ad_slot_id === slot.id).sort((a, b) => a.sort_order - b.sort_order);
        const isFormOpen = addingSlotId === slot.id || (editingId && slotCampaigns.some((c) => c.id === editingId));

        return (
          <motion.section
            key={slot.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-bold text-slate-900">{slot.name}</h2>
              <label className="flex items-center gap-2">
                <span className="text-sm text-slate-600">노출</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={slot.enabled}
                  onClick={() => handleToggle(slot.id, !slot.enabled)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    slot.enabled ? "bg-emerald-500" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      slot.enabled ? "left-6" : "left-1"
                    }`}
                  />
                </button>
                <span className="text-sm font-medium text-slate-700">{slot.enabled ? "ON" : "OFF"}</span>
              </label>
            </div>

            <p className="mb-4 text-xs text-slate-500">
              {slot.enabled ? "슬롯이 켜져 있습니다. 기간이 겹치는 경우 대기순서(숫자 작을수록 우선)로 1건만 노출됩니다." : "슬롯이 꺼져 있으면 해당 자리는 빈칸으로 표시됩니다."}
            </p>

            <ul className="mb-4 space-y-2">
              {slotCampaigns.length === 0 ? (
                <li className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 py-4 text-center text-sm text-slate-500">
                  등록된 광고 없음
                </li>
              ) : (
                slotCampaigns.map((c) => {
                  const status = statusLabel(c.start_date, c.end_date);
                  return (
                    <li
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded px-2 py-0.5 text-xs font-medium ${statusColor(status)}`}>
                          {status}
                        </span>
                        <span className="font-medium text-slate-800">{c.title || "(제목 없음)"}</span>
                        <span className="text-xs text-slate-500">
                          {c.start_date} ~ {c.end_date}
                        </span>
                        <span className="flex items-center gap-0.5 text-xs text-slate-500">
                          <ArrowUpDown className="h-3 w-3" />
                          {c.sort_order}
                        </span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => startEdit(c)}
                          className="rounded p-1.5 text-slate-600 hover:bg-slate-200"
                          aria-label="수정"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id)}
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

            {!isFormOpen && (
              <button
                type="button"
                onClick={() => startAdd(slot.id)}
                className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                광고 추가
              </button>
            )}

            {isFormOpen && (
              <form onSubmit={handleSubmit} className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
                <input type="hidden" name="home_ad_slot_id" value={form.home_ad_slot_id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">제목</span>
                    <input
                      type="text"
                      value={form.title ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, title: e.target.value || null }))}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">링크 URL</span>
                    <input
                      type="url"
                      value={form.cta_url ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, cta_url: e.target.value || null }))}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      placeholder="https://..."
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="mb-1 block text-sm font-medium text-slate-700">설명</span>
                  <textarea
                    value={form.description ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value || null }))}
                    rows={2}
                    className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                  />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">버튼 문구</span>
                    <input
                      type="text"
                      value={form.cta_text ?? ""}
                      onChange={(e) => setForm((f) => ({ ...f, cta_text: e.target.value || null }))}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      placeholder="자세히 보기"
                    />
                  </label>
                </div>
                <div className="flex flex-wrap items-end gap-4">
                  <label className="block">
                    <span className="mb-1 block text-sm font-medium text-slate-700">이미지 / GIF</span>
                    <input
                      type="file"
                      accept="image/*"
                      disabled={uploading}
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleImageChange(slot.id, f);
                      }}
                      className="block w-full text-sm text-slate-600 file:mr-2 file:rounded file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium"
                    />
                    {uploading && <span className="text-xs text-amber-600">업로드 중…</span>}
                    {form.image_url && (
                      <a href={form.image_url} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        <ImageUp className="h-3 w-3" /> 업로드됨
                      </a>
                    )}
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">
                      <Calendar className="h-4 w-4" /> 시작일
                    </span>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value }))}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-1 flex items-center gap-1 text-sm font-medium text-slate-700">종료일</span>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))}
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
                      onChange={(e) => setForm((f) => ({ ...f, sort_order: Number(e.target.value) || 0 }))}
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
                  <button type="button" onClick={cancelForm} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    취소
                  </button>
                </div>
              </form>
            )}
          </motion.section>
        );
      })}
    </div>
  );
}
