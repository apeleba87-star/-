"use client";



import { useRouter } from "next/navigation";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import RadarAdSlotPreview from "@/components/admin/RadarAdSlotPreview";
import RadarAdCtaField from "@/components/admin/RadarAdCtaField";
import RadarAdImageUpload, {
  type RadarAdImageUploadStatus,
} from "@/components/admin/RadarAdImageUpload";
import RadarAdArchiveExpiredButton from "@/components/admin/RadarAdArchiveExpiredButton";
import RadarAdRegionList from "@/components/admin/RadarAdRegionList";
import RadarAdRegionPicker from "@/components/admin/RadarAdRegionPicker";
import RadarAdSlotLifecycleBar, {
  RadarAdLifecycleNotice,
} from "@/components/admin/RadarAdSlotLifecycleBar";
import {
  getRadarSlotLifecyclePhase,
  isStaleActiveRadarSlot,
  RADAR_SLOT_LIFECYCLE_CLASS,
  RADAR_SLOT_LIFECYCLE_LABELS,
} from "@/lib/demand/radar-ad-slot-lifecycle";

import { DEFAULT_RADAR_AD_IMAGE_CROP } from "@/lib/demand/radar-ad-image-crop";
import { labelFromDemandRegionKey } from "@/lib/demand/regions";
import {
  countLiveRadarSlots,
  createRadarAdSlotRecord,
  formatRadarAdRegionShortLabel,
  RADAR_AD_SLOTS_PER_BANNER,
  radarAdSlotIndices,
} from "@/lib/demand/radar-ads-slot";

import {

  clampRadarAdCopy,

  RADAR_AD_COPY_LIMITS,

  RADAR_AD_IMAGE_SPEC,

  RADAR_AD_SLOT_CATEGORY_LABELS,

  radarAdCopyLength,

  type RadarAdCopyField,

  type RadarAdSlotCategory,

  type RadarAdSlotStatus,

} from "@/lib/demand/radar-ads-shared";

import { cn } from "@/lib/utils";

import {

  createRegionalBanner,

  updateRadarBannerSettings,

  uploadRadarAdImage,

  upsertRadarAdSlot,

  type RadarAdSlotInput,

} from "./actions";



const TODAY = new Date().toISOString().slice(0, 10);



type Banner = {

  id: string;

  scope: string;

  region_key: string | null;

  enabled: boolean;

  rotation_seconds: number;

};



type Slot = {

  id: string;

  banner_id: string;

  slot_index: number;

  category: string;

  title: string;

  description: string | null;

  image_url: string | null;

  image_crop_x: number;

  image_crop_y: number;

  image_crop_w: number;

  image_crop_h: number;

  cta_text: string;

  cta_url: string;

  advertiser_name: string | null;

  monthly_fee: number | null;

  memo: string | null;

  start_date: string;

  end_date: string;

  status: string;

};



function emptySlotForm(bannerId: string, slotIndex: number): RadarAdSlotInput {

  return {

    banner_id: bannerId,

    slot_index: slotIndex,

    category: "other",

    title: "",

    description: "",

    image_url: null,

    image_crop_x: DEFAULT_RADAR_AD_IMAGE_CROP.x,

    image_crop_y: DEFAULT_RADAR_AD_IMAGE_CROP.y,

    image_crop_w: DEFAULT_RADAR_AD_IMAGE_CROP.w,

    image_crop_h: DEFAULT_RADAR_AD_IMAGE_CROP.h,

    cta_text: "자세히",

    cta_url: "",

    advertiser_name: "",

    monthly_fee: 30000,

    memo: "",

    start_date: TODAY,

    end_date: TODAY,

    status: "draft",

  };

}



function slotToForm(slot: Slot): RadarAdSlotInput {

  return {

    banner_id: slot.banner_id,

    slot_index: slot.slot_index,

    category: slot.category as RadarAdSlotCategory,

    title: slot.title,

    description: slot.description ?? "",

    image_url: slot.image_url,

    image_crop_x: slot.image_crop_x,

    image_crop_y: slot.image_crop_y,

    image_crop_w: slot.image_crop_w,

    image_crop_h: slot.image_crop_h,

    cta_text: slot.cta_text,

    cta_url: slot.cta_url,

    advertiser_name: slot.advertiser_name ?? "",

    monthly_fee: slot.monthly_fee,

    memo: slot.memo ?? "",

    start_date: slot.start_date,

    end_date: slot.end_date,

    status: slot.status as RadarAdSlotStatus,

  };

}



function ImageSpecBox() {

  const s = RADAR_AD_IMAGE_SPEC;

  return (

    <details className="rounded-lg border border-amber-200 bg-amber-50/80 text-sm text-amber-950">

      <summary className="cursor-pointer px-4 py-3 font-semibold">광고 이미지 가이드</summary>

      <ul className="list-inside list-disc space-y-1 px-4 pb-4 text-xs leading-relaxed">

        <li>

          권장 <strong>{s.recommendedWidth}×{s.recommendedHeight}px</strong> ({s.aspectRatio} 가로 배너)

        </li>

        <li>

          최소 {s.minWidth}×{s.minHeight}px · {s.maxFileSizeKb}KB 이하 · {s.formatLabels}

        </li>

        <li>{s.safeZoneNote}</li>

        <li>

          문구 권장: 업체명 {RADAR_AD_COPY_LIMITS.advertiserName}자 · 제목{" "}

          {RADAR_AD_COPY_LIMITS.title}자(2줄) · 설명 {RADAR_AD_COPY_LIMITS.description}자(2줄) ·

          버튼 {RADAR_AD_COPY_LIMITS.ctaText}자

        </li>

      </ul>

    </details>

  );

}



function CopyFieldLabel({

  label,

  field,

  value,

  required,

  optional,

}: {

  label: string;

  field: RadarAdCopyField;

  value: string;

  required?: boolean;

  optional?: boolean;

}) {

  const max = RADAR_AD_COPY_LIMITS[field];

  const len = radarAdCopyLength(value);

  return (

    <span className="flex items-baseline justify-between gap-2">

      <span className={optional ? "text-slate-600" : "font-medium text-slate-700"}>

        {label}

        {required ? " *" : optional ? " (선택)" : ""}

      </span>

      <span

        className={cn(

          "tabular-nums text-[11px]",

          len >= max ? "font-medium text-amber-600" : "text-slate-400"

        )}

      >

        {len}/{max}

      </span>

    </span>

  );

}



function SlotEditor({

  form,

  slotKey,

  onChange,

  onSave,

  saving,

  message,

  onUpload,

  imageUploadStatus,

  imageUploadError,

  onImageRemove,

  previewBadgeLabel,

  today,

  onLifecycleApply,

  lifecycleSaving,

}: {

  form: RadarAdSlotInput;

  slotKey: string;

  previewBadgeLabel: string;

  today: string;

  onChange: (patch: Partial<RadarAdSlotInput>) => void;

  onSave: () => void;

  onLifecycleApply: (patch: Partial<RadarAdSlotInput>) => void;

  lifecycleSaving?: boolean;

  saving: boolean;

  message: string | null;

  onUpload: (file: File) => void;

  imageUploadStatus: RadarAdImageUploadStatus;

  imageUploadError: string | null;

  onImageRemove: () => void;

}) {

  return (

    <div className="space-y-4">

      <RadarAdSlotLifecycleBar
        form={form}
        today={today}
        disabled={lifecycleSaving || saving}
        onApply={onLifecycleApply}
      />

      <RadarAdSlotPreview
        form={form}
        badgeLabel={previewBadgeLabel}
        onCropChange={(crop) =>
          onChange({
            image_crop_x: crop.x,
            image_crop_y: crop.y,
            image_crop_w: crop.w,
            image_crop_h: crop.h,
          })
        }
      />



      <div className="grid gap-3 sm:grid-cols-2">

        <label className="block text-xs sm:col-span-2">

          <CopyFieldLabel label="업체명" field="advertiserName" value={form.advertiser_name} />

          <input

            className="input mt-1 w-full text-sm"

            placeholder="예: ○○폐기물"

            value={form.advertiser_name}

            maxLength={RADAR_AD_COPY_LIMITS.advertiserName}

            onChange={(e) =>

              onChange({ advertiser_name: clampRadarAdCopy("advertiserName", e.target.value) })

            }

          />

        </label>

        <label className="block text-xs sm:col-span-2">

          <CopyFieldLabel label="제목" field="title" value={form.title} required />

          <input

            className="input mt-1 w-full text-sm"

            placeholder="핵심 한 줄 (모바일 2줄까지)"

            value={form.title}

            maxLength={RADAR_AD_COPY_LIMITS.title}

            onChange={(e) => onChange({ title: clampRadarAdCopy("title", e.target.value) })}

            required

          />

        </label>

        <label className="block text-xs sm:col-span-2">

          <CopyFieldLabel label="설명" field="description" value={form.description} optional />

          <textarea

            className="input mt-1 w-full text-sm"

            rows={2}

            placeholder="부가 설명 (2줄 이내 권장)"

            value={form.description}

            maxLength={RADAR_AD_COPY_LIMITS.description}

            onChange={(e) =>

              onChange({ description: clampRadarAdCopy("description", e.target.value) })

            }

          />

        </label>

        <RadarAdCtaField

          slotKey={slotKey}

          ctaUrl={form.cta_url}

          onChange={(url) => onChange({ cta_url: url })}

        />

        <RadarAdImageUpload

          imageUrl={form.image_url}

          status={imageUploadStatus}

          errorMessage={imageUploadError}

          onUpload={onUpload}

          onRemove={onImageRemove}

        />



        <label className="block text-xs">

          <span className="font-medium text-slate-700">게재 상태</span>

          <select

            className="input mt-1 w-full text-sm"

            value={form.status}

            onChange={(e) => onChange({ status: e.target.value as RadarAdSlotStatus })}

          >

            <option value="draft">초안 (미노출·보관)</option>

            <option value="active">게재 (입금 확인 후)</option>

            <option value="paused">중지 (해지·일시중단)</option>

          </select>

          <span className="mt-1 block text-[11px] text-slate-400">
            빠른 처리는 위 「중지」「종료 보관」 버튼을 사용하세요. 슬롯은 삭제하지 않습니다.
          </span>

        </label>

        <label className="block text-xs">

          <CopyFieldLabel label="버튼 문구" field="ctaText" value={form.cta_text} />

          <input

            className="input mt-1 w-full text-sm"

            placeholder="자세히"

            value={form.cta_text}

            maxLength={RADAR_AD_COPY_LIMITS.ctaText}

            onChange={(e) => onChange({ cta_text: clampRadarAdCopy("ctaText", e.target.value) })}

          />

        </label>

        <label className="block text-xs">

          <span className="text-slate-600">노출 기간</span>

          <div className="mt-1 flex items-center gap-1">

            <input

              type="date"

              className="input w-full text-sm"

              value={form.start_date}

              onChange={(e) => onChange({ start_date: e.target.value })}

            />

            <span className="text-slate-400">~</span>

            <input

              type="date"

              className="input w-full text-sm"

              value={form.end_date}

              onChange={(e) => onChange({ end_date: e.target.value })}

            />

          </div>

        </label>

      </div>



      <details className="rounded-lg border border-slate-200 bg-slate-50/50">

        <summary className="cursor-pointer px-4 py-2.5 text-sm font-medium text-slate-700">

          정산·메모 (선택)

        </summary>

        <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">

          <label className="block text-xs sm:col-span-2">

            <span className="text-slate-600">내部分류 (선택)</span>

            <select

              className="input mt-1 w-full text-sm"

              value={form.category}

              onChange={(e) => onChange({ category: e.target.value as RadarAdSlotCategory })}

            >

              {(Object.keys(RADAR_AD_SLOT_CATEGORY_LABELS) as RadarAdSlotCategory[]).map((k) => (

                <option key={k} value={k}>

                  {RADAR_AD_SLOT_CATEGORY_LABELS[k]}

                </option>

              ))}

            </select>

            <span className="mt-1 block text-[11px] text-slate-400">

              화면에 노출되지 않습니다. 정산·통계용으로만 사용합니다.

            </span>

          </label>

          <label className="block text-xs">

            <span className="text-slate-600">월 이용료(원)</span>

            <input

              type="number"

              className="input mt-1 w-full text-sm"

              value={form.monthly_fee ?? ""}

              onChange={(e) =>

                onChange({

                  monthly_fee: e.target.value ? Number(e.target.value) : null,

                })

              }

            />

          </label>

          <label className="block text-xs sm:col-span-2">

            <span className="text-slate-600">메모 (정산·입금)</span>

            <input

              className="input mt-1 w-full text-sm"

              placeholder="입금일, 담당자 등"

              value={form.memo}

              onChange={(e) => onChange({ memo: e.target.value })}

            />

          </label>

        </div>

      </details>



      <div className="flex flex-wrap items-center gap-3">

        <button

          type="button"

          className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"

          disabled={saving}

          onClick={onSave}

        >

          {saving ? "저장 중…" : "이 슬롯 저장"}

        </button>

        {message ? (

          <span className={cn("text-sm", message.includes("실패") || message.includes("오류") ? "text-red-600" : "text-emerald-700")}>

            {message}

          </span>

        ) : null}

      </div>

    </div>

  );

}



function BannerPanel({

  banner,

  slots,

  title,

  subtitle,

  initialActiveTab = 1,

  today,

}: {

  banner: Banner;

  slots: Slot[];

  title: string;

  subtitle?: string;

  initialActiveTab?: number;

  today: string;

}) {

  const router = useRouter();

  const [enabled, setEnabled] = useState(banner.enabled);

  const [rotation, setRotation] = useState(banner.rotation_seconds);

  const [settingsSaving, setSettingsSaving] = useState(false);

  const [activeTab, setActiveTab] = useState(initialActiveTab);

  const [forms, setForms] = useState<Record<number, RadarAdSlotInput>>(() => {

    const init: Record<number, RadarAdSlotInput> = {};

    for (const i of radarAdSlotIndices()) {

      const existing = slots.find((s) => s.slot_index === i);

      init[i] = existing ? slotToForm(existing) : emptySlotForm(banner.id, i);

    }

    return init;

  });

  const [messages, setMessages] = useState<Record<number, string | null>>(() =>
    createRadarAdSlotRecord(() => null)
  );

  const [savingSlots, setSavingSlots] = useState<Record<number, boolean>>(() =>
    createRadarAdSlotRecord(() => false)
  );

  const idleImageUpload = { status: "idle" as RadarAdImageUploadStatus, error: null as string | null };

  const [imageUploadBySlot, setImageUploadBySlot] = useState<

    Record<number, { status: RadarAdImageUploadStatus; error: string | null }>

  >(() => createRadarAdSlotRecord(() => idleImageUpload));

  const [batchSaving, setBatchSaving] = useState(false);

  const [lifecycleSaving, setLifecycleSaving] = useState(false);



  // 지역·배너 전환 시에만 서버 데이터로 초기화 (slots 참조 변경 시 리셋 금지)
  useEffect(() => {

    const next: Record<number, RadarAdSlotInput> = {};

    for (const i of radarAdSlotIndices()) {

      const existing = slots.find((s) => s.slot_index === i);

      next[i] = existing ? slotToForm(existing) : emptySlotForm(banner.id, i);

    }

    setForms(next);

    setMessages(createRadarAdSlotRecord(() => null));

    setImageUploadBySlot(createRadarAdSlotRecord(() => idleImageUpload));

  }, [banner.id]);

  useEffect(() => {

    if (initialActiveTab != null) setActiveTab(initialActiveTab);

  }, [initialActiveTab]);



  async function saveSettings() {

    setSettingsSaving(true);

    await updateRadarBannerSettings(banner.id, enabled, rotation);

    setSettingsSaving(false);

    router.refresh();

  }



  const saveSlot = useCallback(

    async (slotIndex: number) => {

      setSavingSlots((s) => ({ ...s, [slotIndex]: true }));

      setMessages((m) => ({ ...m, [slotIndex]: null }));

      const res = await upsertRadarAdSlot(forms[slotIndex]!);

      setSavingSlots((s) => ({ ...s, [slotIndex]: false }));

      if (res.ok) {

        setMessages((m) => ({ ...m, [slotIndex]: res.notice ?? "저장됨" }));

        if (res.notice) {
          setForms((f) => ({
            ...f,
            [slotIndex]: { ...f[slotIndex]!, status: "paused" },
          }));
        }

        router.refresh();

      } else {

        setMessages((m) => ({ ...m, [slotIndex]: res.error ?? "저장 실패" }));

      }

    },

    [forms, router]

  );



  const applyLifecycle = useCallback(

    async (slotIndex: number, patch: Partial<RadarAdSlotInput>) => {

      const next = { ...forms[slotIndex]!, ...patch };

      setForms((f) => ({ ...f, [slotIndex]: next }));

      setLifecycleSaving(true);

      setMessages((m) => ({ ...m, [slotIndex]: null }));

      const res = await upsertRadarAdSlot(next);

      setLifecycleSaving(false);

      if (res.ok) {

        setMessages((m) => ({ ...m, [slotIndex]: res.notice ?? "상태가 저장되었습니다." }));

        router.refresh();

      } else {

        setMessages((m) => ({ ...m, [slotIndex]: res.error ?? "저장 실패" }));

      }

    },

    [forms, router]

  );



  async function saveAllSlots() {

    setBatchSaving(true);

    const results = await Promise.all(
      radarAdSlotIndices().map((i) => upsertRadarAdSlot(forms[i]!))
    );

    setBatchSaving(false);

    const failed = results.find((r) => !r.ok);

    if (failed) {

      setMessages((m) => ({ ...m, [activeTab]: failed.error ?? "일부 저장 실패" }));

    } else {

      setMessages(createRadarAdSlotRecord(() => "저장됨"));

      router.refresh();

    }

  }



  async function onUpload(slotIndex: number, file: File) {

    setImageUploadBySlot((s) => ({

      ...s,

      [slotIndex]: { status: "uploading", error: null },

    }));

    const fd = new FormData();

    fd.set("file", file);

    const res = await uploadRadarAdImage(fd);

    if (res.ok) {

      setForms((f) => ({
        ...f,
        [slotIndex]: {
          ...f[slotIndex]!,
          image_url: res.url,
          image_crop_x: DEFAULT_RADAR_AD_IMAGE_CROP.x,
          image_crop_y: DEFAULT_RADAR_AD_IMAGE_CROP.y,
          image_crop_w: DEFAULT_RADAR_AD_IMAGE_CROP.w,
          image_crop_h: DEFAULT_RADAR_AD_IMAGE_CROP.h,
        },
      }));

      setImageUploadBySlot((s) => ({

        ...s,

        [slotIndex]: { status: "success", error: null },

      }));

    } else {

      setImageUploadBySlot((s) => ({

        ...s,

        [slotIndex]: { status: "error", error: res.error ?? "업로드에 실패했습니다." },

      }));

    }

  }

  function onImageRemove(slotIndex: number) {

    setForms((f) => ({
      ...f,
      [slotIndex]: {
        ...f[slotIndex]!,
        image_url: null,
        image_crop_x: DEFAULT_RADAR_AD_IMAGE_CROP.x,
        image_crop_y: DEFAULT_RADAR_AD_IMAGE_CROP.y,
        image_crop_w: DEFAULT_RADAR_AD_IMAGE_CROP.w,
        image_crop_h: DEFAULT_RADAR_AD_IMAGE_CROP.h,
      },
    }));

    setImageUploadBySlot((s) => ({

      ...s,

      [slotIndex]: { status: "idle", error: null },

    }));

  }



  const activeForm = forms[activeTab]!;

  const previewBadgeLabel =

    banner.scope === "national"

      ? "전국 제휴"

      : banner.region_key

        ? `${formatRadarAdRegionShortLabel(banner.region_key)} 지역 광고`

        : "지역 광고";

  return (

    <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">

      <RadarAdLifecycleNotice />

      <div className="flex flex-wrap items-start justify-between gap-3">

        <div>

          <h2 className="text-lg font-bold text-slate-900">{title}</h2>

          {subtitle ? <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p> : null}

        </div>

        <div className="flex flex-wrap items-center gap-3 rounded-lg bg-slate-50 px-3 py-2">

          <label className="flex items-center gap-2 text-sm">

            <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />

            배너 노출

          </label>

          <label className="flex items-center gap-2 text-sm">

            로테이션

            <input

              type="number"

              min={5}

              max={60}

              className="input w-14 text-sm"

              value={rotation}

              onChange={(e) => setRotation(Number(e.target.value))}

            />

            초

          </label>

          <button

            type="button"

            className="rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-white"

            disabled={settingsSaving}

            onClick={() => void saveSettings()}

          >

            {settingsSaving ? "저장 중…" : "설정 저장"}

          </button>

        </div>

      </div>



      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-1">

        <div className="flex flex-wrap gap-1">

          {radarAdSlotIndices().map((i) => {

            const f = forms[i]!;

            const phase = getRadarSlotLifecyclePhase(
              { status: f.status, start_date: f.start_date, end_date: f.end_date },
              today
            );

            return (

              <button

                key={i}

                type="button"

                onClick={() => setActiveTab(i)}

                className={cn(

                  "flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-medium transition-colors",

                  activeTab === i

                    ? "border border-b-0 border-slate-200 bg-white text-slate-900"

                    : "text-slate-600 hover:bg-slate-50"

                )}

              >

                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                    RADAR_SLOT_LIFECYCLE_CLASS[phase]
                  )}
                >
                  {RADAR_SLOT_LIFECYCLE_LABELS[phase]}
                </span>

                슬롯 {i}

                {f.title ? (
                  <span className="hidden max-w-[120px] truncate text-xs font-normal text-slate-500 sm:inline">
                    · {f.title}
                  </span>
                ) : null}

              </button>

            );

          })}

        </div>

        <button

          type="button"

          className="rounded-lg border border-teal-600 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-50"

          disabled={batchSaving}

          onClick={() => void saveAllSlots()}

        >

          {batchSaving ? "저장 중…" : `${RADAR_AD_SLOTS_PER_BANNER}개 슬롯 모두 저장`}

        </button>

      </div>



      <SlotEditor

        form={activeForm}

        slotKey={`${banner.id}-${activeTab}`}

        today={today}

        onChange={(patch) =>

          setForms((f) => ({ ...f, [activeTab]: { ...f[activeTab]!, ...patch } }))

        }

        onLifecycleApply={(patch) => void applyLifecycle(activeTab, patch)}

        lifecycleSaving={lifecycleSaving}

        onSave={() => void saveSlot(activeTab)}

        saving={savingSlots[activeTab] ?? false}

        message={messages[activeTab] ?? null}

        onUpload={(file) => void onUpload(activeTab, file)}

        imageUploadStatus={imageUploadBySlot[activeTab]?.status ?? "idle"}

        imageUploadError={imageUploadBySlot[activeTab]?.error ?? null}

        onImageRemove={() => onImageRemove(activeTab)}

        previewBadgeLabel={previewBadgeLabel}

      />

    </section>

  );

}



function RegionalBannerSection({

  regionalBanners,

  regionalSlotsByBannerId,

  today,

  initialBannerId,

  initialSlotIndex,

}: {

  regionalBanners: Banner[];

  regionalSlotsByBannerId: Record<string, Slot[]>;

  today: string;

  initialBannerId?: string | null;

  initialSlotIndex?: number;

}) {

  const router = useRouter();

  const initialSelect =
    initialBannerId && regionalBanners.some((b) => b.id === initialBannerId)
      ? initialBannerId
      : (regionalBanners[0]?.id ?? null);

  const [selectedId, setSelectedId] = useState<string | null>(initialSelect);

  const [msg, setMsg] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);

  const pendingSelectId = useRef<string | null>(null);



  const registeredKeys = useMemo(

    () => new Set(regionalBanners.map((b) => b.region_key).filter(Boolean) as string[]),

    [regionalBanners]

  );



  useEffect(() => {

    if (selectedId && regionalBanners.some((b) => b.id === selectedId)) return;

    setSelectedId(regionalBanners[0]?.id ?? null);

  }, [regionalBanners, selectedId]);



  useEffect(() => {

    if (pendingSelectId.current && regionalBanners.some((b) => b.id === pendingSelectId.current)) {

      setSelectedId(pendingSelectId.current);

      pendingSelectId.current = null;

    }

  }, [regionalBanners]);



  async function onCreateRegion(regionKey: string) {

    setMsg(null);

    setCreating(true);

    const res = await createRegionalBanner(regionKey);

    setCreating(false);

    if (res.ok) {

      setMsg(`${labelFromDemandRegionKey(regionKey)} 배너가 추가되었습니다.`);

      if (res.bannerId) pendingSelectId.current = res.bannerId;

      router.refresh();

    } else {

      setMsg(res.error ?? "추가 실패");

    }

  }



  const selectedBanner = regionalBanners.find((b) => b.id === selectedId) ?? null;



  return (

    <section className="space-y-4">

      <div>

        <p className="text-sm text-slate-600">

          입주레이더에서 해당 지역을 선택한 사용자에게만 노출됩니다. 지역·배너당 슬롯 {RADAR_AD_SLOTS_PER_BANNER}
          개(로테이션)를 편집하세요.

        </p>

      </div>



      <div className="grid gap-4 lg:grid-cols-[minmax(220px,280px)_1fr]">

        <div className="space-y-3">
          <RadarAdRegionList
            regionalBanners={regionalBanners}
            regionalSlotsByBannerId={regionalSlotsByBannerId}
            today={today}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onAdd={(key) => void onCreateRegion(key)}
            adding={creating}
          />

          <details className="rounded-lg border border-slate-200 bg-slate-50/50 text-sm">
            <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-slate-600">
              시·도·구 드롭다운으로 추가
            </summary>
            <div className="border-t border-slate-200 p-3">
              <RadarAdRegionPicker
                disabledKeys={registeredKeys}
                disabled={creating}
                confirmLabel={creating ? "추가 중…" : "지역 추가"}
                onConfirm={(key) => void onCreateRegion(key)}
                className="border-0 bg-transparent p-0"
              />
            </div>
          </details>

          {msg ? <p className="text-xs text-slate-600">{msg}</p> : null}
        </div>



        <div>

          {selectedBanner ? (

            <BannerPanel

              banner={selectedBanner}

              slots={regionalSlotsByBannerId[selectedBanner.id] ?? []}

              today={today}

              title={

                selectedBanner.region_key

                  ? formatRadarAdRegionShortLabel(selectedBanner.region_key)

                  : "지역 배너"

              }

              subtitle={`지표 카드 아래 · 해당 지역 선택 시 노출 · 슬롯 ${RADAR_AD_SLOTS_PER_BANNER}개 로테이션`}

              initialActiveTab={

                selectedBanner.id === initialBannerId ? initialSlotIndex : undefined

              }

            />

          ) : (

            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center text-sm text-slate-500">

              왼쪽에서 지역을 선택하거나 새 지역을 추가하세요.

            </div>

          )}

        </div>

      </div>

    </section>

  );

}



type BannerScopeTab = "national" | "regional";

export default function RadarAdsManager({

  nationalBanner,

  nationalSlots,

  regionalBanners,

  regionalSlotsByBannerId,

  today,

  initialRegionalBannerId,

  initialSlotIndex,

  initialScope = "national",

}: {

  nationalBanner: Banner | null;

  nationalSlots: Slot[];

  regionalBanners: Banner[];

  regionalSlotsByBannerId: Record<string, Slot[]>;

  today: string;

  initialRegionalBannerId?: string | null;

  initialSlotIndex?: number;

  initialScope?: BannerScopeTab;

}) {

  const [scopeTab, setScopeTab] = useState<BannerScopeTab>(initialScope);

  useEffect(() => {
    setScopeTab(initialScope);
  }, [initialScope]);

  const nationalLiveCount = countLiveRadarSlots(nationalSlots, today);

  const staleActiveCount = useMemo(() => {
    const allSlots = [
      ...nationalSlots,
      ...Object.values(regionalSlotsByBannerId).flat(),
    ];
    return allSlots.filter((s) => isStaleActiveRadarSlot(s, today)).length;
  }, [nationalSlots, regionalSlotsByBannerId, today]);

  const nationalInitialTab =

    nationalBanner && initialRegionalBannerId === nationalBanner.id

      ? initialSlotIndex

      : undefined;

  return (

    <div className="space-y-6">

      <RadarAdArchiveExpiredButton count={staleActiveCount} />

      <ImageSpecBox />

      <div className="flex flex-wrap gap-1 border-b border-slate-200">

        <button

          type="button"

          onClick={() => setScopeTab("national")}

          className={cn(

            "rounded-t-lg px-5 py-2.5 text-sm font-medium transition-colors",

            scopeTab === "national"

              ? "border border-b-0 border-slate-200 bg-white text-slate-900"

              : "text-slate-600 hover:bg-slate-50"

          )}

        >

          전체 광고

          {nationalLiveCount > 0 ? (

            <span className="ml-1.5 text-xs font-normal text-teal-700">({nationalLiveCount})</span>

          ) : null}

        </button>

        <button

          type="button"

          onClick={() => setScopeTab("regional")}

          className={cn(

            "rounded-t-lg px-5 py-2.5 text-sm font-medium transition-colors",

            scopeTab === "regional"

              ? "border border-b-0 border-slate-200 bg-white text-slate-900"

              : "text-slate-600 hover:bg-slate-50"

          )}

        >

          지역 광고

          {regionalBanners.length > 0 ? (

            <span className="ml-1.5 text-xs font-normal text-slate-500">

              ({regionalBanners.length}지역)

            </span>

          ) : null}

        </button>

      </div>

      {scopeTab === "national" ? (

        nationalBanner ? (

          <BannerPanel

            banner={nationalBanner}

            slots={nationalSlots}

            today={today}

            title="전체 광고"

            subtitle={`펄스 아래 · 전국 노출 · 슬롯 ${RADAR_AD_SLOTS_PER_BANNER}개 로테이션`}

            initialActiveTab={nationalInitialTab}

          />

        ) : (

          <p className="text-sm text-amber-800">

            전국 배너가 없습니다. Supabase migration 161을 적용하세요.

          </p>

        )

      ) : (

        <RegionalBannerSection

          regionalBanners={regionalBanners}

          regionalSlotsByBannerId={regionalSlotsByBannerId}

          today={today}

          initialBannerId={initialRegionalBannerId}

          initialSlotIndex={initialSlotIndex}

        />

      )}

    </div>

  );

}


