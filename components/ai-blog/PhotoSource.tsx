"use client";

import { Notice, btnPrimary, btnSecondary } from "@/components/ai-blog/ui";
import type { LocalPhotosState, PhotoSide } from "@/components/ai-blog/useLocalPhotos";
import { isPreviewable, type LocalPhoto } from "@/lib/ai-blog/local-media";

export function PhotoSourceBar({ state }: { state: LocalPhotosState }) {
  const { photos, sources, pendingRemembered, supported, loading, error, info, addFolder, reopen, addFiles, removeSource } =
    state;
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {supported ? (
          <>
            <button type="button" className={btnPrimary} disabled={loading} onClick={() => void addFolder()}>
              {photos.length ? "+ 사진 폴더 추가" : "사진 폴더 열기"}
            </button>
            {pendingRemembered.length ? (
              <button type="button" className={btnSecondary} disabled={loading} onClick={() => void reopen()}>
                이전 폴더 다시 열기 ({pendingRemembered.join(", ")})
              </button>
            ) : null}
          </>
        ) : null}
        <label className={`${supported ? btnSecondary : btnPrimary} cursor-pointer`}>
          사진 파일만 고르기
          <input
            type="file"
            accept="image/*,.heic,.heif,.jfif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </label>
        <span className="text-xs text-slate-500">
          {loading
            ? "사진을 읽는 중…"
            : photos.length
              ? `총 ${photos.length}장 · 내 PC에서만 열람, 서버로 전송하지 않음`
              : "청소 전·후 폴더가 따로 있으면 폴더를 하나씩 추가하세요. 사진은 서버에 올리지 않습니다."}
        </span>
      </div>
      {sources.length ? (
        <div className="flex flex-wrap gap-1.5">
          {sources.map((s) => (
            <span
              key={s.name}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
            >
              <span className="text-slate-400">{s.kind === "folder" ? "폴더" : "파일"}</span> {s.name} · {s.count}장
              <button
                type="button"
                className="ml-1 text-slate-400 hover:text-rose-600"
                title="목록에서 빼기 (파일은 지워지지 않음)"
                onClick={() => removeSource(s.name)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {!supported ? (
        <Notice tone="info">
          크롬 PC에서 사용하면 폴더를 한 번만 선택해 두고 다음에도 바로 열 수 있습니다.
        </Notice>
      ) : null}
      {error ? <Notice tone="error">{error}</Notice> : null}
      {info ? <Notice tone="warning">{info}</Notice> : null}
    </div>
  );
}

/** 전/후 패널용: 폴더·파일 선택 + 해당 쪽 소스만 표시 */
export function SideSourceControls({
  state,
  side,
  compact,
}: {
  state: LocalPhotosState;
  side: PhotoSide;
  compact?: boolean;
}) {
  const { supported, loading, pendingRemembered, reopen, addFolder, addFiles, removeSource, sourcesForSide } = state;
  const sideSources = sourcesForSide(side);
  const label = side === "before" ? "전" : "후";
  const btn = compact ? "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40" : btnSecondary;
  const primaryBtn = compact
    ? "inline-flex items-center justify-center rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-40"
    : btnPrimary;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {supported ? (
          <button type="button" className={primaryBtn} disabled={loading} onClick={() => void addFolder(side)}>
            폴더 선택
          </button>
        ) : null}
        <label className={`${supported ? btn : primaryBtn} cursor-pointer`}>
          파일 선택
          <input
            type="file"
            accept="image/*,.heic,.heif,.jfif"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void addFiles(e.target.files, side);
              e.target.value = "";
            }}
          />
        </label>
        {pendingRemembered.length ? (
          <button type="button" className={btn} disabled={loading} onClick={() => void reopen()} title={pendingRemembered.join(", ")}>
            이전 폴더
          </button>
        ) : null}
      </div>
      {sideSources.length ? (
        <div className="flex flex-wrap gap-1">
          {sideSources.map((s) => (
            <span
              key={s.name}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-700"
            >
              <span className="truncate" title={s.name}>
                {s.kind === "folder" ? "폴더" : "파일"} {s.name} · {s.count}
              </span>
              <button
                type="button"
                className="shrink-0 text-slate-400 hover:text-rose-600"
                title={`${label} 목록에서 빼기`}
                onClick={() => removeSource(s.name)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PhotoThumb({
  photo,
  name,
  className = "",
}: {
  photo: LocalPhoto | null;
  name?: string;
  className?: string;
}) {
  if (photo && isPreviewable(photo.name)) {
    const fit = /\bobject-(contain|cover|fill|none|scale-down)\b/.test(className) ? "" : "object-cover";
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={photo.url} alt={photo.name} className={`${fit} ${className}`.trim()} draggable={false} />;
  }
  return (
    <div
      className={`flex items-center justify-center bg-slate-100 p-1 text-center text-[10px] leading-tight text-slate-500 ${className}`}
    >
      {photo ? `${photo.name} (미리보기 불가)` : name ? `${name} · 폴더에서 찾을 수 없음` : "비어 있음"}
    </div>
  );
}
