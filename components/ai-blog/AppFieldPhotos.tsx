"use client";

import { useEffect, useState } from "react";
import { apiJson } from "@/lib/ai-blog/messages";
import type { MediaPair, ProjectMedia } from "@/lib/ai-blog/types";
import { Notice, btnPrimary, card } from "@/components/ai-blog/ui";
import { supportsFolderAccess, writeBlobsToFolder } from "@/lib/ai-blog/local-media";

type PhotoUrl = {
  id: string;
  mediaType: string;
  url: string | null;
  originalUrl: string | null;
  originalAvailable: boolean;
  expiresAt: string | null;
};

function dayLabel(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
}

export default function AppFieldPhotos({
  projectId,
  media,
  pairs,
}: {
  projectId: string;
  media: ProjectMedia[];
  pairs: MediaPair[];
}) {
  const [urls, setUrls] = useState<Map<string, PhotoUrl>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const [removeGps, setRemoveGps] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiJson<PhotoUrl[]>(`/api/ai-blog/projects/${projectId}/photo-urls`)
      .then((rows) => {
        if (cancelled) return;
        setUrls(new Map(rows.map((row) => [row.id, row])));
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const expiry = media
    .map((item) => item.original_expires_at)
    .filter((value): value is string => Boolean(value))
    .sort()[0];
  const originalLeft = media.some((item) => item.storage_path);

  const saveOriginals = async () => {
    setError(null);
    setSaved(null);
    if (!supportsFolderAccess()) {
      setError("원본 폴더 저장은 PC 크롬에서 사용할 수 있습니다.");
      return;
    }
    setSaving(true);
    try {
      const ready: { fileName: string; blob: Blob }[] = [];
      for (const [index, pair] of pairs.entries()) {
        const no = String(index + 1).padStart(2, "0");
        const label = (pair.label || "사진").replace(/[\\/:*?"<>|]/g, "_");
        for (const [mediaId, roleLabel] of [
          [pair.before_media_id, "전"],
          [pair.after_media_id, "후"],
        ] as const) {
          const item = mediaId ? urls.get(mediaId) : undefined;
          if (!item?.originalUrl) continue;
          const res = await fetch(item.originalUrl);
          if (!res.ok) throw new Error("original_download_failed");
          ready.push({ fileName: `${no}.${label} ${roleLabel}.jpg`, blob: await res.blob() });
        }
      }
      if (!ready.length) {
        setError("받을 원본이 없습니다. 보관 기간이 지났을 수 있습니다.");
        return;
      }
      const result = await writeBlobsToFolder(ready, removeGps);
      if (result) setSaved(`「${result.folderName}」에 원본 ${result.written}장을 넣었습니다.`);
    } catch {
      setError("원본을 폴더에 넣지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={`${card} p-4`}>
        <p className="text-sm text-slate-700">
          {originalLeft && expiry
            ? `원본 보관 기간 ~${dayLabel(expiry)}. 그 전에 네이버용 폴더를 만드세요. 이후에는 미리보기만 남습니다.`
            : "원본은 지워졌고 미리보기만 남았습니다. 네이버에 넣을 원본은 다시 받을 수 없습니다."}
        </p>
        {originalLeft ? (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={removeGps} onChange={(e) => setRemoveGps(e.target.checked)} />
              위치정보(GPS) 지우고 넣기
            </label>
            <button type="button" className={btnPrimary} disabled={saving} onClick={() => void saveOriginals()}>
              {saving ? "원본 받는 중…" : "네이버용 원본 폴더 만들기"}
            </button>
          </div>
        ) : null}
        {saved ? <p className="mt-2 text-sm text-emerald-700">{saved}</p> : null}
      </div>
      {error ? <Notice tone="error">{error}</Notice> : null}
      <div className="grid gap-3 sm:grid-cols-2">
        {pairs.map((pair) => {
          const before = urls.get(pair.before_media_id ?? "");
          const after = urls.get(pair.after_media_id ?? "");
          return (
            <div key={pair.id} className={`${card} p-3`}>
              <p className="text-sm font-semibold text-slate-900">{pair.label || "장소"}</p>
              <p className={`mb-2 text-xs ${pair.memo ? "text-slate-600" : "text-slate-400"}`}>
                {pair.memo ? `오염 상태 · ${pair.memo}` : "오염 상태 없음"}
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Shot url={before?.url} label="전" missing={!pair.before_media_id} />
                <Shot url={after?.url} label="후" missing={!pair.after_media_id} />
              </div>
              {!pair.before_media_id || !pair.after_media_id ? (
                <p className="mt-2 text-xs text-slate-500">앱에서 이어서 찍기</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Shot({ url, label, missing }: { url?: string | null; label: string; missing: boolean }) {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={label} className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] items-center justify-center text-xs text-slate-400">
          {missing ? "비어 있음" : label}
        </div>
      )}
      <p className="px-2 py-1 text-xs text-slate-600">{label}</p>
    </div>
  );
}
