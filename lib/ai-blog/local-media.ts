/**
 * 현장 사진 로컬 처리 (크롬 PC 전용). 사진은 서버로 보내지 않는다.
 * - 현장별로 폴더 여러 개(예: 청소 전 / 청소 후)를 IndexedDB 에 기억 → 다시 열 때 권한만 허용하면 복원
 * - 파일명·크기·수정일로 저장된 메타데이터와 매칭
 * - 순번 이름으로 폴더 내보내기 (GPS 제거 옵션)
 */
import { readTakenAt, stripGps } from "@/lib/ai-blog/exif";

export type LocalPhoto = {
  key: string;
  file: File;
  name: string;
  size: number;
  lastModified: number;
  url: string;
  takenAt: string | null;
  source: string;
};

type PermissionMode = { mode: "read" | "readwrite" };
type DirHandle = FileSystemDirectoryHandle & {
  queryPermission?: (d: PermissionMode) => Promise<PermissionState>;
  requestPermission?: (d: PermissionMode) => Promise<PermissionState>;
  values: () => AsyncIterable<FileSystemHandle>;
};
type PickerWindow = Window & { showDirectoryPicker?: (o?: PermissionMode & { id?: string }) => Promise<DirHandle> };

const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|heic|heif|avif|gif|bmp)$/i;
const MAX_DEPTH = 3;
const MAX_FILES = 500;

export type FolderRead = { photos: LocalPhoto[]; folderName: string; scanned: number; skipped: number };
const DB_NAME = "cleanidex-ai-blog";
const STORE = "folders";

export function supportsFolderAccess(): boolean {
  return typeof window !== "undefined" && typeof (window as PickerWindow).showDirectoryPicker === "function";
}

export function photoKey(name: string, size: number, lastModified: number): string {
  return `${name}|${size}|${lastModified}`;
}

export function isPreviewable(name: string): boolean {
  return !/\.(heic|heif)$/i.test(name);
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const req = fn(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result as T);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

async function storedFolders(projectId: string): Promise<DirHandle[]> {
  try {
    const v = await idb<DirHandle | DirHandle[] | undefined>("readonly", (s) => s.get(projectId));
    return !v ? [] : Array.isArray(v) ? v : [v];
  } catch {
    return [];
  }
}

async function rememberFolder(projectId: string, handle: DirHandle) {
  try {
    const list = await storedFolders(projectId);
    for (const h of list) if (await h.isSameEntry(handle)) return;
    await idb("readwrite", (s) => s.put([...list, handle].slice(-6), projectId));
  } catch {
    /* 기억 실패해도 이번 세션은 계속 사용 */
  }
}

/** name 을 주면 그 폴더만, 없으면 현장의 기억된 폴더 전체를 잊는다 */
export async function forgetFolder(projectId: string, name?: string) {
  try {
    if (!name) {
      await idb("readwrite", (s) => s.delete(projectId));
      return;
    }
    const list = (await storedFolders(projectId)).filter((h) => h.name !== name);
    await idb("readwrite", (s) => (list.length ? s.put(list, projectId) : s.delete(projectId)));
  } catch {
    /* noop */
  }
}

async function toLocalPhoto(file: File, source: string): Promise<LocalPhoto> {
  let takenAt: string | null = null;
  if (/\.(jpe?g|jfif)$/i.test(file.name)) {
    try {
      takenAt = readTakenAt(await file.slice(0, 256 * 1024).arrayBuffer());
    } catch {
      takenAt = null;
    }
  }
  return {
    key: photoKey(file.name, file.size, file.lastModified),
    file,
    name: file.name,
    size: file.size,
    lastModified: file.lastModified,
    url: URL.createObjectURL(file),
    takenAt,
    source,
  };
}

export async function filesToPhotos(files: Iterable<File>, source: string): Promise<LocalPhoto[]> {
  const list = Array.from(files).filter((f) => IMAGE_EXT.test(f.name));
  const photos = await Promise.all(list.map((f) => toLocalPhoto(f, source)));
  return photos.sort((a, b) => (a.takenAt ?? "").localeCompare(b.takenAt ?? "") || a.name.localeCompare(b.name));
}

/** 하위 폴더(3단계)까지 사진을 모은다. 클라우드 전용 파일 등 읽기 실패한 파일은 건너뛴다. */
async function readFolder(handle: DirHandle): Promise<FolderRead> {
  const files: File[] = [];
  let scanned = 0;
  let skipped = 0;
  const walk = async (dir: DirHandle, depth: number) => {
    for await (const entry of dir.values()) {
      if (files.length >= MAX_FILES) return;
      if (entry.kind === "directory") {
        if (depth < MAX_DEPTH && !entry.name.startsWith(".")) await walk(entry as DirHandle, depth + 1);
        continue;
      }
      scanned++;
      if (!IMAGE_EXT.test(entry.name)) continue;
      try {
        files.push(await (entry as FileSystemFileHandle).getFile());
      } catch {
        skipped++;
      }
    }
  };
  await walk(handle, 0);
  return { photos: await filesToPhotos(files, handle.name), folderName: handle.name, scanned, skipped };
}

/** 폴더 선택 → 사진 목록. 핸들을 현장별 폴더 목록에 추가해 기억한다. */
export async function pickFolder(projectId: string): Promise<FolderRead | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    const handle = await picker({ mode: "read", id: "ai-blog-photos" });
    await rememberFolder(projectId, handle);
    return await readFolder(handle);
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return null;
    throw e;
  }
}

/** 기억한 폴더들의 권한 상태. 권한 요청은 사용자 클릭 안에서만 가능하므로 분리. */
export async function rememberedFolders(projectId: string): Promise<{ name: string; granted: boolean }[]> {
  const list = await storedFolders(projectId);
  return Promise.all(
    list.map(async (h) => {
      const state = await h.queryPermission?.({ mode: "read" }).catch(() => "prompt" as PermissionState);
      return { name: h.name, granted: state === "granted" };
    }),
  );
}

/** 기억한 폴더 다시 열기. onlyGranted 면 권한 창 없이 이미 허용된 폴더만 연다. */
export async function reopenRememberedFolders(
  projectId: string,
  onlyGranted = false,
): Promise<{ reads: FolderRead[]; denied: string[] }> {
  const reads: FolderRead[] = [];
  const denied: string[] = [];
  for (const h of await storedFolders(projectId)) {
    try {
      let state = (await h.queryPermission?.({ mode: "read" })) ?? "prompt";
      if (state !== "granted" && !onlyGranted) state = (await h.requestPermission?.({ mode: "read" })) ?? "denied";
      if (state === "granted") reads.push(await readFolder(h));
      else denied.push(h.name);
    } catch {
      denied.push(h.name);
    }
  }
  return { reads, denied };
}

export function releasePhotos(photos: LocalPhoto[]) {
  for (const p of photos) URL.revokeObjectURL(p.url);
}

/** 저장된 메타데이터(파일명·크기·수정일)와 로컬 사진 매칭. 정확 일치 → 파일명+크기 → 파일명 순. */
export function matchPhoto(
  media: { local_name: string; local_size: number | null; local_modified_at: string | null },
  photos: LocalPhoto[],
): LocalPhoto | null {
  const modified = media.local_modified_at ? new Date(media.local_modified_at).getTime() : null;
  return (
    photos.find((p) => p.name === media.local_name && p.size === media.local_size && p.lastModified === modified) ??
    photos.find((p) => p.name === media.local_name && p.size === media.local_size) ??
    photos.find((p) => p.name === media.local_name) ??
    null
  );
}

function extOf(name: string): string {
  const m = name.match(/\.[a-z0-9]+$/i);
  return m ? m[0].toLowerCase().replace(".jpeg", ".jpg") : ".jpg";
}

function stemOf(name: string): string {
  const stem = name.replace(/\.[^.]+$/, "") || "photo";
  return stem.replace(/[\\/:*?"<>|]/g, "_").trim() || "photo";
}

/** 전후 세트 번호 + 원본명 유지. 예: 01.20261011 전.jpg / 01.20261012 후.jpg */
export function exportFileName(pairNo: number, role: "BEFORE" | "AFTER", originalName: string): string {
  const label = role === "BEFORE" ? "전" : "후";
  return `${String(pairNo).padStart(2, "0")}.${stemOf(originalName)} ${label}${extOf(originalName)}`;
}

/** 블로그업로드 폴더에 우리가 쓴 파일인지 (새·구 형식 모두) */
const BLOG_UPLOAD_NAME = /^\d{2}\..+ (전|후)\.[a-z0-9]+$/i;
const LEGACY_STAGED_NAME = /^\d{2}_(before|after)\.[a-z0-9]+$/i;

async function exportBytes(photo: LocalPhoto, removeGps: boolean): Promise<Blob> {
  if (!removeGps || !/\.jpe?g$/i.test(photo.name)) return photo.file;
  const stripped = stripGps(await photo.file.arrayBuffer());
  return new Blob([stripped], { type: photo.file.type || "image/jpeg" });
}

export type ExportItem = { fileName: string; photo: LocalPhoto };

/** 사용자가 고른 폴더에 순번 이름으로 저장 */
export async function exportToFolder(
  items: ExportItem[],
  removeGps: boolean,
): Promise<{ folderName: string; written: number } | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  let dir: DirHandle;
  try {
    dir = await picker({ mode: "readwrite", id: "ai-blog-export" });
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return null;
    throw e;
  }
  let written = 0;
  for (const item of items) {
    const handle = await dir.getFileHandle(item.fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(await exportBytes(item.photo, removeGps));
    await writable.close();
    written++;
  }
  return { folderName: dir.name, written };
}

/** 서버에서 받은 원본을 사용자가 고른 폴더에 그대로 저장한다. */
export async function writeBlobsToFolder(
  items: { fileName: string; blob: Blob }[],
  removeGps: boolean,
): Promise<{ folderName: string; written: number } | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  let dir: DirHandle;
  try {
    dir = await picker({ mode: "readwrite", id: "ai-blog-export" });
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return null;
    throw e;
  }
  let written = 0;
  for (const item of items) {
    let body: Blob | ArrayBuffer = item.blob;
    if (removeGps && /\.jpe?g$/i.test(item.fileName)) {
      body = new Blob([stripGps(await item.blob.arrayBuffer())], { type: "image/jpeg" });
    }
    const handle = await dir.getFileHandle(item.fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(body);
    await writable.close();
    written++;
  }
  return { folderName: dir.name, written };
}

/*
 * 옮기기 폴더(레거시): 한 장씩 넣는 스테이징.
 * 현장 폴더(권장): 블로그업로드 / 원본_미사용 으로 한 번에 정리.
 */
const STAGE_KEY = "__stage__";
const FIELD_PREFIX = "field:";
const UPLOAD_DIR = "블로그업로드";
const UNUSED_DIR = "원본_미사용";
const STAGED_NAME = LEGACY_STAGED_NAME;

/** 탐색기용 현장 폴더명. 예: 자양동 34평 입주청소 */
export function siteFolderName(p: {
  region_dong?: string | null;
  region_sigungu?: string | null;
  area_pyeong?: number | null;
  service_type?: string | null;
}): string {
  const place = (p.region_dong || p.region_sigungu || "현장").trim();
  const size = p.area_pyeong != null && Number.isFinite(p.area_pyeong) ? `${p.area_pyeong}평` : "";
  const service = (p.service_type || "청소").trim();
  const raw = [place, size, service].filter(Boolean).join(" ");
  return raw.replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80) || "현장";
}

async function stageHandle(): Promise<DirHandle | null> {
  try {
    return (await idb<DirHandle | undefined>("readonly", (s) => s.get(STAGE_KEY))) ?? null;
  } catch {
    return null;
  }
}

export async function stageFolderInfo(): Promise<{ name: string; granted: boolean } | null> {
  const h = await stageHandle();
  if (!h) return null;
  const state = await h.queryPermission?.({ mode: "readwrite" }).catch(() => "prompt" as PermissionState);
  return { name: h.name, granted: state === "granted" };
}

export async function pickStageFolder(): Promise<string | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    const h = await picker({ mode: "readwrite", id: "ai-blog-stage" });
    await idb("readwrite", (s) => s.put(h, STAGE_KEY));
    return h.name;
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return null;
    throw e;
  }
}

/** 옮기기 폴더를 이 사진들로 교체. 사용자 클릭 안에서 호출해야 권한 확인 창을 띄울 수 있다. */
export async function stagePhotos(
  items: ExportItem[],
  removeGps: boolean,
): Promise<{ ok: true; folderName: string } | { ok: false; reason: "no_folder" | "denied" }> {
  const dir = await stageHandle();
  if (!dir) return { ok: false, reason: "no_folder" };
  let state = (await dir.queryPermission?.({ mode: "readwrite" })) ?? "prompt";
  if (state !== "granted") state = (await dir.requestPermission?.({ mode: "readwrite" })) ?? "denied";
  if (state !== "granted") return { ok: false, reason: "denied" };

  const keep = new Set(items.map((i) => i.fileName));
  const stale: string[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === "file" && STAGED_NAME.test(entry.name) && !keep.has(entry.name)) stale.push(entry.name);
  }
  await Promise.all(stale.map((n) => dir.removeEntry(n).catch(() => undefined)));

  for (const item of items) {
    const handle = await dir.getFileHandle(item.fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(await exportBytes(item.photo, removeGps));
    await writable.close();
  }
  return { ok: true, folderName: dir.name };
}

/** 사진 한 장만 다운로드 (서버 경유 없음) */
export async function downloadOne(item: ExportItem, removeGps: boolean) {
  const blob = await exportBytes(item.photo, removeGps);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = item.fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

async function fieldHandle(projectId: string): Promise<DirHandle | null> {
  try {
    return (await idb<DirHandle | undefined>("readonly", (s) => s.get(FIELD_PREFIX + projectId))) ?? null;
  } catch {
    return null;
  }
}

export async function fieldFolderInfo(projectId: string): Promise<{ name: string; granted: boolean } | null> {
  const h = await fieldHandle(projectId);
  if (!h) return null;
  const state = await h.queryPermission?.({ mode: "readwrite" }).catch(() => "prompt" as PermissionState);
  return { name: h.name, granted: state === "granted" };
}

/** 현장 사진을 모을 상위 폴더 선택 (안에 블로그업로드 / 원본_미사용 생성) */
export async function pickFieldFolder(projectId: string): Promise<string | null> {
  const picker = (window as PickerWindow).showDirectoryPicker;
  if (!picker) return null;
  try {
    const h = await picker({ mode: "readwrite", id: "ai-blog-field" });
    await idb("readwrite", (s) => s.put(h, FIELD_PREFIX + projectId));
    return h.name;
  } catch (e) {
    if ((e as DOMException)?.name === "AbortError") return null;
    throw e;
  }
}

async function ensureWritable(dir: DirHandle): Promise<boolean> {
  let state = (await dir.queryPermission?.({ mode: "readwrite" })) ?? "prompt";
  if (state !== "granted") state = (await dir.requestPermission?.({ mode: "readwrite" })) ?? "denied";
  return state === "granted";
}

async function clearManagedFiles(dir: DirHandle, pattern: RegExp) {
  const stale: string[] = [];
  for await (const entry of dir.values()) {
    if (entry.kind === "file" && pattern.test(entry.name)) stale.push(entry.name);
  }
  await Promise.all(stale.map((n) => dir.removeEntry(n).catch(() => undefined)));
}

async function writeItems(dir: DirHandle, items: ExportItem[], removeGps: boolean) {
  for (const item of items) {
    const handle = await dir.getFileHandle(item.fileName, { create: true });
    const writable = await handle.createWritable();
    await writable.write(await exportBytes(item.photo, removeGps));
    await writable.close();
  }
}

export type FieldOrganizeResult =
  | { ok: true; folderName: string; parentName: string; uploadCount: number; unusedCount: number }
  | { ok: false; reason: "no_folder" | "denied" | "unsupported" };

/**
 * 사용자가 고른 상위 폴더 안에
 *   {현장명}/블로그업로드 , {현장명}/원본_미사용
 * 을 만들고 사진을 복사한다.
 * 예전에 루트에 남아 있던 01_before.jpg 같은 옮기기용 파일도 지운다.
 */
export async function organizeFieldFolder(
  projectId: string,
  upload: ExportItem[],
  unused: LocalPhoto[],
  removeGps: boolean,
  siteName: string,
): Promise<FieldOrganizeResult> {
  if (!supportsFolderAccess()) return { ok: false, reason: "unsupported" };
  const parent = await fieldHandle(projectId);
  if (!parent) return { ok: false, reason: "no_folder" };
  if (!(await ensureWritable(parent))) return { ok: false, reason: "denied" };

  const folder = (siteName || "현장").replace(/[\\/:*?"<>|]/g, " ").replace(/\s+/g, " ").trim() || "현장";
  // 예전 방식: 상위 폴더 루트에 바로 두던 레거시 파일·폴더 잔여 정리
  await clearManagedFiles(parent, LEGACY_STAGED_NAME);
  await clearManagedFiles(parent, BLOG_UPLOAD_NAME);

  const siteDir = (await parent.getDirectoryHandle(folder, { create: true })) as DirHandle;
  const uploadDir = (await siteDir.getDirectoryHandle(UPLOAD_DIR, { create: true })) as DirHandle;
  const unusedDir = (await siteDir.getDirectoryHandle(UNUSED_DIR, { create: true })) as DirHandle;

  await clearManagedFiles(uploadDir, BLOG_UPLOAD_NAME);
  await clearManagedFiles(uploadDir, LEGACY_STAGED_NAME);
  await clearManagedFiles(siteDir, LEGACY_STAGED_NAME);
  await clearManagedFiles(unusedDir, /./);

  await writeItems(uploadDir, upload, removeGps);
  await writeItems(
    unusedDir,
    unused.map((p) => ({ fileName: p.name, photo: p })),
    removeGps,
  );

  return {
    ok: true,
    folderName: folder,
    parentName: parent.name,
    uploadCount: upload.length,
    unusedCount: unused.length,
  };
}
