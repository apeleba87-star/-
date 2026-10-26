"use client";

import { useEffect, useMemo, useState } from "react";
import { PhotoSourceBar, PhotoThumb } from "@/components/ai-blog/PhotoSource";
import { Notice, btnGhost, btnPrimary, btnSecondary, card, input } from "@/components/ai-blog/ui";
import type { LocalPhotosState } from "@/components/ai-blog/useLocalPhotos";
import { isPreviewable, matchPhoto, photoKey, type LocalPhoto } from "@/lib/ai-blog/local-media";
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
/** 전만: 전 칸만 연달아 / 후만: 후 칸만 연달아 / 번갈아: 전→후→다음 세트 */
type FillMode = "before" | "after" | "alternate";

let uidSeq = 0;
const newUid = () => `p${Date.now().toString(36)}${(uidSeq++).toString(36)}`;

function emptyPair(): PairDraft {
  return { uid: newUid(), id: null, label: "", memo: "", before: null, after: null };
}

/** 이미 찬 칸은 건드리지 않고, 다음에 채울 빈 칸(또는 새 세트)을 찾는다 */
function findNextSlot(
  list: PairDraft[],
  mode: FillMode,
): { uid: string; role: Role; list: PairDraft[]; index: number } | null {
  if (mode === "before") {
    const index = list.findIndex((d) => !d.before);
    if (index >= 0) return { uid: list[index].uid, role: "before", list, index };
    if (list.length >= 40) return null;
    const fresh = emptyPair();
    return { uid: fresh.uid, role: "before", list: [...list, fresh], index: list.length };
  }
  if (mode === "after") {
    // 전이 있는 세트의 빈 후 → 그다음 빈 후 → 새 세트
    let index = list.findIndex((d) => d.before && !d.after);
    if (index < 0) index = list.findIndex((d) => !d.after);
    if (index >= 0) return { uid: list[index].uid, role: "after", list, index };
    if (list.length >= 40) return null;
    const fresh = emptyPair();
    return { uid: fresh.uid, role: "after", list: [...list, fresh], index: list.length };
  }
  for (let index = 0; index < list.length; index++) {
    const d = list[index];
    if (!d.before) return { uid: d.uid, role: "before", list, index };
    if (!d.after) return { uid: d.uid, role: "after", list, index };
  }
  if (list.length >= 40) return null;
  const fresh = emptyPair();
  return { uid: fresh.uid, role: "before", list: [...list, fresh], index: list.length };
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
  const { photos, sources } = photosState;
  const [sourceFilter, setSourceFilter] = useState("");
  const [beforePick, setBeforePick] = useState("");
  const [afterPick, setAfterPick] = useState("");
  const names = sources.map((s) => s.name);
  const filter = names.includes(sourceFilter) ? sourceFilter : "";
  const trayPhotos = filter ? photos.filter((p) => p.source === filter) : photos;
  const beforeSrc = names.includes(beforePick) ? beforePick : (names[0] ?? "");
  const afterSrc = names.includes(afterPick) && afterPick !== beforeSrc ? afterPick : (names.find((n) => n !== beforeSrc) ?? "");
  const [drafts, setDrafts] = useState<PairDraft[]>(() => toDrafts(media, pairs));
  const [cursor, setCursor] = useState(0);
  const [fillMode, setFillMode] = useState<FillMode>("before");
  const [compareUid, setCompareUid] = useState<string | null>(null);
  const [showAuto, setShowAuto] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const update = (fn: (prev: PairDraft[]) => PairDraft[]) => {
    setDirty(true);
    setSavedAt(null);
    setDrafts(fn);
  };

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

  const nextSlot = useMemo(() => findNextSlot(drafts, fillMode), [drafts, fillMode]);

  useEffect(() => {
    if (cursor >= trayPhotos.length) setCursor(Math.max(0, trayPhotos.length - 1));
  }, [trayPhotos.length, cursor]);

  const current = trayPhotos[cursor] ?? null;

  /** 빈 칸에만 넣음. 이미 쓴 사진이면 예전 칸에서만 빼고 옮김. 찬 칸은 덮지 않음. */
  const putPhoto = (photo: LocalPhoto, mode: FillMode = fillMode) => {
    const slot = slotFromPhoto(photo);
    let placed = false;
    update((prev) => {
      const clearDup = (s: SlotMeta | null) => (s && slotMatch(s, [photo]) ? null : s);
      const cleared = prev.map((d) => ({ ...d, before: clearDup(d.before), after: clearDup(d.after) }));
      const target = findNextSlot(cleared, mode);
      if (!target) return cleared;
      placed = true;
      return target.list.map((d) => (d.uid === target.uid ? { ...d, [target.role]: slot } : d));
    });
    if (placed) {
      setCompareUid(null);
      setCursor((c) => Math.min(c + 1, Math.max(0, trayPhotos.length - 1)));
    }
  };

  const putCurrent = () => {
    if (!current) return;
    putPhoto(current);
  };

  const clearSlot = (uid: string, role: Role) => {
    update((prev) => prev.map((d) => (d.uid === uid ? { ...d, [role]: null } : d)));
  };

  const replacePairs = (pairsOf: [LocalPhoto | undefined, LocalPhoto | undefined][]) => {
    if (drafts.length && !window.confirm("지금 만든 짝을 모두 지우고 자동으로 다시 맞출까요?")) return;
    const next = pairsOf.slice(0, 40).map(([b, a]) => ({
      uid: newUid(),
      id: null,
      label: "",
      memo: "",
      before: b ? slotFromPhoto(b) : null,
      after: a ? slotFromPhoto(a) : null,
    }));
    update(() => next);
  };

  const autoPair = (how: "alternate" | "half") => {
    const list = trayPhotos;
    if (list.length < 2) return;
    const half = Math.floor(list.length / 2);
    const count = how === "alternate" ? Math.ceil(list.length / 2) : half;
    replacePairs(
      Array.from({ length: count }, (_, i) =>
        how === "alternate" ? [list[i * 2], list[i * 2 + 1]] : [list[i], list[half + i]],
      ),
    );
  };

  const autoPairFolders = () => {
    const b = photos.filter((p) => p.source === beforeSrc);
    const a = photos.filter((p) => p.source === afterSrc);
    if (!b.length || !a.length || beforeSrc === afterSrc) return;
    replacePairs(Array.from({ length: Math.max(b.length, a.length) }, (_, i) => [b[i], a[i]]));
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

  const save = async (andContinue = false) => {
    setSaving(true);
    setError(null);
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
      setDrafts(toDrafts(data.media, data.pairs));
      setDirty(false);
      setSavedAt(new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" }));
      onSaved(data.media, data.pairs);
      if (andContinue) onContinue?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const missing = drafts.some((d) => [d.before, d.after].some((s) => s && !slotMatch(s, photos)));
  const usable = drafts.filter((d) => d.before || d.after).length;
  const compareDraft = compareUid ? drafts.find((d) => d.uid === compareUid) : null;
  const compareBefore = compareDraft?.before ? slotMatch(compareDraft.before, photos) : null;

  const renderPairSlot = (d: PairDraft, role: Role, index: number) => {
    const s = d[role];
    const photo = s ? slotMatch(s, photos) : null;
    const isNext = nextSlot?.uid === d.uid && nextSlot.role === role;
    return (
      <div
        key={role}
        className={`relative min-h-[200px] flex-1 overflow-hidden rounded-xl border-2 ${
          isNext
            ? "border-emerald-500 ring-2 ring-emerald-200"
            : s
              ? "border-slate-200"
              : "border-dashed border-slate-300"
        }`}
      >
        {s ? (
          <button type="button" className="block h-full w-full" onClick={() => setCompareUid(d.uid)}>
            <PhotoThumb photo={photo} name={s.name} className="h-48 w-full object-contain sm:h-56" />
          </button>
        ) : (
          <div className="flex h-48 w-full flex-col items-center justify-center gap-1 text-sm text-slate-400 sm:h-56">
            <span className="text-lg font-bold text-slate-500">{role === "before" ? "전" : "후"}</span>
            <span>{isNext ? "다음에 여기 ←" : "비어 있음"}</span>
          </div>
        )}
        <span
          className={`absolute left-2 top-2 rounded px-2 py-0.5 text-xs font-bold text-white ${
            role === "before" ? "bg-slate-700" : "bg-emerald-600"
          }`}
        >
          {String(index + 1).padStart(2, "0")} {role === "before" ? "전" : "후"}
        </span>
        {isNext ? (
          <span className="absolute bottom-2 left-2 rounded bg-emerald-600 px-2 py-0.5 text-[11px] font-bold text-white">
            다음에 넣을 칸
          </span>
        ) : null}
        {s ? (
          <button
            type="button"
            className="absolute right-2 top-2 rounded bg-white/95 px-2 py-0.5 text-sm font-medium text-slate-700 shadow"
            onClick={() => clearSlot(d.uid, role)}
          >
            빼기
          </button>
        ) : null}
      </div>
    );
  };

  if (!photos.length) {
    return (
      <div className="space-y-4">
        <div className={`${card} space-y-4 p-8 text-center`}>
          <h3 className="text-lg font-bold text-slate-900">이 작업 사진이 있는 폴더를 열어 주세요</h3>
          <p className="text-sm text-slate-600">사진은 PC에만 두고, 우리 서버로 보내지 않습니다.</p>
          <PhotoSourceBar state={photosState} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold text-slate-900">사진을 크게 보고 전·후 맞추기</h2>
        <span className="text-sm text-slate-500">전후 {usable}세트</span>
        <div className="flex-1" />
        <PhotoSourceBar state={photosState} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            { id: "before" as const, label: "전만 넣기", hint: "청소 전 사진을 연달아" },
            { id: "after" as const, label: "후만 넣기", hint: "청소 후 사진을 연달아" },
            { id: "alternate" as const, label: "전·후 번갈아", hint: "한 세트씩" },
          ] as const
        ).map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => setFillMode(m.id)}
            className={`rounded-xl px-4 py-2.5 text-left transition ${
              fillMode === m.id
                ? "bg-slate-900 text-white shadow"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className="block text-sm font-bold">{m.label}</span>
            <span className={`block text-xs ${fillMode === m.id ? "text-slate-300" : "text-slate-500"}`}>{m.hint}</span>
          </button>
        ))}
      </div>
      <p className="text-sm text-slate-600">
        {fillMode === "before"
          ? "전 사진만 연달아 넣습니다. 이미 넣은 장은 덮어쓰지 않습니다."
          : fillMode === "after"
            ? "후가 비어 있는 세트부터 순서대로 채웁니다. 이미 넣은 장은 덮어쓰지 않습니다."
            : "전 → 후 → 다음 세트 순으로 빈 칸만 채웁니다."}
        {nextSlot ? (
          <span className="ml-1 font-semibold text-emerald-700">
            다음: {String(nextSlot.index + 1).padStart(2, "0")} {nextSlot.role === "before" ? "전" : "후"}
          </span>
        ) : (
          <span className="ml-1 text-amber-700">세트가 가득 찼습니다 (최대 40).</span>
        )}
      </p>

      {missing ? (
        <Notice tone="warning">
          저장된 짝 중 일부 사진이 지금 열린 사진에 없습니다. 그 사진이 들어 있는 폴더도 함께 열어 주세요.
        </Notice>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-5">
        <section className={`${card} space-y-3 p-4 xl:col-span-3`}>
          {compareBefore && current ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-700">왼쪽이 전</p>
                <div className="overflow-hidden rounded-xl bg-slate-100">
                  <PhotoThumb photo={compareBefore} className="max-h-[420px] w-full object-contain" />
                </div>
              </div>
              <div>
                <p className="mb-1 text-sm font-semibold text-slate-700">오른쪽이 지금 고르는 사진</p>
                <div className="overflow-hidden rounded-xl bg-slate-100">
                  {isPreviewable(current.name) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={current.url} alt={current.name} className="max-h-[420px] w-full object-contain" />
                  ) : (
                    <PhotoThumb photo={current} className="max-h-[420px] w-full" />
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl bg-slate-100">
              {current && isPreviewable(current.name) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={current.url}
                  alt={current.name}
                  className="mx-auto max-h-[min(70vh,520px)] w-full object-contain"
                />
              ) : current ? (
                <div className="flex h-[320px] flex-col items-center justify-center gap-2 text-slate-500">
                  <PhotoThumb photo={current} className="h-40 w-40" />
                  <p className="text-sm">이 형식은 미리보기가 어렵습니다. 그래도 전·후에 넣을 수 있습니다.</p>
                </div>
              ) : (
                <div className="flex h-[240px] items-center justify-center text-slate-400">사진 없음</div>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              className={`${btnSecondary} px-4 py-2 text-base`}
              disabled={cursor <= 0}
              onClick={() => setCursor((c) => Math.max(0, c - 1))}
            >
              ← 이전
            </button>
            <span className="min-w-[5rem] text-center text-base font-semibold text-slate-800">
              {trayPhotos.length ? `${cursor + 1} / ${trayPhotos.length}` : "0 / 0"}
            </span>
            <button
              type="button"
              className={`${btnSecondary} px-4 py-2 text-base`}
              disabled={cursor >= trayPhotos.length - 1}
              onClick={() => setCursor((c) => Math.min(trayPhotos.length - 1, c + 1))}
            >
              다음 →
            </button>
          </div>

          {current ? (
            <p className="truncate text-center text-xs text-slate-500" title={current.name}>
              {current.name}
              {usedBadge.get(current.key) ? ` · 이미 ${usedBadge.get(current.key)}` : ""}
            </p>
          ) : null}

          {fillMode === "alternate" ? (
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-xl bg-slate-800 px-4 py-4 text-base font-bold text-white hover:bg-slate-700 disabled:opacity-40"
                disabled={!current || !findNextSlot(drafts, "before")}
                onClick={() => current && putPhoto(current, "before")}
              >
                전에 넣기
              </button>
              <button
                type="button"
                className="rounded-xl bg-emerald-600 px-4 py-4 text-base font-bold text-white hover:bg-emerald-500 disabled:opacity-40"
                disabled={!current || !findNextSlot(drafts, "after")}
                onClick={() => current && putPhoto(current, "after")}
              >
                후에 넣기
              </button>
            </div>
          ) : (
            <button
              type="button"
              className={`w-full rounded-xl px-4 py-5 text-lg font-bold text-white disabled:opacity-40 ${
                fillMode === "before" ? "bg-slate-800 hover:bg-slate-700" : "bg-emerald-600 hover:bg-emerald-500"
              }`}
              disabled={!current || !nextSlot}
              onClick={putCurrent}
            >
              {fillMode === "before" ? "전에 넣기" : "후에 넣기"}
              {nextSlot
                ? ` · ${String(nextSlot.index + 1).padStart(2, "0")} ${nextSlot.role === "before" ? "전" : "후"}`
                : ""}
            </button>
          )}

          <div className="flex gap-2 overflow-x-auto pb-1">
            {trayPhotos.map((p, i) => (
              <button
                key={p.key}
                type="button"
                onClick={() => setCursor(i)}
                className={`relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border-2 ${
                  i === cursor ? "border-emerald-500" : usedKeys.has(p.key) ? "border-slate-200 opacity-60" : "border-slate-200"
                }`}
                title={p.name}
              >
                <PhotoThumb photo={p} className="h-full w-full" />
                {usedBadge.get(p.key) ? (
                  <span className="absolute bottom-1 left-1 rounded bg-emerald-600 px-1 text-[10px] text-white">
                    {usedBadge.get(p.key)}
                  </span>
                ) : (
                  <span className="absolute bottom-1 left-1 rounded bg-black/55 px-1 text-[10px] text-white">{i + 1}</span>
                )}
              </button>
            ))}
          </div>

          {sources.length > 1 ? (
            <div className="flex flex-wrap gap-1">
              {["", ...names].map((n) => (
                <button
                  key={n || "all"}
                  type="button"
                  onClick={() => {
                    setSourceFilter(n);
                    setCursor(0);
                  }}
                  className={`rounded-full px-3 py-1 text-xs ${
                    filter === n ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {n || `전체 ${photos.length}`}
                  {n ? ` ${sources.find((s) => s.name === n)?.count ?? 0}` : ""}
                </button>
              ))}
            </div>
          ) : null}

          <div>
            <button type="button" className="text-xs text-slate-500 underline" onClick={() => setShowAuto((v) => !v)}>
              {showAuto ? "한 번에 짝 맞추기 접기" : "한 번에 짝 맞추기"}
            </button>
            {showAuto ? (
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" className={btnGhost} disabled={trayPhotos.length < 2} onClick={() => autoPair("alternate")}>
                  번갈아 짝
                </button>
                <button type="button" className={btnGhost} disabled={trayPhotos.length < 2} onClick={() => autoPair("half")}>
                  절반씩 짝
                </button>
                {sources.length > 1 ? (
                  <>
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={beforeSrc}
                      onChange={(e) => setBeforePick(e.target.value)}
                    >
                      {names.map((n) => (
                        <option key={n} value={n}>
                          전: {n}
                        </option>
                      ))}
                    </select>
                    <select
                      className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                      value={afterSrc}
                      onChange={(e) => setAfterPick(e.target.value)}
                    >
                      {names
                        .filter((n) => n !== beforeSrc)
                        .map((n) => (
                          <option key={n} value={n}>
                            후: {n}
                          </option>
                        ))}
                    </select>
                    <button type="button" className={btnGhost} disabled={!afterSrc} onClick={autoPairFolders}>
                      폴더끼리 짝
                    </button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className={`${card} space-y-3 p-4 xl:col-span-2`}>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">맞춘 전·후 ({drafts.length}세트)</h3>
            <div className="flex-1" />
            <button
              type="button"
              className={btnGhost}
              disabled={drafts.length >= 40}
              onClick={() => {
                update((prev) => [...prev, emptyPair()]);
              }}
            >
              + 세트 추가
            </button>
          </div>
          <datalist id="pair-label-suggestions">
            {[...new Set([...labelSuggestions, ...SPACE_TYPES])].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <ol className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
            {drafts.map((d, i) => (
              <li key={d.uid} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex gap-2">
                  {renderPairSlot(d, "before", i)}
                  {renderPairSlot(d, "after", i)}
                </div>
                <input
                  className={input}
                  list="pair-label-suggestions"
                  placeholder="사진 제목 (예: 욕실 물때) — 글 소제목에 쓰입니다"
                  value={d.label}
                  maxLength={50}
                  onChange={(e) => setField(d.uid, "label", e.target.value)}
                />
                <details className="rounded-lg bg-slate-50 px-2 py-1.5" open={Boolean(d.memo)}>
                  <summary className="cursor-pointer text-xs text-slate-600">
                    오염 상태 (선택) · 안 적어도 됩니다
                  </summary>
                  <input
                    className={`${input} mt-1.5`}
                    placeholder="예: 물때, 곰팡이, 수전 주변 하얀 때"
                    value={d.memo}
                    maxLength={200}
                    onChange={(e) => setField(d.uid, "memo", e.target.value)}
                  />
                  <p className="mt-1 text-[11px] text-slate-500">이 오염이 그 사진 문단에 들어갑니다. 앱에서 고른 내용도 여기 보입니다.</p>
                </details>
                <div className="flex flex-wrap gap-1">
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
                    onClick={() => update((prev) => prev.filter((x) => x.uid !== d.uid))}
                  >
                    세트 삭제
                  </button>
                </div>
              </li>
            ))}
          </ol>
          {!drafts.length ? (
            <p className="py-6 text-center text-sm text-slate-500">
              왼쪽에서 사진을 보고 「{fillMode === "after" ? "후에 넣기" : "전에 넣기"}」를 연달아 누르세요.
            </p>
          ) : null}
        </section>
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
      {error ? <Notice tone="error">{error}</Notice> : null}
    </div>
  );
}
