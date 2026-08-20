"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";

export type EduImageAlign = "center" | "left" | "right" | "full";
export type EduImagePlace = "cursor" | "top" | "bottom";

const ALIGN_OPTIONS: { id: EduImageAlign; label: string }[] = [
  { id: "center", label: "가운데" },
  { id: "left", label: "왼쪽" },
  { id: "right", label: "오른쪽" },
  { id: "full", label: "넓게" },
];

const PLACE_OPTIONS: { id: EduImagePlace; label: string }[] = [
  { id: "cursor", label: "커서 위치" },
  { id: "top", label: "맨 위" },
  { id: "bottom", label: "맨 아래" },
];

const MAX_FILES = 20;

/** 본문 마크다운에 넣을 이미지 블록 (정렬은 title에 edu-align:*) */
export function buildEduImageMarkdown(url: string, alt: string, align: EduImageAlign): string {
  const safeAlt = (alt || "이미지").replace(/[[\]]/g, "");
  return `\n\n![${safeAlt}](${url} "edu-align:${align}")\n\n`;
}

export function insertMarkdownAt(
  body: string,
  chunk: string,
  place: EduImagePlace,
  cursor: { start: number; end: number } | null
): { next: string; cursor: number } {
  if (place === "top") {
    return { next: `${chunk.trimStart()}${body}`, cursor: chunk.trimStart().length };
  }
  if (place === "bottom") {
    const next = `${body.replace(/\s*$/, "")}${chunk}`;
    return { next, cursor: next.length };
  }
  const start = cursor?.start ?? body.length;
  const end = cursor?.end ?? start;
  const next = `${body.slice(0, start)}${chunk}${body.slice(end)}`;
  return { next, cursor: start + chunk.length };
}

type Props = {
  entityId: string;
  entityType?: "edu_blog" | "practice_blog";
  defaultAlt?: string;
  disabled?: boolean;
  onInsert: (chunk: string, place: EduImagePlace) => void;
};

/**
 * 청소지식 본문용 사진 업로드 (여러 장 한 번에 가능).
 * 업로드 후 선택한 위치·정렬로 마크다운 이미지를 본문에 넣는다.
 */
export default function EduBlogImageToolbar({
  entityId,
  entityType = "edu_blog",
  defaultAlt,
  disabled,
  onInsert,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [align, setAlign] = useState<EduImageAlign>("center");
  const [place, setPlace] = useState<EduImagePlace>("cursor");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
    const fd = new FormData();
    fd.set("file", file);
    fd.set("entity_type", entityType);
    fd.set("entity_id", entityId);
    fd.set("role", "inline");
    fd.set("alt", defaultAlt?.trim() || file.name.replace(/\.[^.]+$/, "") || "청소지식 이미지");

    try {
      const res = await fetch("/api/admin/knowledge-media/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; url?: string };
      if (!res.ok || !json.ok || !json.url) {
        return { ok: false, error: json.error ?? `${file.name} 업로드 실패` };
      }
      return { ok: true, url: json.url };
    } catch {
      return { ok: false, error: `${file.name} 네트워크 오류` };
    }
  }

  async function uploadFiles(fileList: FileList | File[]) {
    const files = [...fileList].filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setError("이미지 파일을 선택해 주세요.");
      return;
    }
    if (files.length > MAX_FILES) {
      setError(`한 번에 최대 ${MAX_FILES}장까지 올릴 수 있습니다.`);
      return;
    }

    setLoading(true);
    setError(null);
    setLastSummary(null);
    setProgress({ done: 0, total: files.length });

    const urls: string[] = [];
    const failures: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const result = await uploadOne(files[i]);
      if (result.ok) urls.push(result.url);
      else failures.push(result.error);
      setProgress({ done: i + 1, total: files.length });
    }

    if (urls.length > 0) {
      const alt = defaultAlt?.trim() || "이미지";
      const chunk = urls.map((url) => buildEduImageMarkdown(url, alt, align)).join("");
      onInsert(chunk, place);
      setLastSummary(`${urls.length}장 삽입됨 · 아래 문단 칸으로 드래그하세요`);
    }
    if (failures.length > 0) {
      setError(
        urls.length > 0
          ? `${urls.length}장 성공 · ${failures.length}장 실패: ${failures[0]}`
          : failures[0]
      );
    }

    setLoading(false);
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-teal-100 bg-teal-50/40 p-3 space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">사진 넣기</p>
        <button
          type="button"
          disabled={disabled || loading || !entityId}
          onClick={() => inputRef.current?.click()}
          className="inline-flex min-h-[40px] items-center gap-1.5 rounded-xl bg-teal-800 px-3 py-2 text-sm font-bold text-white hover:bg-teal-900 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
          {loading && progress
            ? `올리는 중… ${progress.done}/${progress.total}`
            : loading
              ? "올리는 중…"
              : "사진 선택 (여러 장)"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          className="hidden"
          disabled={disabled || loading}
          onChange={(e) => {
            const list = e.target.files;
            if (list?.length) void uploadFiles(list);
          }}
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500">위치</span>
        {PLACE_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setPlace(o.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              place === o.id ? "bg-teal-800 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-slate-500">정렬</span>
        {ALIGN_OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            onClick={() => setAlign(o.id)}
            className={`rounded-full px-2.5 py-1 text-xs font-bold ${
              align === o.id ? "bg-slate-900 text-white" : "bg-white text-slate-700 ring-1 ring-slate-200"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        사진은 먼저 넣은 뒤, 아래 문단 칸으로 드래그해 위치를 정하세요. (최대 {MAX_FILES}장)
      </p>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {lastSummary ? <p className="text-xs text-teal-800">{lastSummary}</p> : null}
    </div>
  );
}
