"use client";

import { useMemo, useState } from "react";
import { PhotoSourceBar, PhotoThumb } from "@/components/ai-blog/PhotoSource";
import { Notice, btnGhost, btnPrimary, btnSecondary, card, input } from "@/components/ai-blog/ui";
import type { LocalPhotosState } from "@/components/ai-blog/useLocalPhotos";
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
type ActiveSlot = { uid: string; role: Role } | null;

let uidSeq = 0;
const newUid = () => `p${Date.now().toString(36)}${(uidSeq++).toString(36)}`;

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
}: {
  projectId: string;
  media: ProjectMedia[];
  pairs: MediaPair[];
  photosState: LocalPhotosState;
  labelSuggestions: string[];
  onSaved: (media: ProjectMedia[], pairs: MediaPair[]) => void;
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
  const [active, setActive] = useState<ActiveSlot>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
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

  const nextEmpty = (list: PairDraft[], from: ActiveSlot): ActiveSlot => {
    const order: { uid: string; role: Role }[] = list.flatMap((d) => [
      { uid: d.uid, role: "before" as Role },
      { uid: d.uid, role: "after" as Role },
    ]);
    const start = from ? order.findIndex((o) => o.uid === from.uid && o.role === from.role) + 1 : 0;
    for (const o of [...order.slice(start), ...order.slice(0, start)]) {
      const d = list.find((x) => x.uid === o.uid);
      if (d && !d[o.role]) return o;
    }
    return null;
  };

  const assign = (list: PairDraft[], target: { uid: string; role: Role }, photo: LocalPhoto) => {
    const slot = slotFromPhoto(photo);
    const clear = (s: SlotMeta | null) => (s && slotMatch(s, [photo]) ? null : s);
    const next = list.map((d) => {
      const cleared = { ...d, before: clear(d.before), after: clear(d.after) };
      return d.uid === target.uid ? { ...cleared, [target.role]: slot } : cleared;
    });
    update(() => next);
    setActive(nextEmpty(next, target));
  };

  const swapSlots = (from: { uid: string; role: Role }, to: { uid: string; role: Role }) => {
    if (from.uid === to.uid && from.role === to.role) return;
    const src = drafts.find((d) => d.uid === from.uid)?.[from.role] ?? null;
    const dst = drafts.find((d) => d.uid === to.uid)?.[to.role] ?? null;
    if (!src) return;
    update((prev) =>
      prev.map((d) => {
        let next = d;
        if (d.uid === from.uid) next = { ...next, [from.role]: dst };
        if (d.uid === to.uid) next = { ...next, [to.role]: src };
        return next;
      }),
    );
  };

  const clickTray = (photo: LocalPhoto) => {
    const target = active ?? nextEmpty(drafts, null);
    if (target) return assign(drafts, target, photo);
    if (drafts.length >= 40) return;
    const fresh: PairDraft = { uid: newUid(), id: null, label: "", memo: "", before: null, after: null };
    assign([...drafts, fresh], { uid: fresh.uid, role: "before" }, photo);
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
    setActive(null);
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

  const save = async () => {
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
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const missing = drafts.some((d) => [d.before, d.after].some((s) => s && !slotMatch(s, photos)));

  const renderSlot = (d: PairDraft, role: Role) => {
    const s = d[role];
    const photo = s ? slotMatch(s, photos) : null;
    const isActive = active?.uid === d.uid && active.role === role;
    const slotId = `${d.uid}|${role}`;
    const isOver = dragOver === slotId;
    return (
      <button
        key={role}
        type="button"
        draggable={Boolean(s)}
        onDragStart={(e) => {
          e.dataTransfer.setData("text/x-slot", slotId);
          e.dataTransfer.effectAllowed = "move";
        }}
        onClick={() => setActive(isActive ? null : { uid: d.uid, role })}
        onDragOver={(e) => {
          e.preventDefault();
          if (dragOver !== slotId) setDragOver(slotId);
        }}
        onDragLeave={() => setDragOver((v) => (v === slotId ? null : v))}
        onDragEnd={() => setDragOver(null)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(null);
          const from = e.dataTransfer.getData("text/x-slot");
          if (from) {
            const [uid, r] = from.split("|");
            swapSlots({ uid, role: r as Role }, { uid: d.uid, role });
            return;
          }
          const p = photos.find((x) => x.key === e.dataTransfer.getData("text/x-photo-key"));
          if (p) assign(drafts, { uid: d.uid, role }, p);
        }}
        title={s ? "끌어서 다른 칸에 놓으면 서로 바뀝니다" : undefined}
        className={`relative h-28 w-36 overflow-hidden rounded-lg border-2 ${s ? "cursor-grab active:cursor-grabbing" : ""} ${
          isOver
            ? "border-sky-500 ring-2 ring-sky-200"
            : isActive
              ? "border-emerald-500 ring-2 ring-emerald-200"
              : s
                ? "border-slate-200"
                : "border-dashed border-slate-300"
        }`}
      >
        {s ? (
          <PhotoThumb photo={photo} name={s.name} className="h-full w-full" />
        ) : (
          <span className="text-xs text-slate-400">{isActive ? "왼쪽에서 사진 선택" : "클릭 후 사진 선택"}</span>
        )}
        <span
          className={`absolute left-1 top-1 rounded px-1.5 py-0.5 text-[10px] font-bold text-white ${
            role === "before" ? "bg-slate-700" : "bg-emerald-600"
          }`}
        >
          {role === "before" ? "BEFORE" : "AFTER"}
        </span>
        {s ? (
          <span
            role="button"
            tabIndex={0}
            title="빼기"
            onClick={(e) => {
              e.stopPropagation();
              update((prev) => prev.map((x) => (x.uid === d.uid ? { ...x, [role]: null } : x)));
            }}
            className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs text-slate-700 hover:bg-white"
          >
            ×
          </span>
        ) : null}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      <PhotoSourceBar state={photosState} />
      {missing && photos.length ? (
        <Notice tone="warning">
          저장된 짝 중 일부 사진이 지금 열린 사진에 없습니다. 그 사진이 들어 있는 폴더도 &quot;+ 사진 폴더 추가&quot;로 함께
          열어 주세요. (사진을 옮겼거나 이름을 바꿨다면 다시 넣어 주세요.)
        </Notice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-5">
        <section
          className={`${card} p-3 lg:col-span-2`}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes("Files")) e.preventDefault();
          }}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return;
            e.preventDefault();
            void photosState.addFiles(e.dataTransfer.files);
          }}
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">내 PC 사진</h3>
            <span className="text-xs text-slate-500">촬영 시간 순</span>
            <div className="flex-1" />
            <button type="button" className={btnGhost} disabled={trayPhotos.length < 2} onClick={() => autoPair("alternate")}>
              번갈아 짝 (1-2, 3-4)
            </button>
            <button type="button" className={btnGhost} disabled={trayPhotos.length < 2} onClick={() => autoPair("half")}>
              절반씩 짝 (앞 전 / 뒤 후)
            </button>
          </div>
          {sources.length > 1 ? (
            <div className="mb-2 space-y-2">
              <div className="flex flex-wrap gap-1">
                {["", ...names].map((n) => (
                  <button
                    key={n || "all"}
                    type="button"
                    onClick={() => setSourceFilter(n)}
                    className={`rounded-full px-2.5 py-0.5 text-xs ${
                      filter === n ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {n || `전체 ${photos.length}`}
                    {n ? ` ${sources.find((s) => s.name === n)?.count ?? 0}` : ""}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1.5 text-xs text-slate-700">
                <span className="font-medium">폴더끼리 짝:</span>
                <span>전</span>
                <select
                  className="rounded border border-slate-300 bg-white px-1 py-0.5"
                  value={beforeSrc}
                  onChange={(e) => setBeforePick(e.target.value)}
                >
                  {names.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span>후</span>
                <select
                  className="rounded border border-slate-300 bg-white px-1 py-0.5"
                  value={afterSrc}
                  onChange={(e) => setAfterPick(e.target.value)}
                >
                  {names
                    .filter((n) => n !== beforeSrc)
                    .map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                </select>
                <button type="button" className={`${btnGhost} bg-white`} disabled={!afterSrc} onClick={autoPairFolders}>
                  순서대로 짝 맞추기
                </button>
              </div>
            </div>
          ) : null}
          {trayPhotos.length ? (
            <div className="grid max-h-[560px] grid-cols-3 gap-2 overflow-y-auto pr-1">
              {trayPhotos.map((p, i) => (
                <button
                  key={p.key}
                  type="button"
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData("text/x-photo-key", p.key)}
                  onClick={() => clickTray(p)}
                  className={`relative aspect-square overflow-hidden rounded-md border ${
                    usedKeys.has(p.key) ? "border-emerald-400 opacity-50" : "border-slate-200 hover:border-slate-400"
                  }`}
                  title={p.name}
                >
                  <PhotoThumb photo={p} className="h-full w-full" />
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[10px] text-white">{i + 1}</span>
                  {usedKeys.has(p.key) ? (
                    <span className="absolute right-1 top-1 rounded bg-emerald-600 px-1 text-[10px] text-white">사용</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-slate-500">
              위에서 사진 폴더를 선택하거나, 탐색기에서 사진 파일을 여기로 끌어다 놓으세요.
              <br />
              청소 전·후 폴더가 따로 있으면 두 폴더를 모두 추가하면 됩니다.
            </p>
          )}
        </section>

        <section className={`${card} p-3 lg:col-span-3`}>
          <div className="mb-2 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">전후 짝 ({drafts.length})</h3>
            <span className="text-xs text-slate-500">이 순서대로 블로그에 들어갑니다</span>
          </div>
          <datalist id="pair-label-suggestions">
            {[...new Set([...labelSuggestions, ...SPACE_TYPES])].map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
          <ol className="space-y-3">
            {drafts.map((d, i) => (
              <li key={d.uid} className="rounded-lg border border-slate-200 p-3">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="mt-1 w-5 text-sm font-bold text-slate-400">{i + 1}</span>
                  {renderSlot(d, "before")}
                  {renderSlot(d, "after")}
                  <div className="min-w-[180px] flex-1 space-y-2">
                    <input
                      className={input}
                      list="pair-label-suggestions"
                      placeholder="이름 (예: 욕실 물때)"
                      value={d.label}
                      maxLength={50}
                      onChange={(e) => setField(d.uid, "label", e.target.value)}
                    />
                    <input
                      className={input}
                      placeholder="메모 (선택, 예: 수전 주변 하얀 물때)"
                      value={d.memo}
                      maxLength={200}
                      onChange={(e) => setField(d.uid, "memo", e.target.value)}
                    />
                    <div className="flex gap-1">
                      <button type="button" className={btnGhost} disabled={i === 0} onClick={() => move(d.uid, -1)}>
                        ▲ 위로
                      </button>
                      <button
                        type="button"
                        className={btnGhost}
                        disabled={i === drafts.length - 1}
                        onClick={() => move(d.uid, 1)}
                      >
                        ▼ 아래로
                      </button>
                      <button
                        type="button"
                        className={`${btnGhost} text-rose-600`}
                        onClick={() => update((prev) => prev.filter((x) => x.uid !== d.uid))}
                      >
                        짝 삭제
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={btnSecondary}
              disabled={drafts.length >= 40}
              onClick={() => {
                const fresh: PairDraft = { uid: newUid(), id: null, label: "", memo: "", before: null, after: null };
                update((prev) => [...prev, fresh]);
                setActive({ uid: fresh.uid, role: "before" });
              }}
            >
              + 짝 추가
            </button>
            <span className="text-xs text-slate-500">이름과 메모는 AI가 문단 주제로 사용합니다.</span>
            <div className="flex-1" />
            {savedAt ? <span className="text-xs text-emerald-700">{savedAt} 저장됨</span> : null}
            {dirty ? <span className="text-xs text-amber-700">저장 안 됨</span> : null}
            <button type="button" className={btnPrimary} disabled={saving || !dirty} onClick={save}>
              {saving ? "저장 중…" : "정렬 저장"}
            </button>
          </div>
          {error ? (
            <div className="mt-2">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
