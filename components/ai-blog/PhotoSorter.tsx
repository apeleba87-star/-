"use client";

import { useEffect, useMemo, useState, type DragEvent } from "react";
import { PhotoThumb, SideSourceControls } from "@/components/ai-blog/PhotoSource";
import { Notice, btnGhost, btnPrimary, btnSecondary, card, input } from "@/components/ai-blog/ui";
import type { LocalPhotosState, PhotoSide } from "@/components/ai-blog/useLocalPhotos";
import { matchPhoto, photoKey, type LocalPhoto } from "@/lib/ai-blog/local-media";
import { apiJson } from "@/lib/ai-blog/messages";
import { SPACE_TYPES, type MediaPair, type ProjectMedia } from "@/lib/ai-blog/types";

type SlotMeta = {
  mediaId: string | null;
  name: string;
  size: number | null;
  modifiedAt: string | null;
  takenAt: string | null;
};
type PairDraft = {
  uid: string;
  id: string | null;
  label: string;
  memo: string;
  before: SlotMeta | null;
  after: SlotMeta | null;
};
type Role = "before" | "after";

const DRAG_MIME = "application/x-ai-blog-photo";

let uidSeq = 0;
const newUid = () => `p${Date.now().toString(36)}${(uidSeq++).toString(36)}`;

function emptyPair(): PairDraft {
  return { uid: newUid(), id: null, label: "", memo: "", before: null, after: null };
}

function slotFromMedia(m: ProjectMedia | undefined): SlotMeta | null {
  if (!m) return null;
  return {
    mediaId: m.id,
    name: m.local_name,
    size: m.local_size,
    modifiedAt: m.local_modified_at,
    takenAt: m.taken_at,
  };
}

function slotFromPhoto(p: LocalPhoto): SlotMeta {
  return {
    mediaId: null,
    name: p.name,
    size: p.size,
    modifiedAt: new Date(p.lastModified).toISOString(),
    takenAt: p.takenAt,
  };
}

function toDrafts(media: ProjectMedia[], pairs: MediaPair[]): PairDraft[] {
  const byId = new Map(media.map((m) => [m.id, m]));
  return pairs.map((p) => ({
    uid: newUid(),
    id: p.id,
    label: p.label,
    memo: p.memo,
    before: slotFromMedia(p.before_media_id ? byId.get(p.before_media_id) : undefined),
    after: slotFromMedia(p.after_media_id ? byId.get(p.after_media_id) : undefined),
  }));
}

const slotKey = (s: SlotMeta) =>
  photoKey(s.name, s.size ?? 0, s.modifiedAt ? new Date(s.modifiedAt).getTime() : 0);

const slotMatch = (s: SlotMeta, photos: LocalPhoto[]) =>
  matchPhoto({ local_name: s.name, local_size: s.size, local_modified_at: s.modifiedAt }, photos);

function SideTray({
  side,
  photos,
  photosState,
  usedBadge,
  usedKeys,
  onPick,
}: {
  side: PhotoSide;
  photos: LocalPhoto[];
  photosState: LocalPhotosState;
  usedBadge: Map<string, string>;
  usedKeys: Set<string>;
  onPick: (photo: LocalPhoto) => void;
}) {
  const title = side === "before" ? "청소 전 사진" : "청소 후 사진";
  const hint = side === "before" ? "클릭 또는 드래그 → 중앙 왼쪽" : "클릭 또는 드래그 → 중앙 오른쪽";
  const accent = side === "before" ? "border-t-amber-500" : "border-t-sky-500";

  return (
    <aside className={`${card} flex min-h-[520px] flex-col overflow-hidden border-t-4 ${accent}`}>
      <div className="space-y-2 border-b border-slate-200 bg-slate-50 px-3 py-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-[11px] text-slate-500">폴더를 열면 여기 나열됩니다</p>
        </div>
        <SideSourceControls state={photosState} side={side} compact />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        {photos.length ? (
          <div className="grid grid-cols-2 gap-2">
            {photos.map((p) => {
              const used = usedKeys.has(p.key);
              return (
                <button
                  key={p.key}
                  type="button"
                  draggable
                  title={`${p.name}${usedBadge.get(p.key) ? ` · ${usedBadge.get(p.key)}` : ""}`}
                  onClick={() => onPick(p)}
                  onDragStart={(e) => {
                    e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ key: p.key, side }));
                    e.dataTransfer.setData("text/plain", p.name);
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-slate-100 text-left ${
                    used ? "border-emerald-400 opacity-80" : "border-transparent hover:border-slate-300"
                  }`}
                >
                  <PhotoThumb photo={p} className="h-full w-full" />
                  <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/60 px-1 text-[10px] text-white">
                    {usedBadge.get(p.key) || p.name}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="flex h-full min-h-[200px] items-center justify-center px-3 text-center text-xs leading-relaxed text-slate-400">
            위에서 폴더 또는 파일을 선택하세요.
            <br />
            사진은 PC에만 두고 서버로 보내지 않습니다.
          </div>
        )}
      </div>
      <div className="border-t border-slate-200 px-3 py-2 text-[11px] text-slate-500">{hint}</div>
    </aside>
  );
}

export default function PhotoSorter({
  projectId,
  media,
  pairs,
  photosState,
  labelSuggestions,
  onSaved,
  onContinue,
}: {
  projectId: string;
  media: ProjectMedia[];
  pairs: MediaPair[];
  photosState: LocalPhotosState;
  labelSuggestions: string[];
  onSaved: (media: ProjectMedia[], pairs: MediaPair[]) => void;
  onContinue?: () => void;
}) {
  const { photos, error, info, loading, photosForSide } = photosState;
  const beforePhotos = photosForSide("before");
  const afterPhotos = photosForSide("after");
  const [drafts, setDrafts] = useState<PairDraft[]>(() => {
    const initial = toDrafts(media, pairs);
    return initial.length ? initial : [emptyPair()];
  });
  const [activeUid, setActiveUid] = useState<string>(() => drafts[0]?.uid ?? "");
  const [dragOver, setDragOver] = useState<Role | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const update = (fn: (prev: PairDraft[]) => PairDraft[]) => {
    setDirty(true);
    setSavedAt(null);
    setDrafts(fn);
  };

  useEffect(() => {
    if (!drafts.some((d) => d.uid === activeUid)) {
      setActiveUid(drafts[0]?.uid ?? "");
    }
  }, [drafts, activeUid]);

  const usedKeys = useMemo(() => {
    const set = new Set<string>();
    for (const d of drafts) {
      for (const s of [d.before, d.after]) {
        if (!s) continue;
        const p = slotMatch(s, photos);
        if (p) set.add(p.key);
      }
    }
    return set;
  }, [drafts, photos]);

  const usedBadge = useMemo(() => {
    const map = new Map<string, string>();
    drafts.forEach((d, i) => {
      const no = String(i + 1).padStart(2, "0");
      for (const role of ["before", "after"] as Role[]) {
        const s = d[role];
        if (!s) continue;
        const p = slotMatch(s, photos);
        if (p) map.set(p.key, `${no}${role === "before" ? "전" : "후"}`);
      }
    });
    return map;
  }, [drafts, photos]);

  const active = drafts.find((d) => d.uid === activeUid) ?? drafts[0] ?? null;
  const activeIndex = active ? drafts.findIndex((d) => d.uid === active.uid) : -1;

  /** 지정 세트·역할에 사진 넣기. 다른 칸에 쓰였으면 옮김. */
  const putPhoto = (photo: LocalPhoto, role: Role, uid = active?.uid) => {
    if (!uid) return;
    const slot = slotFromPhoto(photo);
    update((prev) => {
      const clearDup = (s: SlotMeta | null) => (s && slotMatch(s, [photo]) ? null : s);
      return prev.map((d) => {
        const cleared = { ...d, before: clearDup(d.before), after: clearDup(d.after) };
        return cleared.uid === uid ? { ...cleared, [role]: slot } : cleared;
      });
    });
  };

  const clearSlot = (uid: string, role: Role) => {
    update((prev) => prev.map((d) => (d.uid === uid ? { ...d, [role]: null } : d)));
  };

  const move = (uid: string, dir: -1 | 1) =>
    update((prev) => {
      const i = prev.findIndex((d) => d.uid === uid);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const setField = (uid: string, field: "label" | "memo", value: string) =>
    update((prev) => prev.map((d) => (d.uid === uid ? { ...d, [field]: value } : d)));

  const parseDrag = (e: DragEvent): { key: string; side: PhotoSide } | null => {
    try {
      const raw = e.dataTransfer.getData(DRAG_MIME) || e.dataTransfer.getData("text/plain");
      if (!raw) return null;
      const data = JSON.parse(raw) as { key?: string; side?: PhotoSide };
      if (!data.key || (data.side !== "before" && data.side !== "after")) return null;
      return { key: data.key, side: data.side };
    } catch {
      return null;
    }
  };

  const onDropSlot = (role: Role, e: DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const data = parseDrag(e);
    if (!data) return;
    if (data.side !== role) return;
    const list = role === "before" ? beforePhotos : afterPhotos;
    const photo = list.find((p) => p.key === data.key) ?? photos.find((p) => p.key === data.key);
    if (photo) putPhoto(photo, role);
  };

  const autoPairSides = () => {
    if (!beforePhotos.length || !afterPhotos.length) return;
    if (drafts.some((d) => d.before || d.after) && !window.confirm("지금 만든 짝을 모두 지우고 좌·우 폴더 순서대로 맞출까요?")) {
      return;
    }
    const count = Math.min(40, Math.max(beforePhotos.length, afterPhotos.length));
    const next = Array.from({ length: count }, (_, i) => ({
      uid: newUid(),
      id: null,
      label: "",
      memo: "",
      before: beforePhotos[i] ? slotFromPhoto(beforePhotos[i]) : null,
      after: afterPhotos[i] ? slotFromPhoto(afterPhotos[i]) : null,
    }));
    update(() => next);
    setActiveUid(next[0]?.uid ?? "");
  };

  const save = async (andContinue = false) => {
    setSaving(true);
    setSaveError(null);
    const mediaBody: Record<string, unknown>[] = [];
    const seen = new Set<string>();
    const ref = (s: SlotMeta | null, role: "BEFORE" | "AFTER"): string | null => {
      if (!s) return null;
      const key = s.mediaId ?? slotKey(s);
      if (!seen.has(key)) {
        seen.add(key);
        mediaBody.push({
          key,
          id: s.mediaId,
          media_type: role,
          local_name: s.name,
          local_size: s.size,
          local_modified_at: s.modifiedAt,
          taken_at: s.takenAt,
        });
      }
      return key;
    };
    const pairsBody = drafts.map((d) => ({
      id: d.id,
      label: d.label,
      memo: d.memo,
      before: ref(d.before, "BEFORE"),
      after: ref(d.after, "AFTER"),
    }));
    try {
      const data = await apiJson<{ media: ProjectMedia[]; pairs: MediaPair[] }>(
        `/api/ai-blog/projects/${projectId}/media`,
        { method: "PUT", body: JSON.stringify({ media: mediaBody, pairs: pairsBody }) },
      );
      const next = toDrafts(data.media, data.pairs);
      setDrafts(next.length ? next : [emptyPair()]);
      setActiveUid(next[0]?.uid ?? "");
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      onSaved(data.media, data.pairs);
      if (andContinue) onContinue?.();
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const missing = drafts.some((d) => [d.before, d.after].some((s) => s && !slotMatch(s, photos)));
  const usable = drafts.filter((d) => d.before || d.after).length;

  const renderCenterSlot = (role: Role) => {
    if (!active) return null;
    const s = active[role];
    const photo = s ? slotMatch(s, photos) : null;
    const over = dragOver === role;
    const label = role === "before" ? "청소 전" : "청소 후";
    return (
      <div
        className={`relative flex min-h-[280px] flex-1 flex-col overflow-hidden rounded-xl border-2 transition ${
          over
            ? "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-200"
            : s
              ? "border-slate-200 bg-slate-50"
              : "border-dashed border-slate-300 bg-slate-50"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(role);
        }}
        onDragLeave={() => setDragOver((v) => (v === role ? null : v))}
        onDrop={(e) => onDropSlot(role, e)}
      >
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
          <span className={`text-xs font-bold ${role === "before" ? "text-amber-700" : "text-sky-700"}`}>
            {String(Math.max(activeIndex, 0) + 1).padStart(2, "0")} {label}
          </span>
          {s ? (
            <button type="button" className={btnGhost} onClick={() => clearSlot(active.uid, role)}>
              비우기
            </button>
          ) : null}
        </div>
        <div className="relative flex min-h-[240px] flex-1 items-center justify-center">
          {s ? (
            <PhotoThumb photo={photo} name={s.name} className="absolute inset-0 h-full w-full object-contain" />
          ) : (
            <p className="px-4 text-center text-sm text-slate-400">
              {role === "before" ? "왼쪽" : "오른쪽"} 목록에서
              <br />
              사진을 넣으세요
            </p>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">사진을 크게 보고 전·후 맞추기</h2>
        <span className="text-sm text-slate-500">전후 {usable}세트</span>
        <div className="flex-1" />
        {beforePhotos.length && afterPhotos.length ? (
          <button type="button" className={btnGhost} onClick={autoPairSides}>
            좌·우 순서대로 한 번에 맞추기
          </button>
        ) : null}
      </div>
      <p className="text-sm text-slate-600">
        왼쪽에서 청소 전 폴더, 오른쪽에서 청소 후 폴더를 연 뒤 · 클릭하거나 드래그해서 중앙에 넣습니다.
      </p>

      {loading ? <Notice tone="info">사진을 읽는 중…</Notice> : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {info ? <Notice tone="warning">{info}</Notice> : null}
      {missing ? (
        <Notice tone="warning">
          저장된 짝 중 일부 사진이 지금 열린 사진에 없습니다. 그 사진이 들어 있는 폴더도 함께 열어 주세요.
        </Notice>
      ) : null}

      <div className="grid gap-3 xl:grid-cols-[240px_minmax(0,1fr)_240px]">
        <SideTray
          side="before"
          photos={beforePhotos}
          photosState={photosState}
          usedBadge={usedBadge}
          usedKeys={usedKeys}
          onPick={(p) => putPhoto(p, "before")}
        />

        <section className={`${card} flex flex-col gap-3 p-4`}>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">전후 미리보기</h3>
            <span className="text-xs text-slate-500">
              세트 {activeIndex >= 0 ? activeIndex + 1 : 0} / {drafts.length}
            </span>
            <div className="flex-1" />
            <button
              type="button"
              className={btnGhost}
              disabled={drafts.length >= 40}
              onClick={() => {
                const fresh = emptyPair();
                update((prev) => [...prev, fresh]);
                setActiveUid(fresh.uid);
              }}
            >
              + 세트 추가
            </button>
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] items-stretch gap-2">
            {renderCenterSlot("before")}
            <div className="flex items-center justify-center text-xl font-bold text-slate-300">→</div>
            {renderCenterSlot("after")}
          </div>

          {active ? (
            <>
              <datalist id="pair-label-suggestions">
                {[...new Set([...labelSuggestions, ...SPACE_TYPES])].map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">장소 / 제목</span>
                  <input
                    className={input}
                    list="pair-label-suggestions"
                    placeholder="예: 욕실 물때"
                    value={active.label}
                    maxLength={50}
                    onChange={(e) => setField(active.uid, "label", e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs font-medium text-slate-600">오염 메모 (선택)</span>
                  <input
                    className={input}
                    placeholder="예: 물때, 곰팡이"
                    value={active.memo}
                    maxLength={200}
                    onChange={(e) => setField(active.uid, "memo", e.target.value)}
                  />
                </label>
              </div>
            </>
          ) : null}

          <div className="space-y-2 border-t border-slate-200 pt-3">
            <h4 className="text-xs font-semibold text-slate-500">맞춘 전·후 ({usable}세트)</h4>
            <ol className="max-h-[240px] space-y-2 overflow-y-auto pr-1">
              {drafts.map((d, i) => {
                const b = d.before ? slotMatch(d.before, photos) : null;
                const a = d.after ? slotMatch(d.after, photos) : null;
                const selected = d.uid === active?.uid;
                return (
                  <li key={d.uid}>
                    <div
                      className={`flex items-center gap-2 rounded-xl border p-2 ${
                        selected ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-200" : "border-slate-200 bg-white"
                      }`}
                    >
                      <button type="button" className="flex flex-1 items-center gap-2 text-left" onClick={() => setActiveUid(d.uid)}>
                        <span className="w-6 shrink-0 text-xs font-bold text-slate-500">{String(i + 1).padStart(2, "0")}</span>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          {d.before ? (
                            <PhotoThumb photo={b} name={d.before.name} className="h-full w-full" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">전</div>
                          )}
                        </div>
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          {d.after ? (
                            <PhotoThumb photo={a} name={d.after.name} className="h-full w-full" />
                          ) : (
                            <div className="flex h-full items-center justify-center text-[10px] text-slate-400">후</div>
                          )}
                        </div>
                        <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                          {d.label || d.memo || "제목 없음"}
                        </span>
                      </button>
                      <button type="button" className={btnGhost} disabled={i === 0} onClick={() => move(d.uid, -1)}>
                        ▲
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={i === drafts.length - 1}
                        onClick={() => move(d.uid, 1)}
                      >
                        ▼
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} text-rose-600`}
                        onClick={() => {
                          update((prev) => {
                            const next = prev.filter((x) => x.uid !== d.uid);
                            return next.length ? next : [emptyPair()];
                          });
                        }}
                      >
                        삭제
                      </button>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <SideTray
          side="after"
          photos={afterPhotos}
          photosState={photosState}
          usedBadge={usedBadge}
          usedKeys={usedKeys}
          onPick={(p) => putPhoto(p, "after")}
        />
      </div>

      <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-2 border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur">
        {savedAt ? <span className="text-xs text-emerald-700">{savedAt} 저장됨</span> : null}
        {dirty ? <span className="text-xs text-amber-700">저장 안 됨</span> : null}
        <div className="flex-1" />
        <button type="button" className={btnSecondary} disabled={saving || !dirty} onClick={() => void save(false)}>
          {saving ? "저장 중…" : "사진 저장"}
        </button>
        <button
          type="button"
          className={`${btnPrimary} px-5 py-2.5 text-base`}
          disabled={saving || usable < 1}
          title={usable < 1 ? "전·후를 최소 1세트 맞춰 주세요." : undefined}
          onClick={() => void (dirty ? save(true) : onContinue?.())}
        >
          {saving ? "저장 중…" : `전후 ${usable}세트 · 글 쓰기로 →`}
        </button>
      </div>
      {saveError ? <Notice tone="error">{saveError}</Notice> : null}
    </div>
  );
}
