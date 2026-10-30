"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  filesToPhotos,
  forgetFolder,
  pickFolder,
  releasePhotos,
  rememberedFolders,
  reopenRememberedFolders,
  supportsFolderAccess,
  type FolderRead,
  type LocalPhoto,
} from "@/lib/ai-blog/local-media";

export type PhotoSide = "before" | "after";

export type PhotoSource = {
  name: string;
  kind: "folder" | "files";
  count: number;
  /** 전/후 패널에서 연 소스. 없으면 공통(전송 등) */
  side?: PhotoSide;
};

export type LocalPhotosState = {
  photos: LocalPhoto[];
  sources: PhotoSource[];
  /** 기억은 돼 있지만 아직 열지 않은 폴더 */
  pendingRemembered: string[];
  supported: boolean;
  loading: boolean;
  error: string | null;
  info: string | null;
  addFolder: (side?: PhotoSide) => Promise<void>;
  reopen: () => Promise<void>;
  addFiles: (files: FileList | File[], side?: PhotoSide) => Promise<void>;
  removeSource: (name: string) => void;
  photosForSide: (side: PhotoSide) => LocalPhoto[];
  sourcesForSide: (side: PhotoSide) => PhotoSource[];
};

type Group = { source: PhotoSource; photos: LocalPhoto[] };

const sideStoreKey = (projectId: string) => `ai-blog-photo-sides:${projectId}`;

function loadSideMap(projectId: string): Record<string, PhotoSide> {
  try {
    const raw = localStorage.getItem(sideStoreKey(projectId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, string>;
    const out: Record<string, PhotoSide> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v === "before" || v === "after") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function saveSide(projectId: string, name: string, side: PhotoSide | undefined) {
  try {
    const map = loadSideMap(projectId);
    if (side) map[name] = side;
    else delete map[name];
    localStorage.setItem(sideStoreKey(projectId), JSON.stringify(map));
  } catch {
    /* noop */
  }
}

function emptyMessage(r: FolderRead): string {
  return r.scanned
    ? `"${r.folderName}" 폴더에서 사진을 찾지 못했습니다. (파일 ${r.scanned}개 확인, 지원 형식: JPG·PNG·HEIC·WEBP 등)${
        r.skipped ? ` 읽지 못한 파일 ${r.skipped}개 — OneDrive 등 클라우드에만 있는 파일이면 PC에 내려받아 주세요.` : ""
      }`
    : `"${r.folderName}" 폴더가 비어 있습니다. 사진이 들어 있는 폴더를 선택해 주세요.`;
}

export function useLocalPhotos(projectId: string): LocalPhotosState {
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingRemembered, setPendingRemembered] = useState<string[]>([]);
  const [supported, setSupported] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const groupsRef = useRef<Group[]>([]);

  const commit = useCallback((next: Group[]) => {
    groupsRef.current = next;
    setGroups(next);
  }, []);

  /** 같은 이름의 소스는 교체, 새 소스는 뒤에 추가. 다른 소스에 이미 있는 사진은 중복으로 넣지 않는다. */
  const upsert = useCallback(
    (source: PhotoSource, photos: LocalPhoto[]) => {
      const prev = groupsRef.current;
      const old = prev.find((g) => g.source.name === source.name);
      if (old) releasePhotos(old.photos);
      const others = prev.filter((g) => g.source.name !== source.name);
      const taken = new Set(others.flatMap((g) => g.photos.map((p) => p.key)));
      const fresh = photos.filter((p) => !taken.has(p.key));
      releasePhotos(photos.filter((p) => taken.has(p.key)));
      const side = source.side ?? old?.source.side;
      const group = { source: { ...source, side, count: fresh.length }, photos: fresh };
      if (side) saveSide(projectId, source.name, side);
      commit(old ? prev.map((g) => (g.source.name === source.name ? group : g)) : [...prev, group]);
      setPendingRemembered((names) => names.filter((n) => n !== source.name));
    },
    [commit, projectId],
  );

  const applyReads = useCallback(
    (reads: FolderRead[], side?: PhotoSide) => {
      const errors: string[] = [];
      let skipped = 0;
      const sideMap = loadSideMap(projectId);
      for (const r of reads) {
        if (!r.photos.length) {
          errors.push(emptyMessage(r));
          continue;
        }
        skipped += r.skipped;
        const resolved = side ?? sideMap[r.folderName];
        upsert(
          { name: r.folderName, kind: "folder", count: r.photos.length, side: resolved },
          r.photos,
        );
      }
      if (errors.length) setError(errors.join(" "));
      if (skipped) setInfo(`읽지 못한 사진 ${skipped}장은 건너뛰었습니다. OneDrive 등 클라우드에만 있는 파일이면 PC에 내려받아 주세요.`);
    },
    [upsert, projectId],
  );

  const run = useCallback(async (fn: () => Promise<void>) => {
    setLoading(true);
    setError(null);
    setInfo(null);
    try {
      await fn();
    } catch (e) {
      const name = (e as DOMException)?.name;
      setError(
        name === "SecurityError" || name === "NotAllowedError"
          ? "이 폴더는 브라우저 보안 정책상 열 수 없습니다(바탕화면·문서 폴더 자체 등). 그 안의 하위 폴더를 선택하거나 '사진 파일 추가'를 이용해 주세요."
          : `사진 폴더를 읽지 못했습니다. (${name || (e as Error)?.message || "알 수 없는 오류"}) '사진 파일 추가'를 이용해 주세요.`,
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setSupported(supportsFolderAccess());
    let cancelled = false;
    void (async () => {
      const list = await rememberedFolders(projectId);
      if (cancelled || !list.length) return;
      setPendingRemembered(list.map((f) => f.name));
      if (!list.some((f) => f.granted)) return;
      setLoading(true);
      try {
        const { reads } = await reopenRememberedFolders(projectId, true);
        if (!cancelled) applyReads(reads);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, applyReads]);

  useEffect(() => () => groupsRef.current.forEach((g) => releasePhotos(g.photos)), []);

  const addFolder = useCallback(
    (side?: PhotoSide) =>
      run(async () => {
        const got = await pickFolder(projectId);
        if (got) applyReads([got], side);
      }),
    [projectId, applyReads, run],
  );

  const reopen = useCallback(
    () =>
      run(async () => {
        const { reads, denied } = await reopenRememberedFolders(projectId);
        applyReads(reads);
        if (denied.length) setError(`폴더 접근이 허용되지 않았습니다: ${denied.join(", ")}. '사진 폴더 추가'로 다시 선택해 주세요.`);
      }),
    [projectId, applyReads, run],
  );

  const addFiles = useCallback(
    (files: FileList | File[], side?: PhotoSide) =>
      run(async () => {
        const n = groupsRef.current.filter((g) => g.source.kind === "files").length + 1;
        const label = side === "before" ? "전" : side === "after" ? "후" : "직접";
        const name = `${label} 선택 ${n}`;
        const photos = await filesToPhotos(Array.from(files), name);
        if (!photos.length) {
          setError("선택한 파일 중 사진이 없습니다. (지원 형식: JPG·PNG·HEIC·WEBP 등)");
          return;
        }
        upsert({ name, kind: "files", count: photos.length, side }, photos);
      }),
    [upsert, run],
  );

  const removeSource = useCallback(
    (name: string) => {
      const g = groupsRef.current.find((x) => x.source.name === name);
      if (g) releasePhotos(g.photos);
      commit(groupsRef.current.filter((x) => x.source.name !== name));
      setPendingRemembered((names) => names.filter((n) => n !== name));
      saveSide(projectId, name, undefined);
      if (g?.source.kind !== "files") void forgetFolder(projectId, name);
    },
    [commit, projectId],
  );

  const photos = useMemo(() => groups.flatMap((g) => g.photos), [groups]);
  const sources = useMemo(() => groups.map((g) => g.source), [groups]);

  const photosForSide = useCallback(
    (side: PhotoSide) => {
      // side 없는 소스(이전 세션·공통 열기)는 전·후 양쪽에 보여 마이그레이션을 돕는다
      const names = new Set(
        groups.filter((g) => !g.source.side || g.source.side === side).map((g) => g.source.name),
      );
      if (!names.size) return [];
      return photos.filter((p) => names.has(p.source));
    },
    [groups, photos],
  );

  const sourcesForSide = useCallback(
    (side: PhotoSide) => sources.filter((s) => !s.side || s.side === side),
    [sources],
  );

  return {
    photos,
    sources,
    pendingRemembered,
    supported,
    loading,
    error,
    info,
    addFolder,
    reopen,
    addFiles,
    removeSource,
    photosForSide,
    sourcesForSide,
  };
}
