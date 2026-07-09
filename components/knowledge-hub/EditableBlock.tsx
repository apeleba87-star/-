"use client";

import { useState } from "react";
import { Pencil, Check, X } from "lucide-react";
import EntityRichText from "@/components/knowledge-hub/EntityRichText";

type Props = {
  guideSlug: string;
  blockId: string;
  field: "paragraphs" | "items" | "text";
  value: string | string[];
  canEdit: boolean;
  className?: string;
};

function DisplayContent({ field, value }: { field: Props["field"]; value: string | string[] }) {
  if (field === "text") {
    return (
      <p>
        <EntityRichText text={value as string} />
      </p>
    );
  }
  if (field === "paragraphs") {
    return (
      <>
        {(value as string[]).map((p) => (
          <p key={p}>
            <EntityRichText text={p} />
          </p>
        ))}
      </>
    );
  }
  return (
    <ul className="space-y-2">
      {(value as string[]).map((item) => (
        <li key={item} className="flex gap-2 text-base leading-relaxed text-slate-700">
          <span className="text-teal-600">✓</span>
          <EntityRichText text={item} />
        </li>
      ))}
    </ul>
  );
}

export default function EditableBlock({ guideSlug, blockId, field, value, canEdit, className }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(Array.isArray(value) ? value.join("\n") : value);
  const [current, setCurrent] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!canEdit) {
    return (
      <div className={className}>
        <DisplayContent field={field} value={current} />
      </div>
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    const patch: Record<string, unknown> = {};
    if (field === "paragraphs") {
      patch.paragraphs = draft
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (field === "items") {
      patch.items = draft
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } else {
      patch.text = draft;
    }
    const res = await fetch(`/api/admin/knowledge-guides/${guideSlug}/blocks/${blockId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const json = (await res.json()) as { ok?: boolean; error?: string };
    setSaving(false);
    if (!res.ok || !json.ok) {
      setError(json.error ?? "저장 실패");
      return;
    }
    const next =
      field === "paragraphs" || field === "items"
        ? draft
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean)
        : draft;
    setCurrent(next);
    setEditing(false);
  }

  return (
    <div className={`group relative ${className ?? ""}`}>
      {!editing ? (
        <>
          <DisplayContent field={field} value={current} />
          <button
            type="button"
            onClick={() => {
              setDraft(Array.isArray(current) ? current.join("\n") : String(current));
              setEditing(true);
            }}
            className="mt-2 inline-flex min-h-[44px] items-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm font-bold text-teal-800"
          >
            <Pencil className="h-4 w-4" aria-hidden />
            편집
          </button>
        </>
      ) : (
        <div className="rounded-2xl border-2 border-teal-300 bg-teal-50/50 p-4">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={Math.max(4, draft.split("\n").length + 1)}
            className="w-full rounded-xl border border-slate-200 p-3 text-base leading-relaxed"
          />
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white"
            >
              <Check className="h-4 w-4" />
              {saving ? "저장 중…" : "저장"}
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold"
            >
              <X className="h-4 w-4" />
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
