"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Check, X, ExternalLink, ArrowRight } from "lucide-react";
import type { KnowledgeProductRow } from "@/lib/knowledge-hub/types";

type Props = {
  product: KnowledgeProductRow;
  href: string;
  internalLink?: boolean;
  canEdit: boolean;
  coupangLabel?: string;
};

export default function GuideProductCard({ product, href, internalLink, canEdit, coupangLabel }: Props) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(product.display_name);
  const [url, setUrl] = useState(product.source_url);
  const [sourceType, setSourceType] = useState(product.source_type);
  const [keyword, setKeyword] = useState(product.coupang_keyword ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSeed = product.id.startsWith("kp-");

  async function save() {
    if (isSeed) {
      setError("시드 데이터입니다. DB 시드 후 편집하세요.");
      return;
    }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/knowledge-products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: name,
        source_url: url,
        source_type: sourceType,
        coupang_keyword: sourceType === "coupang" ? keyword : null,
      }),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error ?? "저장 실패");
      return;
    }
    setEditing(false);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      {product.is_primary ? (
        <span className="mb-2 inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-800">
          추천
        </span>
      ) : null}
      {!editing ? (
        <>
          <p className="text-base font-bold text-slate-900">{name}</p>
          <p className="mt-1 text-xs text-slate-500">
            {sourceType === "smartstore" ? "스마트스토어" : "쿠팡"}
            {coupangLabel ? ` · ${coupangLabel}` : null}
          </p>
          {internalLink ? (
            <Link
              href={href}
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-bold text-white"
            >
              제품 상세 보기
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="mt-3 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 text-sm font-bold text-white"
            >
              {sourceType === "smartstore" ? "스마트스토어에서 보기" : "쿠팡에서 보기"}
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
          {canEdit ? (
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="mt-2 inline-flex min-h-[44px] items-center gap-1 text-sm font-bold text-teal-700"
            >
              <Pencil className="h-4 w-4" />
              편집
            </button>
          ) : null}
        </>
      ) : (
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
            placeholder="상품명"
          />
          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value as "coupang" | "smartstore")}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
          >
            <option value="coupang">쿠팡</option>
            <option value="smartstore">스마트스토어</option>
          </select>
          {sourceType === "smartstore" ? (
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
              placeholder="스마트스토어 URL"
            />
          ) : (
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-base"
              placeholder="쿠팡 검색 키워드"
            />
          )}
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white"
            >
              <Check className="h-4 w-4" />
              저장
            </button>
            <button type="button" onClick={() => setEditing(false)} className="inline-flex min-h-[44px] rounded-xl border px-4 py-2 text-sm font-bold">
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
