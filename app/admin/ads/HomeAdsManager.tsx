"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AdPlacementMap from "@/components/admin/ads/AdPlacementMap";
import type { EditorCampaign, EditorSlot } from "@/components/admin/ads/HomeAdSlotEditor";
import type { AdPlacementSurfaceId } from "@/lib/admin/ad-slot-placement";
import type { CoupangSlotConfig } from "@/lib/coupang-partners/types";
import {
  toggleSlotEnabled,
  updateSlotTypeAndScript,
  updateSlotFallback,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  uploadAdImage,
  type CampaignInput,
  type SlotType,
} from "./actions";

const TODAY = new Date().toISOString().slice(0, 10);

type CoupangCacheInfo = {
  fetched_at: string | null;
  fetch_error: string | null;
  product_count: number;
};

export default function HomeAdsManager({
  slots,
  campaigns,
  coupangCacheByKey = {},
  coupangConfigBySlotId = {},
  coupangApiConfigured = false,
}: {
  slots: EditorSlot[];
  campaigns: EditorCampaign[];
  coupangCacheByKey?: Record<string, CoupangCacheInfo>;
  coupangConfigBySlotId?: Record<string, CoupangSlotConfig | null>;
  coupangApiConfigured?: boolean;
}) {
  const router = useRouter();
  const [surfaceId, setSurfaceId] = useState<AdPlacementSurfaceId>("demand");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingSlotId, setAddingSlotId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [scriptDrafts, setScriptDrafts] = useState<Record<string, string>>({});
  const [fallbackDrafts, setFallbackDrafts] = useState<Record<string, string>>({});
  const [fallbackTypes, setFallbackTypes] = useState<Record<string, "google" | "coupang" | "">>({});
  const [savingScriptSlotId, setSavingScriptSlotId] = useState<string | null>(null);
  const [savingFallbackSlotId, setSavingFallbackSlotId] = useState<string | null>(null);
  const [slotSearch, setSlotSearch] = useState("");

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

  function startEdit(c: EditorCampaign) {
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
    if (res.ok) router.refresh();
  }

  async function handleSlotTypeChange(slotId: string, slot_type: SlotType) {
    const res = await updateSlotTypeAndScript(slotId, slot_type, null);
    setMessage(res.ok ? { ok: true, text: "광고 유형이 저장되었습니다." } : { ok: false, text: res.error ?? "실패" });
    if (res.ok) {
      setScriptDrafts((d) => ({ ...d, [slotId]: "" }));
      router.refresh();
    }
  }

  async function handleSaveScript(slotId: string, slot_type: SlotType, script_content: string) {
    setSavingScriptSlotId(slotId);
    setMessage(null);
    const res = await updateSlotTypeAndScript(slotId, slot_type, script_content.trim() || null);
    setSavingScriptSlotId(null);
    setMessage(res.ok ? { ok: true, text: "스크립트가 저장되었습니다." } : { ok: false, text: res.error ?? "실패" });
    if (res.ok) {
      setScriptDrafts((d) => ({ ...d, [slotId]: "" }));
      router.refresh();
    }
  }

  async function handleSaveFallback(slotId: string) {
    const fbType = fallbackTypes[slotId] ?? "";
    const script = fallbackDrafts[slotId] ?? "";
    setSavingFallbackSlotId(slotId);
    setMessage(null);
    const res = await updateSlotFallback(
      slotId,
      fbType === "google" || fbType === "coupang" ? fbType : null,
      script
    );
    setSavingFallbackSlotId(null);
    setMessage(res.ok ? { ok: true, text: "대체 광고가 저장되었습니다." } : { ok: false, text: res.error ?? "실패" });
    if (res.ok) router.refresh();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (editingId) {
      const res = await updateCampaign(editingId, form);
      setMessage(res.ok ? { ok: true, text: "수정되었습니다." } : { ok: false, text: res.error ?? "실패" });
      if (res.ok) {
        cancelForm();
        router.refresh();
      }
    } else {
      const res = await createCampaign(form);
      setMessage(res.ok ? { ok: true, text: "추가되었습니다." } : { ok: false, text: res.error ?? "실패" });
      if (res.ok) {
        cancelForm();
        router.refresh();
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("이 광고를 삭제할까요?")) return;
    const res = await deleteCampaign(id);
    setMessage(res.ok ? { ok: true, text: "삭제되었습니다." } : { ok: false, text: res.error ?? "실패" });
    if (res.ok) {
      cancelForm();
      router.refresh();
    }
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
    <div className="space-y-6">
      {message ? (
        <p className={message.ok ? "text-sm text-green-600" : "text-sm text-red-600"}>{message.text}</p>
      ) : null}

      <AdPlacementMap
        surfaceId={surfaceId}
        onSurfaceChange={setSurfaceId}
        slots={slots}
        campaigns={campaigns}
        slotSearch={slotSearch}
        onSlotSearchChange={setSlotSearch}
        coupangCacheByKey={coupangCacheByKey}
        coupangConfigBySlotId={coupangConfigBySlotId}
        coupangApiConfigured={coupangApiConfigured}
        editor={{
          scriptDrafts,
          fallbackDrafts,
          fallbackTypes,
          savingScriptSlotId,
          savingFallbackSlotId,
          uploading,
          form,
          editingId,
          addingSlotId,
          onToggle: handleToggle,
          onSlotTypeChange: handleSlotTypeChange,
          onScriptDraftChange: (slotId, v) => setScriptDrafts((d) => ({ ...d, [slotId]: v })),
          onSaveScript: handleSaveScript,
          onFallbackTypeChange: (slotId, t) => setFallbackTypes((d) => ({ ...d, [slotId]: t })),
          onFallbackDraftChange: (slotId, v) => setFallbackDrafts((d) => ({ ...d, [slotId]: v })),
          onSaveFallback: handleSaveFallback,
          onStartAdd: startAdd,
          onStartEdit: startEdit,
          onDeleteCampaign: handleDelete,
          onSubmitForm: handleSubmit,
          onCancelForm: cancelForm,
          onFormChange: (patch) => setForm((f) => ({ ...f, ...patch })),
          onImageChange: handleImageChange,
        }}
      />
    </div>
  );
}
