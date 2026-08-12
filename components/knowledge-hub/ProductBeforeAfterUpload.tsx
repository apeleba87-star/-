"use client";

import { useState } from "react";
import BeforeAfterCompare from "@/components/knowledge-hub/BeforeAfterCompare";
import ImageFocalEditor from "@/components/knowledge-hub/ImageFocalEditor";
import type { ProductBeforeAfterPair } from "@/lib/knowledge-hub/media/product-before-after-types";
import type { KnowledgeMediaRole } from "@/lib/knowledge-hub/media/constants";

type Props = {
  productId: string;
  productName: string;
  initial?: ProductBeforeAfterPair;
};

async function uploadSide(
  file: File,
  productId: string,
  role: Extract<KnowledgeMediaRole, "before" | "after">,
  caption: string
): Promise<string> {
  const fd = new FormData();
  fd.set("file", file);
  fd.set("entity_type", "product");
  fd.set("entity_id", productId);
  fd.set("role", role);
  if (caption.trim()) fd.set("alt", caption.trim());

  const res = await fetch("/api/admin/knowledge-media/upload", {
    method: "POST",
    body: fd,
  });
  const json = (await res.json()) as { ok?: boolean; error?: string; url?: string };
  if (!res.ok || !json.ok || !json.url) {
    throw new Error(json.error ?? "업로드 실패");
  }
  return json.url;
}

async function saveMeta(
  productId: string,
  role: Extract<KnowledgeMediaRole, "before" | "after">,
  payload: { alt?: string | null; focal_x?: number; focal_y?: number }
): Promise<void> {
  const res = await fetch("/api/admin/knowledge-media/caption", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      entity_type: "product",
      entity_id: productId,
      role,
      ...payload,
    }),
  });
  const json = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.error ?? "저장 실패");
  }
}

export default function ProductBeforeAfterUpload({ productId, productName, initial }: Props) {
  const [beforeUrl, setBeforeUrl] = useState(initial?.beforeUrl ?? null);
  const [afterUrl, setAfterUrl] = useState(initial?.afterUrl ?? null);
  const [beforeCaption, setBeforeCaption] = useState(initial?.beforeCaption ?? "");
  const [afterCaption, setAfterCaption] = useState(initial?.afterCaption ?? "");
  const [beforeFocalX, setBeforeFocalX] = useState(initial?.beforeFocalX ?? 50);
  const [beforeFocalY, setBeforeFocalY] = useState(initial?.beforeFocalY ?? 50);
  const [afterFocalX, setAfterFocalX] = useState(initial?.afterFocalX ?? 50);
  const [afterFocalY, setAfterFocalY] = useState(initial?.afterFocalY ?? 50);
  const [loading, setLoading] = useState<"before" | "after" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  async function onFile(side: "before" | "after", file: File | null) {
    if (!file) return;
    setLoading(side);
    setError(null);
    setMsg(null);
    try {
      const caption = side === "before" ? beforeCaption : afterCaption;
      const url = await uploadSide(file, productId, side, caption);
      if (side === "before") {
        setBeforeUrl(url);
        setBeforeFocalX(50);
        setBeforeFocalY(50);
      } else {
        setAfterUrl(url);
        setAfterFocalX(50);
        setAfterFocalY(50);
      }
      setMsg("업로드되었습니다. 드래그로 위치를 맞춘 뒤 저장하세요.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "업로드 실패");
    } finally {
      setLoading(null);
    }
  }

  async function onSaveAll() {
    setLoading("save");
    setError(null);
    setMsg(null);
    try {
      if (beforeUrl) {
        await saveMeta(productId, "before", {
          alt: beforeCaption.trim() || null,
          focal_x: beforeFocalX,
          focal_y: beforeFocalY,
        });
      }
      if (afterUrl) {
        await saveMeta(productId, "after", {
          alt: afterCaption.trim() || null,
          focal_x: afterFocalX,
          focal_y: afterFocalY,
        });
      }
      setMsg("설명·위치가 저장되었습니다.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장 실패");
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
      <p className="text-sm font-bold text-slate-900">사용 전 · 후 (제품당 1세트)</p>
      <p className="mt-1 text-xs text-slate-500">
        고정 프레임에 꽉 채웁니다. 세로·가로 사진은 드래그로 맞춰 주세요. 전·후 모두 있어야 공개됩니다.
      </p>
      <p className="mt-1 text-xs text-amber-800">
        위치 저장을 위해{" "}
        <code className="rounded bg-amber-50 px-1">202_knowledge_media_focal.sql</code> 적용이 필요합니다.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-bold text-slate-600">사용 전 사진</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={loading !== null}
            className="mt-1 block w-full text-xs"
            onChange={(e) => onFile("before", e.target.files?.[0] ?? null)}
          />
          {beforeUrl ? (
            <div className="mt-2">
              <ImageFocalEditor
                src={beforeUrl}
                alt={beforeCaption || `${productName} 사용 전`}
                focalX={beforeFocalX}
                focalY={beforeFocalY}
                onChange={(x, y) => {
                  setBeforeFocalX(x);
                  setBeforeFocalY(y);
                }}
              />
            </div>
          ) : null}
          <input
            type="text"
            value={beforeCaption}
            onChange={(e) => setBeforeCaption(e.target.value)}
            placeholder={`예: ${productName} 기계 세정 전`}
            className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
          />
        </div>
        <div>
          <p className="text-xs font-bold text-slate-600">사용 후 사진</p>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            disabled={loading !== null}
            className="mt-1 block w-full text-xs"
            onChange={(e) => onFile("after", e.target.files?.[0] ?? null)}
          />
          {afterUrl ? (
            <div className="mt-2">
              <ImageFocalEditor
                src={afterUrl}
                alt={afterCaption || `${productName} 사용 후`}
                focalX={afterFocalX}
                focalY={afterFocalY}
                onChange={(x, y) => {
                  setAfterFocalX(x);
                  setAfterFocalY(y);
                }}
              />
            </div>
          ) : null}
          <input
            type="text"
            value={afterCaption}
            onChange={(e) => setAfterCaption(e.target.value)}
            placeholder={`예: ${productName} 기계 세정 후`}
            className="mt-2 w-full rounded-lg border border-slate-200 px-2.5 py-2 text-sm"
          />
        </div>
      </div>

      {(beforeUrl || afterUrl) && (
        <button
          type="button"
          disabled={loading !== null}
          onClick={onSaveAll}
          className="mt-3 rounded-lg bg-teal-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
        >
          {loading === "save" ? "저장 중…" : "설명·위치 저장"}
        </button>
      )}

      {loading && loading !== "save" ? (
        <p className="mt-2 text-xs text-slate-500">업로드 중…</p>
      ) : null}
      {msg ? <p className="mt-2 text-xs font-medium text-teal-800">{msg}</p> : null}
      {error ? <p className="mt-2 text-xs text-rose-600">{error}</p> : null}

      {beforeUrl && afterUrl ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-bold text-slate-500">공개 미리보기</p>
          <BeforeAfterCompare
            beforeUrl={beforeUrl}
            afterUrl={afterUrl}
            beforeCaption={beforeCaption || "사용 전"}
            afterCaption={afterCaption || "사용 후"}
            beforeAlt={beforeCaption || `${productName} 사용 전`}
            afterAlt={afterCaption || `${productName} 사용 후`}
            beforeFocalX={beforeFocalX}
            beforeFocalY={beforeFocalY}
            afterFocalX={afterFocalX}
            afterFocalY={afterFocalY}
          />
        </div>
      ) : null}
    </div>
  );
}
