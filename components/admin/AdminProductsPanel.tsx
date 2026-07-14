"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Confidence, PHType } from "@/lib/knowledge-hub/cleaning-knowledge/types";

type ProductRow = {
  id: string;
  brand: string;
  name: string;
  aliases: string[];
  phType: PHType;
  phApprox: string | null;
  summary: string;
  mainUse: string[];
  compatibleMaterialIds: string[];
  contaminantIds: string[];
  forbiddenMaterialIds: string[];
  materialsRaw: string[];
  contaminantsRaw: string[];
  forbiddenRaw: string[];
  standardDilution: string;
  strongDilution: string;
  dwellTime: string;
  packSizes: string[];
  warnings: string[];
  confidence: Confidence;
  status: "active" | "discontinued" | "verify" | "draft";
  salesUrl: string | null;
  salesLabel: string | null;
  catalogOrigin: "source" | "source_override" | "admin";
  hasDbRow: boolean;
  isDeleted: boolean;
};

type Opt = { id: string; name: string };

type Props = {
  products: ProductRow[];
  materials: Opt[];
  contaminants: Opt[];
};

type FormState = {
  id: string;
  brand: string;
  name: string;
  aliases: string;
  phType: PHType;
  phApprox: string;
  summary: string;
  mainUse: string;
  materialsRaw: string;
  contaminantsRaw: string;
  forbiddenRaw: string;
  compatibleMaterialIds: string[];
  contaminantIds: string[];
  forbiddenMaterialIds: string[];
  standardDilution: string;
  strongDilution: string;
  dwellTime: string;
  packSizes: string;
  warnings: string;
  confidence: Confidence;
  status: ProductRow["status"];
  salesUrl: string;
  salesLabel: string;
};

const PH_OPTIONS: { value: PHType; label: string }[] = [
  { value: "strong_acid", label: "강산" },
  { value: "acid", label: "산성" },
  { value: "neutral", label: "중성" },
  { value: "weak_alkaline", label: "약알칼리" },
  { value: "alkaline", label: "알칼리" },
  { value: "strong_alkaline", label: "강알칼리" },
  { value: "oxidizing", label: "산화" },
  { value: "unknown", label: "미확인" },
];

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(list?: string[]): string {
  return (list ?? []).join("\n");
}

function emptyForm(): FormState {
  return {
    id: "",
    brand: "",
    name: "",
    aliases: "",
    phType: "unknown",
    phApprox: "",
    summary: "",
    mainUse: "",
    materialsRaw: "",
    contaminantsRaw: "",
    forbiddenRaw: "",
    compatibleMaterialIds: [],
    contaminantIds: [],
    forbiddenMaterialIds: [],
    standardDilution: "",
    strongDilution: "",
    dwellTime: "",
    packSizes: "",
    warnings: "",
    confidence: "medium",
    status: "draft",
    salesUrl: "",
    salesLabel: "",
  };
}

function fromProduct(p: ProductRow): FormState {
  return {
    id: p.id,
    brand: p.brand,
    name: p.name,
    aliases: listToLines(p.aliases),
    phType: p.phType,
    phApprox: p.phApprox ?? "",
    summary: p.summary ?? "",
    mainUse: listToLines(p.mainUse),
    materialsRaw: listToLines(p.materialsRaw),
    contaminantsRaw: listToLines(p.contaminantsRaw),
    forbiddenRaw: listToLines(p.forbiddenRaw),
    compatibleMaterialIds: [...(p.compatibleMaterialIds ?? [])],
    contaminantIds: [...(p.contaminantIds ?? [])],
    forbiddenMaterialIds: [...(p.forbiddenMaterialIds ?? [])],
    standardDilution: p.standardDilution ?? "",
    strongDilution: p.strongDilution ?? "",
    dwellTime: p.dwellTime ?? "",
    packSizes: listToLines(p.packSizes),
    warnings: listToLines(p.warnings),
    confidence: p.confidence,
    status: p.status ?? "active",
    salesUrl: p.salesUrl ?? "",
    salesLabel: p.salesLabel ?? "",
  };
}

function originLabel(p: ProductRow): string {
  if (p.isDeleted) return "삭제됨";
  if (p.catalogOrigin === "admin") return "관리자";
  if (p.catalogOrigin === "source_override") return "문서+수정";
  return "문서";
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-bold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";
const taClass = `${inputClass} min-h-[88px]`;

export default function AdminProductsPanel({ products, materials, contaminants }: Props) {
  const [rows, setRows] = useState(products);
  const [screen, setScreen] = useState<"list" | "edit">("list");
  const [isCreate, setIsCreate] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? rows.filter(
          (p) =>
            p.name.toLowerCase().includes(needle) ||
            p.brand.toLowerCase().includes(needle) ||
            p.id.toLowerCase().includes(needle)
        )
      : rows;
    return [...list].sort((a, b) => {
      if (a.isDeleted !== b.isDeleted) return a.isDeleted ? 1 : -1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [rows, q]);

  function patchForm(patch: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...patch }));
  }

  function toggleId(key: "compatibleMaterialIds" | "contaminantIds" | "forbiddenMaterialIds", id: string) {
    setForm((prev) => {
      const cur = prev[key];
      return {
        ...prev,
        [key]: cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id],
      };
    });
  }

  function startCreate() {
    setIsCreate(true);
    setForm(emptyForm());
    setMsg(null);
    setScreen("edit");
  }

  function startEdit(p: ProductRow) {
    setIsCreate(false);
    setForm(fromProduct(p));
    setMsg(null);
    setScreen("edit");
  }

  function goToList() {
    setScreen("list");
    setMsg(null);
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cleaning-products", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: form.id,
          brand: form.brand,
          name: form.name,
          aliases: linesToList(form.aliases),
          phType: form.phType,
          phApprox: form.phApprox || null,
          summary: form.summary || null,
          mainUse: linesToList(form.mainUse),
          materialsRaw: linesToList(form.materialsRaw),
          contaminantsRaw: linesToList(form.contaminantsRaw),
          forbiddenRaw: linesToList(form.forbiddenRaw),
          compatibleMaterialIds: form.compatibleMaterialIds,
          contaminantIds: form.contaminantIds,
          forbiddenMaterialIds: form.forbiddenMaterialIds,
          standardDilution: form.standardDilution || null,
          strongDilution: form.strongDilution || null,
          dwellTime: form.dwellTime || null,
          packSizes: linesToList(form.packSizes),
          warnings: linesToList(form.warnings),
          confidence: form.confidence,
          status: form.status,
          salesUrl: form.salesUrl.trim() || null,
          salesLabel: form.salesLabel.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "저장 실패");
        return;
      }
      const savedId = data.id as string;
      setRows((prev) => {
        const existing = prev.find((p) => p.id === savedId);
        const catalogOrigin: ProductRow["catalogOrigin"] =
          existing?.catalogOrigin === "source" || existing?.catalogOrigin === "source_override"
            ? "source_override"
            : "admin";
        const next: ProductRow = {
          id: savedId,
          brand: form.brand.trim(),
          name: form.name.trim(),
          aliases: linesToList(form.aliases),
          phType: form.phType,
          phApprox: form.phApprox.trim() || null,
          summary: form.summary.trim(),
          mainUse: linesToList(form.mainUse),
          compatibleMaterialIds: form.compatibleMaterialIds,
          contaminantIds: form.contaminantIds,
          forbiddenMaterialIds: form.forbiddenMaterialIds,
          materialsRaw: linesToList(form.materialsRaw),
          contaminantsRaw: linesToList(form.contaminantsRaw),
          forbiddenRaw: linesToList(form.forbiddenRaw),
          standardDilution: form.standardDilution.trim(),
          strongDilution: form.strongDilution.trim(),
          dwellTime: form.dwellTime.trim(),
          packSizes: linesToList(form.packSizes),
          warnings: linesToList(form.warnings),
          confidence: form.confidence,
          status: form.status,
          salesUrl: form.salesUrl.trim() || null,
          salesLabel: form.salesLabel.trim() || null,
          catalogOrigin,
          hasDbRow: true,
          isDeleted: false,
        };
        if (existing) {
          return prev.map((row) => (row.id === savedId ? next : row));
        }
        return [...prev, next];
      });
      setIsCreate(false);
      setMsg("저장되었습니다. 공개 페이지에 곧 반영됩니다.");
      setScreen("list");
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function remove(p: ProductRow) {
    if (!confirm(`「${p.name}」을(를) 목록에서 숨길까요? (복구 가능)`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/cleaning-products/${encodeURIComponent(p.id)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "삭제 실패");
        return;
      }
      setRows((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, isDeleted: true, hasDbRow: true } : row))
      );
      setMsg(`${p.name}을(를) 숨겼습니다.`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function restore(p: ProductRow) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/cleaning-products/${encodeURIComponent(p.id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore" }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "복구 실패");
        return;
      }
      setRows((prev) =>
        prev.map((row) => (row.id === p.id ? { ...row, isDeleted: false } : row))
      );
      setMsg(`${p.name} 복구됨`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "list") {
    return (
      <section id="products" className="scroll-mt-20 space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900">
                제품 마스터
                <span className="ml-2 text-sm font-bold text-slate-500">({visible.length})</span>
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                추가·편집·삭제(숨김)와 판매 링크를 함께 관리합니다. 마이그레이션 194 필요.
              </p>
            </div>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white"
            >
              새로 만들기
            </button>
          </div>
          {msg ? <p className="mt-3 text-sm font-medium text-teal-800">{msg}</p> : null}
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·브랜드·ID 검색"
            className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
          />
          <ul className="mt-4 divide-y divide-slate-100">
            {visible.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${p.isDeleted ? "text-slate-400 line-through" : "text-slate-950"}`}>
                    {p.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.brand} · {p.id} · {originLabel(p)} · {p.status}
                    {p.salesUrl ? " · 판매링크" : ""}
                  </p>
                </div>
                {!p.isDeleted ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 hover:border-teal-700 hover:text-teal-800"
                    >
                      편집하기
                    </button>
                    <Link
                      href={`/products/${p.id}`}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-slate-500 hover:text-teal-800"
                    >
                      보기
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove(p)}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-rose-700 hover:underline disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => restore(p)}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 disabled:opacity-50"
                  >
                    복구
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </section>
    );
  }

  return (
    <section id="products" className="scroll-mt-20 space-y-4">
      <div>
        <button type="button" onClick={goToList} className="text-sm font-bold text-teal-800 hover:underline">
          ← 목록으로
        </button>
        <h2 className="mt-2 text-xl font-black text-slate-900">
          {isCreate ? "제품 새로 만들기" : "제품 편집"}
        </h2>
        {msg ? <p className="mt-2 text-sm font-medium text-teal-800">{msg}</p> : null}
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="제품 ID (영문·숫자·하이픈)">
            <input
              className={inputClass}
              value={form.id}
              disabled={!isCreate}
              onChange={(e) => patchForm({ id: e.target.value.toLowerCase().replace(/\s+/g, "-") })}
              placeholder="brand-product-name"
            />
          </Field>
          <Field label="상태">
            <select
              className={inputClass}
              value={form.status}
              onChange={(e) => patchForm({ status: e.target.value as FormState["status"] })}
            >
              <option value="active">active (공개)</option>
              <option value="draft">draft (비공개)</option>
              <option value="verify">verify</option>
              <option value="discontinued">discontinued</option>
            </select>
          </Field>
          <Field label="브랜드">
            <input
              className={inputClass}
              value={form.brand}
              onChange={(e) => patchForm({ brand: e.target.value })}
            />
          </Field>
          <Field label="제품명">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => patchForm({ name: e.target.value })}
            />
          </Field>
        </div>

        <Field label="별칭 (줄바꿈)">
          <textarea className={taClass} value={form.aliases} onChange={(e) => patchForm({ aliases: e.target.value })} />
        </Field>
        <Field label="한줄 요약">
          <textarea className={taClass} value={form.summary} onChange={(e) => patchForm({ summary: e.target.value })} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="pH 유형">
            <select
              className={inputClass}
              value={form.phType}
              onChange={(e) => patchForm({ phType: e.target.value as PHType })}
            >
              {PH_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="pH 표시">
            <input
              className={inputClass}
              value={form.phApprox}
              onChange={(e) => patchForm({ phApprox: e.target.value })}
              placeholder="예: 약 2"
            />
          </Field>
          <Field label="신뢰도">
            <select
              className={inputClass}
              value={form.confidence}
              onChange={(e) => patchForm({ confidence: e.target.value as Confidence })}
            >
              <option value="high">high</option>
              <option value="medium">medium</option>
              <option value="low">low</option>
            </select>
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="표준 희석">
            <input
              className={inputClass}
              value={form.standardDilution}
              onChange={(e) => patchForm({ standardDilution: e.target.value })}
            />
          </Field>
          <Field label="강한 희석">
            <input
              className={inputClass}
              value={form.strongDilution}
              onChange={(e) => patchForm({ strongDilution: e.target.value })}
            />
          </Field>
          <Field label="접촉 시간">
            <input
              className={inputClass}
              value={form.dwellTime}
              onChange={(e) => patchForm({ dwellTime: e.target.value })}
            />
          </Field>
        </div>

        <Field label="주요 용도 (줄바꿈)">
          <textarea className={taClass} value={form.mainUse} onChange={(e) => patchForm({ mainUse: e.target.value })} />
        </Field>
        <Field label="적용 재질 원문 (줄바꿈)">
          <textarea
            className={taClass}
            value={form.materialsRaw}
            onChange={(e) => patchForm({ materialsRaw: e.target.value })}
          />
        </Field>
        <Field label="제거 오염 원문 (줄바꿈)">
          <textarea
            className={taClass}
            value={form.contaminantsRaw}
            onChange={(e) => patchForm({ contaminantsRaw: e.target.value })}
          />
        </Field>
        <Field label="사용 불가 원문 (줄바꿈)">
          <textarea
            className={taClass}
            value={form.forbiddenRaw}
            onChange={(e) => patchForm({ forbiddenRaw: e.target.value })}
          />
        </Field>
        <Field label="용량 (줄바꿈)">
          <textarea
            className={taClass}
            value={form.packSizes}
            onChange={(e) => patchForm({ packSizes: e.target.value })}
          />
        </Field>
        <Field label="주의사항 (줄바꿈)">
          <textarea className={taClass} value={form.warnings} onChange={(e) => patchForm({ warnings: e.target.value })} />
        </Field>

        <div>
          <p className="text-sm font-bold text-slate-600">연결 재질 (선택)</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-3">
            {materials.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.compatibleMaterialIds.includes(m.id)}
                    onChange={() => toggleId("compatibleMaterialIds", m.id)}
                  />
                  <span>{m.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-600">연결 오염 (선택)</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-3">
            {contaminants.map((c) => (
              <li key={c.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.contaminantIds.includes(c.id)}
                    onChange={() => toggleId("contaminantIds", c.id)}
                  />
                  <span>{c.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-sm font-bold text-slate-600">금지 재질 (선택)</p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-3">
            {materials.map((m) => (
              <li key={m.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={form.forbiddenMaterialIds.includes(m.id)}
                    onChange={() => toggleId("forbiddenMaterialIds", m.id)}
                  />
                  <span>{m.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-bold text-slate-900">판매 링크</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <Field label="판매 URL">
              <input
                type="url"
                className={inputClass}
                value={form.salesUrl}
                onChange={(e) => patchForm({ salesUrl: e.target.value })}
                placeholder="https://..."
              />
            </Field>
            <Field label="버튼 문구">
              <input
                className={inputClass}
                value={form.salesLabel}
                onChange={(e) => patchForm({ salesLabel: e.target.value })}
                placeholder="구매하기"
              />
            </Field>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={busy}
            onClick={save}
            className="rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "저장 중…" : "저장"}
          </button>
          <button
            type="button"
            onClick={goToList}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            취소
          </button>
        </div>
      </div>
    </section>
  );
}
