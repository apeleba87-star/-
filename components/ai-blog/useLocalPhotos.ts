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

export type PhotoSource = { name: string; kind: "folder" | "files"; count: number };

export type LocalPhotosState = {
  photos: LocalPhoto[];
  sources: PhotoSource[];
  /** 기억은 돼 있지만 아직 열지 않은 폴더 */
  pendingRemembered: string[];
  supported: boolean;
  loading: boolean;
  error: string | null;
  info: string | null;
  addFolder: () => Promise<void>;
  reopen: () => Promise<void>;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeSource: (name: string) => void;
};

type Group = { source: PhotoSource; photos: LocalPhoto[] };

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
      const group = { source: { ...source, count: fresh.length }, photos: fresh };
      commit(old ? prev.map((g) => (g.source.name === source.name ? group : g)) : [...prev, group]);
      setPendingRemembered((names) => names.filter((n) => n !== source.name));
    },
    [commit],
  );

  const applyReads = useCallback(
    (reads: FolderRead[]) => {
      const errors: string[] = [];
      let skipped = 0;
      for (const r of reads) {
        if (!r.photos.length) {
          errors.push(emptyMessage(r));
          continue;
        }
        skipped += r.skipped;
        upsert({ name: r.folderName, kind: "folder", count: r.photos.length }, r.photos);
      }
      if (errors.length) setError(errors.join(" "));
      if (skipped) setInfo(`읽지 못한 사진 ${skipped}장은 건너뛰었습니다. OneDrive 등 클라우드에만 있는 파일이면 PC에 내려받아 주세요.`);
    },
    [upsert],
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
    () =>
      run(async () => {
        const got = await pickFolder(projectId);
        if (got) applyReads([got]);
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
    (files: FileList | File[]) =>
      run(async () => {
        const n = groupsRef.current.filter((g) => g.source.kind === "files").length + 1;
        const name = `직접 선택 ${n}`;
        const photos = await filesToPhotos(Array.from(files), name);
        if (!photos.length) {
          setError("선택한 파일 중 사진이 없습니다. (지원 형식: JPG·PNG·HEIC·WEBP 등)");
          return;
        }
        upsert({ name, kind: "files", count: photos.length }, photos);
      }),
    [upsert, run],
  );

  const removeSource = useCallback(
    (name: string) => {
      const g = groupsRef.current.find((x) => x.source.name === name);
      if (g) releasePhotos(g.photos);
      commit(groupsRef.current.filter((x) => x.source.name !== name));
      setPendingRemembered((names) => names.filter((n) => n !== name));
      if (g?.source.kind !== "files") void forgetFolder(projectId, name);
    },
    [commit, projectId],
  );

  const photos = useMemo(() => groups.flatMap((g) => g.photos), [groups]);
  const sources = useMemo(() => groups.map((g) => g.source), [groups]);

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
  };
}
