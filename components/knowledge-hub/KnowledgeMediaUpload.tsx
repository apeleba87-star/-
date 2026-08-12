"use client";

import { useState } from "react";
import KnowledgeHeroImage from "@/components/knowledge-hub/KnowledgeHeroImage";
import type { KnowledgeMediaEntityType } from "@/lib/knowledge-hub/media/constants";

type Props = {
  entityType: KnowledgeMediaEntityType;
  entityId: string;
  /** 기본 alt (제품명 등) */
  defaultAlt?: string;
  onUploaded?: (url: string) => void;
};

/**
 * 관리자용 대표 이미지 업로드.
 * 서버에서 WebP·리사이즈 후 Storage에만 저장 (DB에는 URL·alt만).
 */
export default function KnowledgeMediaUpload({
  entityType,
  entityId,
  defaultAlt,
  onUploaded,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [url, setUrl] = useState<string | null>(null);

  async function onFile(file: File | null) {
    if (!file) return;
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("entity_type", entityType);
    fd.set("entity_id", entityId);
    fd.set("role", "cover");
    if (defaultAlt) fd.set("alt", defaultAlt);

    try {
      const res = await fetch("/api/admin/knowledge-media/upload", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as { ok?: boolean; error?: string; url?: string };
      if (!res.ok || !json.ok || !json.url) {
        setError(json.error ?? "업로드 실패");
        return;
      }
      setUrl(json.url);
      onUploaded?.(json.url);
    } catch {
      setError("네트워크 오류");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      <p className="text-sm font-bold text-slate-800">대표 이미지</p>
      <p className="mt-1 text-xs text-slate-500">
        JPEG·PNG·WebP · 자동 WebP 변환 · SEO alt 저장 · 원본은 보관하지 않음
      </p>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        disabled={loading || !entityId}
        className="mt-2 block w-full text-sm"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
      {loading ? <p className="mt-2 text-xs text-slate-500">변환·업로드 중…</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}
      {url ? (
        <div className="mt-3">
          <KnowledgeHeroImage src={url} alt={defaultAlt ?? entityId} variant="inline" />
          <p className="mt-2 break-all text-xs text-teal-800">업로드 완료</p>
        </div>
      ) : null}
    </div>
  );
}
