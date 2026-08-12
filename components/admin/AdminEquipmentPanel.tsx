"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import KnowledgeMediaUpload from "@/components/knowledge-hub/KnowledgeMediaUpload";
import type { Confidence } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import type { EquipmentCategoryId } from "@/lib/knowledge-hub/equipment/types";

type EquipmentRow = {
  id: string;
  categoryId: EquipmentCategoryId;
  name: string;
  aliases: string[];
  summary: string;
  whatIs: string;
  placeHints: string[];
  jobHints: string[];
  selectionCriteria: string[];
  useSteps: string[];
  beginnerMistakes: string[];
  warnings: string[];
  relatedProductIds: string[];
  relatedEquipmentIds: string[];
  confidence: Confidence;
  status: "active" | "draft" | "planned";
  catalogOrigin: "source" | "source_override" | "admin";
  hasDbRow: boolean;
  isDeleted: boolean;
};

type ModelRow = {
  id: string;
  equipmentId: string;
  brand: string;
  name: string;
  aliases: string[];
  summary: string;
  bestFor: string[];
  selectionNotes: string[];
  cautions: string[];
  relatedEquipmentIds: string[];
  salesUrl: string | null;
  salesLabel: string | null;
  confidence: Confidence;
  status: "active" | "draft" | "planned";
  catalogOrigin: "source" | "source_override" | "admin";
  hasDbRow: boolean;
  isDeleted: boolean;
};

type CategoryOpt = { id: EquipmentCategoryId; name: string };

type Props = {
  equipment: EquipmentRow[];
  models: ModelRow[];
  categories: CategoryOpt[];
  plannedCount: number;
};

type Tab = "equipment" | "models";

type EqForm = {
  id: string;
  categoryId: EquipmentCategoryId;
  name: string;
  aliases: string;
  summary: string;
  whatIs: string;
  placeHints: string;
  jobHints: string;
  selectionCriteria: string;
  useSteps: string;
  beginnerMistakes: string;
  warnings: string;
  relatedProductIds: string;
  relatedEquipmentIds: string;
  confidence: Confidence;
  status: EquipmentRow["status"];
};

type ModelForm = {
  id: string;
  equipmentId: string;
  brand: string;
  name: string;
  aliases: string;
  summary: string;
  bestFor: string;
  selectionNotes: string;
  cautions: string;
  relatedEquipmentIds: string;
  salesUrl: string;
  salesLabel: string;
  confidence: Confidence;
  status: ModelRow["status"];
};

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(list?: string[]): string {
  return (list ?? []).join("\n");
}

function emptyEqForm(defaultCat: EquipmentCategoryId): EqForm {
  return {
    id: "",
    categoryId: defaultCat,
    name: "",
    aliases: "",
    summary: "",
    whatIs: "",
    placeHints: "",
    jobHints: "",
    selectionCriteria: "",
    useSteps: "",
    beginnerMistakes: "",
    warnings: "",
    relatedProductIds: "",
    relatedEquipmentIds: "",
    confidence: "medium",
    status: "draft",
  };
}

function fromEquipment(e: EquipmentRow): EqForm {
  return {
    id: e.id,
    categoryId: e.categoryId,
    name: e.name,
    aliases: listToLines(e.aliases),
    summary: e.summary ?? "",
    whatIs: e.whatIs ?? "",
    placeHints: listToLines(e.placeHints),
    jobHints: listToLines(e.jobHints),
    selectionCriteria: listToLines(e.selectionCriteria),
    useSteps: listToLines(e.useSteps),
    beginnerMistakes: listToLines(e.beginnerMistakes),
    warnings: listToLines(e.warnings),
    relatedProductIds: listToLines(e.relatedProductIds),
    relatedEquipmentIds: listToLines(e.relatedEquipmentIds),
    confidence: e.confidence,
    status: e.status,
  };
}

function emptyModelForm(equipmentId = ""): ModelForm {
  return {
    id: "",
    equipmentId,
    brand: "",
    name: "",
    aliases: "",
    summary: "",
    bestFor: "",
    selectionNotes: "",
    cautions: "",
    relatedEquipmentIds: "",
    salesUrl: "",
    salesLabel: "",
    confidence: "medium",
    status: "draft",
  };
}

function fromModel(m: ModelRow): ModelForm {
  return {
    id: m.id,
    equipmentId: m.equipmentId,
    brand: m.brand,
    name: m.name,
    aliases: listToLines(m.aliases),
    summary: m.summary ?? "",
    bestFor: listToLines(m.bestFor),
    selectionNotes: listToLines(m.selectionNotes),
    cautions: listToLines(m.cautions),
    relatedEquipmentIds: listToLines(m.relatedEquipmentIds),
    salesUrl: m.salesUrl ?? "",
    salesLabel: m.salesLabel ?? "",
    confidence: m.confidence,
    status: m.status,
  };
}

function originLabel(o: { catalogOrigin: string; isDeleted: boolean }): string {
  if (o.isDeleted) return "삭제됨";
  if (o.catalogOrigin === "admin") return "관리자";
  if (o.catalogOrigin === "source_override") return "문서+수정";
  return "문서";
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-bold text-slate-600">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm";
const taClass = `${inputClass} min-h-[88px]`;

export default function AdminEquipmentPanel({
  equipment,
  models,
  categories,
  plannedCount,
}: Props) {
  const [eqRows, setEqRows] = useState(equipment);
  const [modelRows, setModelRows] = useState(models);
  const [tab, setTab] = useState<Tab>("equipment");
  const [screen, setScreen] = useState<"list" | "edit">("list");
  const [isCreate, setIsCreate] = useState(false);
  const [eqForm, setEqForm] = useState<EqForm>(() =>
    emptyEqForm(categories[0]?.id ?? "heavy")
  );
  const [modelForm, setModelForm] = useState<ModelForm>(emptyModelForm);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState("");

  const catName = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const visibleEq = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? eqRows.filter(
          (e) =>
            e.name.toLowerCase().includes(needle) ||
            e.id.toLowerCase().includes(needle) ||
            catName(e.categoryId).toLowerCase().includes(needle)
        )
      : eqRows;
    return [...list].sort((a, b) => {
      if (a.isDeleted !== b.isDeleted) return a.isDeleted ? 1 : -1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [eqRows, q, categories]);

  const visibleModels = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle
      ? modelRows.filter(
          (m) =>
            m.name.toLowerCase().includes(needle) ||
            m.brand.toLowerCase().includes(needle) ||
            m.id.toLowerCase().includes(needle) ||
            m.equipmentId.toLowerCase().includes(needle)
        )
      : modelRows;
    return [...list].sort((a, b) => {
      if (a.isDeleted !== b.isDeleted) return a.isDeleted ? 1 : -1;
      return a.name.localeCompare(b.name, "ko");
    });
  }, [modelRows, q]);

  const equipmentOptions = useMemo(
    () =>
      eqRows
        .filter((e) => !e.isDeleted)
        .map((e) => ({ id: e.id, name: e.name }))
        .sort((a, b) => a.name.localeCompare(b.name, "ko")),
    [eqRows]
  );

  function startCreateEquipment() {
    setTab("equipment");
    setIsCreate(true);
    setEqForm(emptyEqForm(categories[0]?.id ?? "heavy"));
    setMsg(null);
    setScreen("edit");
  }

  function startEditEquipment(e: EquipmentRow) {
    setTab("equipment");
    setIsCreate(false);
    setEqForm(fromEquipment(e));
    setMsg(null);
    setScreen("edit");
  }

  function startCreateModel(equipmentId?: string) {
    setTab("models");
    setIsCreate(true);
    setModelForm(emptyModelForm(equipmentId ?? equipmentOptions[0]?.id ?? ""));
    setMsg(null);
    setScreen("edit");
  }

  function startEditModel(m: ModelRow) {
    setTab("models");
    setIsCreate(false);
    setModelForm(fromModel(m));
    setMsg(null);
    setScreen("edit");
  }

  function goToList() {
    setScreen("list");
    setMsg(null);
  }

  async function saveEquipment() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cleaning-equipment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "equipment",
          id: eqForm.id,
          categoryId: eqForm.categoryId,
          name: eqForm.name,
          aliases: linesToList(eqForm.aliases),
          summary: eqForm.summary,
          whatIs: eqForm.whatIs,
          placeHints: linesToList(eqForm.placeHints),
          jobHints: linesToList(eqForm.jobHints),
          selectionCriteria: linesToList(eqForm.selectionCriteria),
          useSteps: linesToList(eqForm.useSteps),
          beginnerMistakes: linesToList(eqForm.beginnerMistakes),
          warnings: linesToList(eqForm.warnings),
          relatedProductIds: linesToList(eqForm.relatedProductIds),
          relatedEquipmentIds: linesToList(eqForm.relatedEquipmentIds),
          confidence: eqForm.confidence,
          status: eqForm.status,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "저장 실패");
        return;
      }
      const savedId = data.id as string;
      setEqRows((prev) => {
        const existing = prev.find((e) => e.id === savedId);
        const catalogOrigin: EquipmentRow["catalogOrigin"] =
          existing?.catalogOrigin === "source" || existing?.catalogOrigin === "source_override"
            ? "source_override"
            : "admin";
        const next: EquipmentRow = {
          id: savedId,
          categoryId: eqForm.categoryId,
          name: eqForm.name.trim(),
          aliases: linesToList(eqForm.aliases),
          summary: eqForm.summary.trim(),
          whatIs: eqForm.whatIs.trim(),
          placeHints: linesToList(eqForm.placeHints),
          jobHints: linesToList(eqForm.jobHints),
          selectionCriteria: linesToList(eqForm.selectionCriteria),
          useSteps: linesToList(eqForm.useSteps),
          beginnerMistakes: linesToList(eqForm.beginnerMistakes),
          warnings: linesToList(eqForm.warnings),
          relatedProductIds: linesToList(eqForm.relatedProductIds),
          relatedEquipmentIds: linesToList(eqForm.relatedEquipmentIds),
          confidence: eqForm.confidence,
          status: eqForm.status,
          catalogOrigin,
          hasDbRow: true,
          isDeleted: false,
        };
        if (existing) return prev.map((row) => (row.id === savedId ? next : row));
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

  async function saveModel() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/cleaning-equipment", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "model",
          id: modelForm.id,
          equipmentId: modelForm.equipmentId,
          brand: modelForm.brand,
          name: modelForm.name,
          aliases: linesToList(modelForm.aliases),
          summary: modelForm.summary,
          bestFor: linesToList(modelForm.bestFor),
          selectionNotes: linesToList(modelForm.selectionNotes),
          cautions: linesToList(modelForm.cautions),
          relatedEquipmentIds: linesToList(modelForm.relatedEquipmentIds),
          salesUrl: modelForm.salesUrl.trim() || null,
          salesLabel: modelForm.salesLabel.trim() || null,
          confidence: modelForm.confidence,
          status: modelForm.status,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "저장 실패");
        return;
      }
      const savedId = data.id as string;
      setModelRows((prev) => {
        const existing = prev.find((m) => m.id === savedId);
        const catalogOrigin: ModelRow["catalogOrigin"] =
          existing?.catalogOrigin === "source" || existing?.catalogOrigin === "source_override"
            ? "source_override"
            : "admin";
        const next: ModelRow = {
          id: savedId,
          equipmentId: modelForm.equipmentId.trim(),
          brand: modelForm.brand.trim(),
          name: modelForm.name.trim(),
          aliases: linesToList(modelForm.aliases),
          summary: modelForm.summary.trim(),
          bestFor: linesToList(modelForm.bestFor),
          selectionNotes: linesToList(modelForm.selectionNotes),
          cautions: linesToList(modelForm.cautions),
          relatedEquipmentIds: linesToList(modelForm.relatedEquipmentIds),
          salesUrl: modelForm.salesUrl.trim() || null,
          salesLabel: modelForm.salesLabel.trim() || null,
          confidence: modelForm.confidence,
          status: modelForm.status,
          catalogOrigin,
          hasDbRow: true,
          isDeleted: false,
        };
        if (existing) return prev.map((row) => (row.id === savedId ? next : row));
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

  async function remove(kind: Tab, id: string, label: string) {
    if (!confirm(`「${label}」을(를) 목록에서 숨길까요? (복구 가능)`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/cleaning-equipment/${encodeURIComponent(id)}?kind=${kind === "models" ? "model" : "equipment"}`,
        { method: "DELETE" }
      );
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "삭제 실패");
        return;
      }
      if (kind === "equipment") {
        setEqRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, isDeleted: true, hasDbRow: true } : row))
        );
      } else {
        setModelRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, isDeleted: true, hasDbRow: true } : row))
        );
      }
      setMsg(`${label}을(를) 숨겼습니다.`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  async function restore(kind: Tab, id: string, label: string) {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/cleaning-equipment/${encodeURIComponent(id)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "restore",
          kind: kind === "models" ? "model" : "equipment",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg(data.error ?? "복구 실패");
        return;
      }
      if (kind === "equipment") {
        setEqRows((prev) => prev.map((row) => (row.id === id ? { ...row, isDeleted: false } : row)));
      } else {
        setModelRows((prev) =>
          prev.map((row) => (row.id === id ? { ...row, isDeleted: false } : row))
        );
      }
      setMsg(`${label} 복구됨`);
    } catch {
      setMsg("네트워크 오류");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "edit" && tab === "equipment") {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">
              {isCreate ? "장비 종류 새로 만들기" : "장비 종류 편집"}
            </h2>
            <button type="button" onClick={goToList} className="text-sm font-bold text-slate-600 hover:underline">
              ← 목록
            </button>
          </div>
          {msg ? <p className="mb-3 text-sm font-medium text-rose-700">{msg}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ID (소문자·하이픈)">
              <input
                className={inputClass}
                value={eqForm.id}
                disabled={!isCreate}
                onChange={(e) => setEqForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="wet-vac"
              />
            </Field>
            <Field label="카테고리">
              <select
                className={inputClass}
                value={eqForm.categoryId}
                onChange={(e) =>
                  setEqForm((f) => ({ ...f, categoryId: e.target.value as EquipmentCategoryId }))
                }
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="장비명">
              <input
                className={inputClass}
                value={eqForm.name}
                onChange={(e) => setEqForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="상태">
              <select
                className={inputClass}
                value={eqForm.status}
                onChange={(e) =>
                  setEqForm((f) => ({ ...f, status: e.target.value as EquipmentRow["status"] }))
                }
              >
                <option value="active">공개 (active)</option>
                <option value="draft">초안 (draft)</option>
                <option value="planned">예정 (planned)</option>
              </select>
            </Field>
            <Field label="신뢰도">
              <select
                className={inputClass}
                value={eqForm.confidence}
                onChange={(e) =>
                  setEqForm((f) => ({ ...f, confidence: e.target.value as Confidence }))
                }
              >
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </Field>
            <Field label="별칭 (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.aliases}
                onChange={(e) => setEqForm((f) => ({ ...f, aliases: e.target.value }))}
              />
            </Field>
            <div className="sm:col-span-2">
              <Field label="한 줄 요약">
                <textarea
                  className={taClass}
                  value={eqForm.summary}
                  onChange={(e) => setEqForm((f) => ({ ...f, summary: e.target.value }))}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="장비란?">
                <textarea
                  className={`${inputClass} min-h-[120px]`}
                  value={eqForm.whatIs}
                  onChange={(e) => setEqForm((f) => ({ ...f, whatIs: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="어디에 사용하는가 (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.placeHints}
                onChange={(e) => setEqForm((f) => ({ ...f, placeHints: e.target.value }))}
              />
            </Field>
            <Field label="어떤 작업 (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.jobHints}
                onChange={(e) => setEqForm((f) => ({ ...f, jobHints: e.target.value }))}
              />
            </Field>
            <Field label="선택 기준 (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.selectionCriteria}
                onChange={(e) => setEqForm((f) => ({ ...f, selectionCriteria: e.target.value }))}
              />
            </Field>
            <Field label="사용 절차 (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.useSteps}
                onChange={(e) => setEqForm((f) => ({ ...f, useSteps: e.target.value }))}
              />
            </Field>
            <Field label="초보 실수 (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.beginnerMistakes}
                onChange={(e) => setEqForm((f) => ({ ...f, beginnerMistakes: e.target.value }))}
              />
            </Field>
            <Field label="주의사항 (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.warnings}
                onChange={(e) => setEqForm((f) => ({ ...f, warnings: e.target.value }))}
              />
            </Field>
            <Field label="관련 세제 ID (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.relatedProductIds}
                onChange={(e) => setEqForm((f) => ({ ...f, relatedProductIds: e.target.value }))}
              />
            </Field>
            <Field label="관련 장비 ID (줄바꿈)">
              <textarea
                className={taClass}
                value={eqForm.relatedEquipmentIds}
                onChange={(e) => setEqForm((f) => ({ ...f, relatedEquipmentIds: e.target.value }))}
              />
            </Field>
          </div>
          {!isCreate ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <KnowledgeMediaUpload
                entityType="equipment"
                entityId={eqForm.id}
                defaultAlt={`${eqForm.name} 청소장비`}
              />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={saveEquipment}
              className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
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

  if (screen === "edit" && tab === "models") {
    return (
      <section className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">
              {isCreate ? "브랜드·기종 새로 만들기" : "브랜드·기종 편집"}
            </h2>
            <button type="button" onClick={goToList} className="text-sm font-bold text-slate-600 hover:underline">
              ← 목록
            </button>
          </div>
          {msg ? <p className="mb-3 text-sm font-medium text-rose-700">{msg}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="기종 ID (소문자·하이픈)">
              <input
                className={inputClass}
                value={modelForm.id}
                disabled={!isCreate}
                onChange={(e) => setModelForm((f) => ({ ...f, id: e.target.value }))}
                placeholder="numatic-wv470"
              />
            </Field>
            <Field label="상위 장비 종류">
              <select
                className={inputClass}
                value={modelForm.equipmentId}
                onChange={(e) => setModelForm((f) => ({ ...f, equipmentId: e.target.value }))}
              >
                <option value="">선택</option>
                {equipmentOptions.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name} ({e.id})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="브랜드">
              <input
                className={inputClass}
                value={modelForm.brand}
                onChange={(e) => setModelForm((f) => ({ ...f, brand: e.target.value }))}
              />
            </Field>
            <Field label="기종명">
              <input
                className={inputClass}
                value={modelForm.name}
                onChange={(e) => setModelForm((f) => ({ ...f, name: e.target.value }))}
              />
            </Field>
            <Field label="상태">
              <select
                className={inputClass}
                value={modelForm.status}
                onChange={(e) =>
                  setModelForm((f) => ({ ...f, status: e.target.value as ModelRow["status"] }))
                }
              >
                <option value="active">공개 (active)</option>
                <option value="draft">초안 (draft)</option>
                <option value="planned">예정 (planned)</option>
              </select>
            </Field>
            <Field label="신뢰도">
              <select
                className={inputClass}
                value={modelForm.confidence}
                onChange={(e) =>
                  setModelForm((f) => ({ ...f, confidence: e.target.value as Confidence }))
                }
              >
                <option value="high">high</option>
                <option value="medium">medium</option>
                <option value="low">low</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="요약">
                <textarea
                  className={taClass}
                  value={modelForm.summary}
                  onChange={(e) => setModelForm((f) => ({ ...f, summary: e.target.value }))}
                />
              </Field>
            </div>
            <Field label="적합 현장 (줄바꿈)">
              <textarea
                className={taClass}
                value={modelForm.bestFor}
                onChange={(e) => setModelForm((f) => ({ ...f, bestFor: e.target.value }))}
              />
            </Field>
            <Field label="선택 메모 (줄바꿈)">
              <textarea
                className={taClass}
                value={modelForm.selectionNotes}
                onChange={(e) => setModelForm((f) => ({ ...f, selectionNotes: e.target.value }))}
              />
            </Field>
            <Field label="주의·한계 (줄바꿈)">
              <textarea
                className={taClass}
                value={modelForm.cautions}
                onChange={(e) => setModelForm((f) => ({ ...f, cautions: e.target.value }))}
              />
            </Field>
            <Field label="관련 장비 ID (줄바꿈)">
              <textarea
                className={taClass}
                value={modelForm.relatedEquipmentIds}
                onChange={(e) =>
                  setModelForm((f) => ({ ...f, relatedEquipmentIds: e.target.value }))
                }
              />
            </Field>
            <Field label="판매 URL (선택)">
              <input
                className={inputClass}
                value={modelForm.salesUrl}
                onChange={(e) => setModelForm((f) => ({ ...f, salesUrl: e.target.value }))}
              />
            </Field>
            <Field label="판매 라벨 (선택)">
              <input
                className={inputClass}
                value={modelForm.salesLabel}
                onChange={(e) => setModelForm((f) => ({ ...f, salesLabel: e.target.value }))}
              />
            </Field>
          </div>
          {!isCreate ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <KnowledgeMediaUpload
                entityType="equipment"
                entityId={modelForm.id}
                defaultAlt={`${modelForm.brand} ${modelForm.name}`}
              />
            </div>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={saveModel}
              className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
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

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">청소장비</h1>
            <p className="mt-1 text-sm text-slate-600">
              장비 {eqRows.filter((e) => !e.isDeleted).length}종 · 기종{" "}
              {modelRows.filter((m) => !m.isDeleted).length}개 · 카테고리 골격(planned) {plannedCount}
              종 ·{" "}
              <Link href="/equipment" className="text-teal-700 hover:underline" target="_blank">
                공개 페이지
              </Link>
            </p>
            <p className="mt-2 text-xs text-amber-800">
              DB 저장을 위해 Supabase에{" "}
              <code className="rounded bg-amber-50 px-1">200_cleaning_equipment.sql</code> 을
              적용하세요. 이미지는{" "}
              <code className="rounded bg-amber-50 px-1">199_knowledge_media.sql</code> 필요.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={startCreateEquipment}
              className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white"
            >
              장비 추가
            </button>
            <button
              type="button"
              onClick={() => startCreateModel()}
              className="rounded-xl border border-teal-700 px-4 py-2.5 text-sm font-bold text-teal-800"
            >
              기종 추가
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={() => setTab("equipment")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${
              tab === "equipment" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            장비 종류
          </button>
          <button
            type="button"
            onClick={() => setTab("models")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${
              tab === "models" ? "bg-teal-800 text-white" : "bg-slate-100 text-slate-700"
            }`}
          >
            브랜드·기종
          </button>
        </div>

        {msg ? <p className="mt-3 text-sm font-medium text-teal-800">{msg}</p> : null}

        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={tab === "equipment" ? "이름·ID·카테고리 검색" : "브랜드·기종·장비 ID 검색"}
          className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
        />

        {tab === "equipment" ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {visibleEq.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${e.isDeleted ? "text-slate-400 line-through" : "text-slate-950"}`}>
                    {e.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {catName(e.categoryId)} · {e.id} · {originLabel(e)} · {e.status}
                  </p>
                </div>
                {!e.isDeleted ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditEquipment(e)}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 hover:border-teal-700 hover:text-teal-800"
                    >
                      편집하기
                    </button>
                    <button
                      type="button"
                      onClick={() => startCreateModel(e.id)}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-sky-700 hover:underline"
                    >
                      기종 추가
                    </button>
                    <Link
                      href={`/equipment/${e.id}`}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-slate-500 hover:text-teal-800"
                      target="_blank"
                    >
                      보기
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove("equipment", e.id, e.name)}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-rose-600 hover:underline disabled:opacity-50"
                    >
                      숨김
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => restore("equipment", e.id, e.name)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    복구
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {visibleModels.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className={`font-bold ${m.isDeleted ? "text-slate-400 line-through" : "text-slate-950"}`}>
                    {m.brand} {m.name}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {m.equipmentId} · {m.id} · {originLabel(m)} · {m.status}
                  </p>
                </div>
                {!m.isDeleted ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startEditModel(m)}
                      className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 hover:border-teal-700 hover:text-teal-800"
                    >
                      편집하기
                    </button>
                    <Link
                      href={`/equipment/${m.equipmentId}/models/${m.id}`}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-slate-500 hover:text-teal-800"
                      target="_blank"
                    >
                      보기
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => remove("models", m.id, `${m.brand} ${m.name}`)}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-rose-600 hover:underline disabled:opacity-50"
                    >
                      숨김
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => restore("models", m.id, `${m.brand} ${m.name}`)}
                    className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
                  >
                    복구
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
