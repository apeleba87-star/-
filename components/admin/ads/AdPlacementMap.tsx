"use client";

import Link from "next/link";
import {
  AD_PLACEMENT_SURFACES,
  getAdPlacementSurface,
  getAdPlacementSurfacesForTabs,
  type AdPlacementBlock,
  type AdPlacementSurfaceId,
} from "@/lib/admin/ad-slot-placement";
import HomeAdSlotEditor, { type EditorCampaign, type EditorSlot } from "@/components/admin/ads/HomeAdSlotEditor";
import type { CoupangSlotConfig } from "@/lib/coupang-partners/types";
import type { CampaignInput, SlotType } from "@/app/admin/ads/actions";
import { summarizeAdSlotStatus } from "@/components/admin/ads/ad-slot-status";
import { cn } from "@/lib/utils";

type CoupangCacheInfo = {
  fetched_at: string | null;
  fetch_error: string | null;
  product_count: number;
};

type SlotEditorBindings = {
  scriptDrafts: Record<string, string>;
  fallbackDrafts: Record<string, string>;
  fallbackTypes: Record<string, "google" | "coupang" | "">;
  savingScriptSlotId: string | null;
  savingFallbackSlotId: string | null;
  uploading: boolean;
  form: CampaignInput;
  editingId: string | null;
  addingSlotId: string | null;
  onToggle: (slotId: string, enabled: boolean) => void;
  onSlotTypeChange: (slotId: string, type: SlotType) => void;
  onScriptDraftChange: (slotId: string, v: string) => void;
  onSaveScript: (slotId: string, type: SlotType, script: string) => void;
  onFallbackTypeChange: (slotId: string, t: "google" | "coupang" | "") => void;
  onFallbackDraftChange: (slotId: string, v: string) => void;
  onSaveFallback: (slotId: string) => void;
  onStartAdd: (slotId: string) => void;
  onStartEdit: (c: EditorCampaign) => void;
  onDeleteCampaign: (id: string) => void;
  onSubmitForm: (e: React.FormEvent) => void;
  onCancelForm: () => void;
  onFormChange: (patch: Partial<CampaignInput>) => void;
  onImageChange: (slotId: string, file: File) => void;
};

type Props = {
  surfaceId: AdPlacementSurfaceId;
  onSurfaceChange: (id: AdPlacementSurfaceId) => void;
  slots: EditorSlot[];
  campaigns: EditorCampaign[];
  slotSearch: string;
  onSlotSearchChange: (q: string) => void;
  coupangCacheByKey: Record<string, CoupangCacheInfo>;
  coupangConfigBySlotId: Record<string, CoupangSlotConfig | null>;
  coupangApiConfigured: boolean;
  editor: SlotEditorBindings;
};

function WireframeChrome({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-center text-xs font-medium text-slate-400">
      {label}
    </div>
  );
}

function RadarDirectBlock({ block }: { block: AdPlacementBlock }) {
  return (
    <div className="rounded-xl border border-slate-300 bg-slate-100/90 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">입주레이더 직거래</p>
          <p className="mt-0.5 text-sm font-bold text-slate-800">{block.label}</p>
          {block.detail ? <p className="mt-0.5 text-xs text-slate-600">{block.detail}</p> : null}
        </div>
        {block.radarDirectHref ? (
          <Link
            href={block.radarDirectHref}
            className="shrink-0 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-700"
          >
            직거래 관리 →
          </Link>
        ) : null}
      </div>
      <p className="mt-2 text-[10px] text-slate-500">이 자리는 /admin/radar-ads 에서 편집합니다.</p>
    </div>
  );
}

function renderSlotEditor(
  slot: EditorSlot | undefined,
  block: AdPlacementBlock,
  surface: { pagePath: string; previewHref?: string },
  campaigns: EditorCampaign[],
  props: Props
) {
  if (!slot) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <p className="font-semibold">{block.label}</p>
        <p className="mt-1 text-xs">
          DB에 슬롯 <code className="font-mono">{block.slotKey}</code> 이 없습니다.{" "}
          <code className="font-mono text-[11px]">npx tsx scripts/ensure-demand-hub-ad-slots.ts</code> 실행.
        </p>
      </div>
    );
  }

  const { editor } = props;
  return (
    <HomeAdSlotEditor
      slot={slot}
      placement={block}
      pagePath={surface.pagePath}
      previewHref={surface.previewHref}
      campaigns={campaigns}
      coupangCache={props.coupangCacheByKey[slot.key] ?? null}
      coupangConfig={props.coupangConfigBySlotId[slot.id] ?? null}
      coupangApiConfigured={props.coupangApiConfigured}
      compact
      defaultExpanded={false}
      scriptDraft={editor.scriptDrafts[slot.id] ?? slot.script_content ?? ""}
      fallbackDraft={editor.fallbackDrafts[slot.id] ?? slot.fallback_script_content ?? ""}
      fallbackType={editor.fallbackTypes[slot.id] ?? slot.fallback_type ?? ""}
      savingScript={editor.savingScriptSlotId === slot.id}
      savingFallback={editor.savingFallbackSlotId === slot.id}
      uploading={editor.uploading}
      form={editor.form}
      editingId={editor.editingId}
      addingSlotId={editor.addingSlotId}
      onToggle={(enabled) => editor.onToggle(slot.id, enabled)}
      onSlotTypeChange={(type) => editor.onSlotTypeChange(slot.id, type)}
      onScriptDraftChange={(v) => editor.onScriptDraftChange(slot.id, v)}
      onSaveScript={() =>
        editor.onSaveScript(
          slot.id,
          (slot.slot_type ?? "direct") as SlotType,
          editor.scriptDrafts[slot.id] ?? slot.script_content ?? ""
        )
      }
      onFallbackTypeChange={(t) => editor.onFallbackTypeChange(slot.id, t)}
      onFallbackDraftChange={(v) => editor.onFallbackDraftChange(slot.id, v)}
      onSaveFallback={() => editor.onSaveFallback(slot.id)}
      onStartAdd={() => editor.onStartAdd(slot.id)}
      onStartEdit={editor.onStartEdit}
      onDeleteCampaign={editor.onDeleteCampaign}
      onSubmitForm={editor.onSubmitForm}
      onCancelForm={editor.onCancelForm}
      onFormChange={editor.onFormChange}
      onImageChange={(file) => editor.onImageChange(slot.id, file)}
    />
  );
}

function SurfaceWireframe({ surfaceId, props }: { surfaceId: AdPlacementSurfaceId; props: Props }) {
  const surface = getAdPlacementSurface(surfaceId);
  if (!surface) return null;

  const slotByKey = new Map(props.slots.map((s) => [s.key, s]));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-900">{surface.pageLabel}</p>
          <p className="text-xs text-slate-500">
            경로 <code className="text-slate-600">{surface.pagePath}</code>
          </p>
        </div>
        {surface.previewHref ? (
          <a
            href={surface.previewHref}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            페이지 열기 ↗
          </a>
        ) : null}
      </div>

      <div className="relative space-y-2 rounded-2xl border-2 border-slate-200 bg-white p-4 shadow-inner">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">화면 위 → 아래</p>
        {surface.blocks.map((block) => {
          if (block.kind === "chrome") {
            return <WireframeChrome key={block.id} label={block.label} />;
          }
          if (block.kind === "radar_direct") {
            return <RadarDirectBlock key={block.id} block={block} />;
          }
          const slot = block.slotKey ? slotByKey.get(block.slotKey) : undefined;
          return (
            <div key={block.id}>{renderSlotEditor(slot, block, surface, props.campaigns, props)}</div>
          );
        })}
      </div>
    </div>
  );
}

function AllSlotsList({ props }: { props: Props }) {
  const q = props.slotSearch.trim().toLowerCase();
  const registeredKeys = new Set(
    AD_PLACEMENT_SURFACES.flatMap((s) =>
      s.blocks.filter((b) => b.slotKey).map((b) => b.slotKey as string)
    )
  );

  const grouped = getAdPlacementSurfacesForTabs().map((surface) => {
    const keys = new Set<string>(surface.blocks.filter((b) => b.slotKey).map((b) => b.slotKey!));
    const surfaceSlots = props.slots.filter((s) => keys.has(s.key));
    const filtered = q
      ? surfaceSlots.filter(
          (s) =>
            s.name.toLowerCase().includes(q) ||
            s.key.toLowerCase().includes(q) ||
            surface.label.toLowerCase().includes(q)
        )
      : surfaceSlots;
    return { surface, slots: filtered };
  });

  const orphanSlots = props.slots.filter((s) => !registeredKeys.has(s.key));
  const orphanFiltered = q
    ? orphanSlots.filter((s) => s.name.toLowerCase().includes(q) || s.key.toLowerCase().includes(q))
    : orphanSlots;

  return (
    <div className="space-y-8">
      {grouped.map(({ surface, slots }) => {
        if (slots.length === 0) return null;
        return (
          <section key={surface.id}>
            <h2 className="mb-3 text-sm font-bold text-slate-700">{surface.label}</h2>
            <div className="space-y-3">
              {slots.map((slot) => {
                const block = surface.blocks.find((b) => b.slotKey === slot.key);
                return (
                  <HomeAdSlotEditor
                    key={slot.id}
                    slot={slot}
                    placement={block}
                    pagePath={surface.pagePath}
                    previewHref={surface.previewHref}
                    campaigns={props.campaigns}
                    coupangCache={props.coupangCacheByKey[slot.key] ?? null}
                    coupangConfig={props.coupangConfigBySlotId[slot.id] ?? null}
                    coupangApiConfigured={props.coupangApiConfigured}
                    scriptDraft={props.editor.scriptDrafts[slot.id] ?? slot.script_content ?? ""}
                    fallbackDraft={props.editor.fallbackDrafts[slot.id] ?? slot.fallback_script_content ?? ""}
                    fallbackType={props.editor.fallbackTypes[slot.id] ?? slot.fallback_type ?? ""}
                    savingScript={props.editor.savingScriptSlotId === slot.id}
                    savingFallback={props.editor.savingFallbackSlotId === slot.id}
                    uploading={props.editor.uploading}
                    form={props.editor.form}
                    editingId={props.editor.editingId}
                    addingSlotId={props.editor.addingSlotId}
                    onToggle={(enabled) => props.editor.onToggle(slot.id, enabled)}
                    onSlotTypeChange={(type) => props.editor.onSlotTypeChange(slot.id, type)}
                    onScriptDraftChange={(v) => props.editor.onScriptDraftChange(slot.id, v)}
                    onSaveScript={() =>
                      props.editor.onSaveScript(
                        slot.id,
                        (slot.slot_type ?? "direct") as SlotType,
                        props.editor.scriptDrafts[slot.id] ?? slot.script_content ?? ""
                      )
                    }
                    onFallbackTypeChange={(t) => props.editor.onFallbackTypeChange(slot.id, t)}
                    onFallbackDraftChange={(v) => props.editor.onFallbackDraftChange(slot.id, v)}
                    onSaveFallback={() => props.editor.onSaveFallback(slot.id)}
                    onStartAdd={() => props.editor.onStartAdd(slot.id)}
                    onStartEdit={props.editor.onStartEdit}
                    onDeleteCampaign={props.editor.onDeleteCampaign}
                    onSubmitForm={props.editor.onSubmitForm}
                    onCancelForm={props.editor.onCancelForm}
                    onFormChange={props.editor.onFormChange}
                    onImageChange={(file) => props.editor.onImageChange(slot.id, file)}
                  />
                );
              })}
            </div>
          </section>
        );
      })}
      {orphanFiltered.length > 0 ? (
        <section>
          <h2 className="mb-3 text-sm font-bold text-slate-700">기타 (배치 미등록)</h2>
          <div className="space-y-3">
            {orphanFiltered.map((slot) => (
              <HomeAdSlotEditor
                key={slot.id}
                slot={slot}
                campaigns={props.campaigns}
                coupangCache={props.coupangCacheByKey[slot.key] ?? null}
                coupangConfig={props.coupangConfigBySlotId[slot.id] ?? null}
                coupangApiConfigured={props.coupangApiConfigured}
                scriptDraft={props.editor.scriptDrafts[slot.id] ?? slot.script_content ?? ""}
                fallbackDraft={props.editor.fallbackDrafts[slot.id] ?? slot.fallback_script_content ?? ""}
                fallbackType={props.editor.fallbackTypes[slot.id] ?? slot.fallback_type ?? ""}
                savingScript={props.editor.savingScriptSlotId === slot.id}
                savingFallback={props.editor.savingFallbackSlotId === slot.id}
                uploading={props.editor.uploading}
                form={props.editor.form}
                editingId={props.editor.editingId}
                addingSlotId={props.editor.addingSlotId}
                onToggle={(enabled) => props.editor.onToggle(slot.id, enabled)}
                onSlotTypeChange={(type) => props.editor.onSlotTypeChange(slot.id, type)}
                onScriptDraftChange={(v) => props.editor.onScriptDraftChange(slot.id, v)}
                onSaveScript={() =>
                  props.editor.onSaveScript(
                    slot.id,
                    (slot.slot_type ?? "direct") as SlotType,
                    props.editor.scriptDrafts[slot.id] ?? slot.script_content ?? ""
                  )
                }
                onFallbackTypeChange={(t) => props.editor.onFallbackTypeChange(slot.id, t)}
                onFallbackDraftChange={(v) => props.editor.onFallbackDraftChange(slot.id, v)}
                onSaveFallback={() => props.editor.onSaveFallback(slot.id)}
                onStartAdd={() => props.editor.onStartAdd(slot.id)}
                onStartEdit={props.editor.onStartEdit}
                onDeleteCampaign={props.editor.onDeleteCampaign}
                onSubmitForm={props.editor.onSubmitForm}
                onCancelForm={props.editor.onCancelForm}
                onFormChange={props.editor.onFormChange}
                onImageChange={(file) => props.editor.onImageChange(slot.id, file)}
              />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

const ALL_TAB = { id: "all" as const, label: "전체 목록" };

export default function AdPlacementMap(props: Props) {
  const tabs: { id: AdPlacementSurfaceId; label: string }[] = [
    ...getAdPlacementSurfacesForTabs().map((s) => ({ id: s.id, label: s.label })),
    ALL_TAB,
  ];

  const surface = props.surfaceId !== "all" ? getAdPlacementSurface(props.surfaceId) : null;
  const liveCount =
    surface && props.surfaceId !== "all"
      ? surface.blocks.filter((b) => {
          if (b.kind !== "affiliate_slot" || !b.slotKey) return false;
          const slot = props.slots.find((s) => s.key === b.slotKey);
          if (!slot) return false;
          const camps = props.campaigns.filter((c) => c.home_ad_slot_id === slot.id);
          return summarizeAdSlotStatus(slot, camps, props.coupangCacheByKey[slot.key]).tone === "live";
        }).length
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => props.onSurfaceChange(tab.id)}
            className={cn(
              "rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
              props.surfaceId === tab.id
                ? "border border-b-0 border-slate-200 bg-white text-slate-900"
                : "text-slate-600 hover:bg-slate-50"
            )}
          >
            {tab.label}
            {tab.id === props.surfaceId && props.surfaceId !== "all" && liveCount > 0 ? (
              <span className="ml-1 text-xs text-emerald-700">({liveCount})</span>
            ) : null}
          </button>
        ))}
      </div>

      {props.surfaceId === "all" ? (
        <>
          <label className="block max-w-md">
            <span className="text-xs font-medium text-slate-600">슬롯 검색</span>
            <input
              type="search"
              value={props.slotSearch}
              onChange={(e) => props.onSlotSearchChange(e.target.value)}
              placeholder="슬롯 이름·키·화면"
              className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <AllSlotsList props={props} />
        </>
      ) : (
        <SurfaceWireframe surfaceId={props.surfaceId} props={props} />
      )}
    </div>
  );
}
