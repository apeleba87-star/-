"use client";

import { useState } from "react";
import {
  addMainCategory,
  addSubCategory,
  updateCategory,
  setCategoryListingTypes,
  deleteCategory,
  type CategoryUsage,
  type ListingTypeKey,
  type JobCategoryRefRow,
  type JobTypePresetRow,
  addJobTypePreset,
  updateJobTypePreset,
  deleteJobTypePreset,
} from "./actions";

const LISTING_TYPE_LABELS: Record<ListingTypeKey, string> = {
  sale_regular: "정기 매매",
  sale_one_time: "일회 매매",
  referral_regular: "정기 소개",
  referral_one_time: "일회 소개",
  subcontract: "도급",
};
const LISTING_TYPE_KEYS: ListingTypeKey[] = [
  "sale_regular",
  "sale_one_time",
  "referral_regular",
  "referral_one_time",
  "subcontract",
];

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  usage: CategoryUsage;
  created_at: string;
  updated_at: string;
};

const USAGE_TABS: { value: CategoryUsage; label: string }[] = [
  { value: "listing", label: "현장거래 카테고리" },
  { value: "job", label: "인력구인 카테고리" },
  { value: "default", label: "기본 카테고리" },
];

export default function CategoriesManager({
  initialCategories,
  initialCategoryListingTypes = {},
  initialJobCategoryRefs = [],
  initialJobTypePresets = [],
}: {
  initialCategories: CategoryRow[];
  initialCategoryListingTypes?: Record<string, string[]>;
  initialJobCategoryRefs?: JobCategoryRefRow[];
  initialJobTypePresets?: JobTypePresetRow[];
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryListingTypes, setCategoryListingTypesState] = useState<Record<string, string[]>>(initialCategoryListingTypes);
  const [jobCategoryRefs, setJobCategoryRefs] = useState<JobCategoryRefRow[]>(initialJobCategoryRefs);
  const [selectedUsage, setSelectedUsage] = useState<CategoryUsage>("listing");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [newMainName, setNewMainName] = useState("");
  const [newMainSort, setNewMainSort] = useState(0);
  const [newSubParentId, setNewSubParentId] = useState("");
  const [newSubName, setNewSubName] = useState("");
  const [newSubSort, setNewSubSort] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editSort, setEditSort] = useState(0);
  const [editParentId, setEditParentId] = useState("");
  const [editingListingTypesId, setEditingListingTypesId] = useState<string | null>(null);
  const [draftListingTypes, setDraftListingTypes] = useState<string[]>([]);
  const [quickJobName, setQuickJobName] = useState("");
  const [quickJobSort, setQuickJobSort] = useState(0);
  const [editingJobRowId, setEditingJobRowId] = useState<string | null>(null);
  const [editingJobName, setEditingJobName] = useState("");
  const [editingJobSort, setEditingJobSort] = useState(0);
  const [draggingJobRowId, setDraggingJobRowId] = useState<string | null>(null);
  const [pendingJobOrderIds, setPendingJobOrderIds] = useState<string[] | null>(null);
  /** 현장거래 탭에서 필터: 선택한 유형에 해당하는 업무 종류만 목록에 표시. null = 전체 */
  const [selectedListingTypeFilter, setSelectedListingTypeFilter] = useState<string | null>(null);
  const [jobTypePresets, setJobTypePresets] = useState<JobTypePresetRow[]>(initialJobTypePresets);
  const [newPresetLabel, setNewPresetLabel] = useState("");
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetKey, setEditingPresetKey] = useState("");
  const [editingPresetLabel, setEditingPresetLabel] = useState("");
  const [editingPresetSort, setEditingPresetSort] = useState(0);
  const [draggingPresetId, setDraggingPresetId] = useState<string | null>(null);
  const [pendingPresetOrderIds, setPendingPresetOrderIds] = useState<string[] | null>(null);

  const filtered = categories.filter((c) => (c.usage ?? "default") === selectedUsage);
  const mainCategories = filtered.filter((c) => c.parent_id == null);
  const mainIds = new Set(mainCategories.map((m) => m.id));
  const subCategories = filtered.filter(
    (c) => c.parent_id != null && mainIds.has(c.parent_id)
  );
  // 현장거래 탭: 유형 = 거래 유형(정기 매매 등, 고정), 업무 종류 = 카테고리(병원 청소, 사무실 청소 등)
  const isListingTab = selectedUsage === "listing";
  const isJobTab = selectedUsage === "job";
  const mainLabel = isListingTab ? "업무 종류" : "대분류";
  const subLabel = isListingTab ? "업무 종류(세부)" : "소분류";

  /** 현장거래 탭에서 보여줄 업무 종류 목록: 유형 필터 선택 시 해당 유형에 연결된 것만, 이름 중복 제거(첫 번째만) */
  const visibleMainCategoriesForListing = (() => {
    if (!isListingTab) return mainCategories;
    const filtered = mainCategories.filter((m) => {
      if (!selectedListingTypeFilter) return true;
      const types = categoryListingTypes[m.id];
      return !types || types.length === 0 || types.includes(selectedListingTypeFilter);
    });
    const byName = new Map<string, CategoryRow>();
    for (const m of filtered) {
      const name = (m.name || "").trim() || "(이름 없음)";
      if (!byName.has(name)) byName.set(name, m);
    }
    return Array.from(byName.values()).sort((a, b) => a.sort_order - b.sort_order || (a.name || "").localeCompare(b.name || ""));
  })();

  async function handleAddMain(e: React.FormEvent) {
    e.preventDefault();
    const name = newMainName.trim();
    if (!name) return;
    setLoading(true);
    setMessage(null);
    const res = await addMainCategory(name, newMainSort, selectedUsage);
    setLoading(false);
    if (res.ok && res.row) {
      setCategories((prev) => [...prev, res.row!].sort((a, b) => a.sort_order - b.sort_order));
      setNewMainName("");
      setNewMainSort(mainCategories.length);
      setMessage({ ok: true, text: `${mainLabel}이(가) 추가되었습니다.` });
    } else {
      setMessage({ ok: false, text: res.error ?? "추가 실패" });
    }
  }

  async function handleAddSub(e: React.FormEvent) {
    e.preventDefault();
    const name = newSubName.trim();
    if (!name || !newSubParentId) return;
    setLoading(true);
    setMessage(null);
    const res = await addSubCategory(newSubParentId, name, newSubSort, selectedUsage);
    setLoading(false);
    if (res.ok && res.row) {
      setCategories((prev) => [...prev, res.row!].sort((a, b) => a.sort_order - b.sort_order));
      setNewSubName("");
      setNewSubSort(subCategories.filter((c) => c.parent_id === newSubParentId).length);
      setMessage({ ok: true, text: `${subLabel}이(가) 추가되었습니다.` });
    } else {
      setMessage({ ok: false, text: res.error ?? "추가 실패" });
    }
  }

  function startEdit(c: CategoryRow) {
    setEditingId(c.id);
    setEditName(c.name);
    setEditSort(c.sort_order);
    setEditParentId(c.parent_id ?? "");
  }

  async function saveEdit() {
    if (!editingId) return;
    const target = categories.find((c) => c.id === editingId);
    const isSub = Boolean(target?.parent_id);
    setLoading(true);
    setMessage(null);
    const res = await updateCategory(editingId, {
      name: editName,
      sort_order: editSort,
      parent_id: isSub ? (editParentId || null) : undefined,
    });
    setLoading(false);
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingId
            ? {
                ...c,
                name: editName.trim(),
                sort_order: editSort,
                parent_id: isSub ? (editParentId || null) : c.parent_id,
              }
            : c
        )
      );
      setEditingId(null);
      setMessage({ ok: true, text: "저장되었습니다." });
    } else {
      setMessage({ ok: false, text: res.error ?? "저장 실패" });
    }
  }

  async function toggleActive(c: CategoryRow) {
    setLoading(true);
    setMessage(null);
    const res = await updateCategory(c.id, { is_active: !c.is_active });
    setLoading(false);
    if (res.ok) {
      setCategories((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, is_active: !c.is_active } : x))
      );
      setMessage({ ok: true, text: c.is_active ? "비활성화했습니다." : "활성화했습니다." });
    } else {
      setMessage({ ok: false, text: res.error ?? "변경 실패" });
    }
  }

  function startEditListingTypes(m: CategoryRow) {
    setEditingListingTypesId(m.id);
    setDraftListingTypes(categoryListingTypes[m.id] ?? []);
  }

  async function saveListingTypes(categoryId: string) {
    setLoading(true);
    setMessage(null);
    const res = await setCategoryListingTypes(categoryId, draftListingTypes);
    setLoading(false);
    if (res.ok) {
      setCategoryListingTypesState((prev) => ({ ...prev, [categoryId]: draftListingTypes }));
      setEditingListingTypesId(null);
      setMessage({ ok: true, text: "적용 유형이 저장되었습니다." });
    } else {
      setMessage({ ok: false, text: res.error ?? "저장 실패" });
    }
  }

  const listingTypesSummary = (catId: string) => {
    const arr = categoryListingTypes[catId];
    if (!arr || arr.length === 0) return "전체 유형";
    if (arr.length >= LISTING_TYPE_KEYS.length) return "전체 유형";
    return arr.map((t) => LISTING_TYPE_LABELS[t as ListingTypeKey]).join(", ");
  };

  const jobRefsOutsideJobUsage = jobCategoryRefs.filter((r) => r.usage !== "job");
  const categoryById = new Map(categories.map((c) => [c.id, c]));
  const jobMainCategories = categories.filter((c) => c.usage === "job" && c.parent_id == null);
  const jobQuickRows = (() => {
    const map = new Map<
      string,
      { id: string; name: string; usage: CategoryUsage; refCount: number; sort_order: number }
    >();
    for (const c of jobMainCategories) {
      map.set(c.id, {
        id: c.id,
        name: c.name,
        usage: c.usage,
        refCount: 0,
        sort_order: c.sort_order,
      });
    }
    for (const r of jobCategoryRefs) {
      const prev = map.get(r.id);
      const cat = categoryById.get(r.id);
      map.set(r.id, {
        id: r.id,
        name: r.name,
        usage: r.usage,
        refCount: r.refCount,
        sort_order: cat?.sort_order ?? prev?.sort_order ?? 0,
      });
    }
    return [...map.values()].sort(
      (a, b) => a.sort_order - b.sort_order || b.refCount - a.refCount || a.name.localeCompare(b.name)
    );
  })();
  const displayedJobRows = (() => {
    if (!pendingJobOrderIds || pendingJobOrderIds.length === 0) return jobQuickRows;
    const byId = new Map(jobQuickRows.map((r) => [r.id, r]));
    const ordered: (typeof jobQuickRows)[number][] = [];
    for (const id of pendingJobOrderIds) {
      const row = byId.get(id);
      if (row) ordered.push(row);
    }
    for (const row of jobQuickRows) {
      if (!pendingJobOrderIds.includes(row.id)) ordered.push(row);
    }
    return ordered;
  })();
  const isJobOrderDirty =
    pendingJobOrderIds != null &&
    displayedJobRows.some((r, idx) => (categoryById.get(r.id)?.sort_order ?? idx) !== idx);
  const presetRows = [...jobTypePresets]
    .filter((p) => p.is_active)
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label));
  const displayedPresetRows = (() => {
    if (!pendingPresetOrderIds || pendingPresetOrderIds.length === 0) return presetRows;
    const byId = new Map(presetRows.map((r) => [r.id, r]));
    const ordered: JobTypePresetRow[] = [];
    for (const id of pendingPresetOrderIds) {
      const row = byId.get(id);
      if (row) ordered.push(row);
    }
    for (const row of presetRows) {
      if (!pendingPresetOrderIds.includes(row.id)) ordered.push(row);
    }
    return ordered;
  })();
  const isPresetOrderDirty =
    pendingPresetOrderIds != null &&
    displayedPresetRows.some((r, idx) => (jobTypePresets.find((p) => p.id === r.id)?.sort_order ?? idx) !== idx);

  /** 유형이 선택된 상태에서: 이 업무 종류를 현재 유형에서만 제거(연결 해제). 카테고리 자체는 유지. */
  async function handleRemoveFromType(c: CategoryRow) {
    if (!selectedListingTypeFilter) return;
    const typeLabel = LISTING_TYPE_LABELS[selectedListingTypeFilter as ListingTypeKey];
    if (!confirm(`「${c.name}」을(를) ${typeLabel}에서만 제거할까요? 업무 종류는 삭제되지 않고, 다른 유형에서는 그대로 보입니다.`)) return;
    setLoading(true);
    setMessage(null);
    const current = categoryListingTypes[c.id] ?? [];
    let nextTypes: string[];
    if (current.length === 0) {
      nextTypes = LISTING_TYPE_KEYS.filter((t) => t !== selectedListingTypeFilter);
    } else {
      nextTypes = current.filter((t) => t !== selectedListingTypeFilter);
      if (nextTypes.length === 0) {
        nextTypes = LISTING_TYPE_KEYS.filter((t) => t !== selectedListingTypeFilter);
      }
    }
    const res = await setCategoryListingTypes(c.id, nextTypes);
    setLoading(false);
    if (res.ok) {
      setCategoryListingTypesState((prev) => ({ ...prev, [c.id]: nextTypes }));
      setMessage({ ok: true, text: `${typeLabel}에서 제거되었습니다.` });
      if (editingListingTypesId === c.id) setEditingListingTypesId(null);
    } else {
      setMessage({ ok: false, text: res.error ?? "제거 실패" });
    }
  }

  /** 카테고리 자체를 DB에서 삭제. (전체 보기이거나 현장거래가 아닐 때만 사용) */
  async function handleDelete(c: CategoryRow) {
    if (!confirm(`「${c.name}」을(를) 완전히 삭제할까요? 삭제하면 복구할 수 없습니다.`)) return;
    setLoading(true);
    setMessage(null);
    const res = await deleteCategory(c.id);
    setLoading(false);
    if (res.ok) {
      setCategories((prev) => prev.filter((x) => x.id !== c.id));
      setPendingJobOrderIds(null);
      setCategoryListingTypesState((prev) => {
        const next = { ...prev };
        delete next[c.id];
        return next;
      });
      setMessage({ ok: true, text: "삭제되었습니다." });
      if (editingId === c.id) setEditingId(null);
      if (editingListingTypesId === c.id) setEditingListingTypesId(null);
    } else {
      setMessage({ ok: false, text: res.error ?? "삭제 실패" });
    }
  }

  async function moveToJobUsage(categoryId: string) {
    setLoading(true);
    setMessage(null);
    const res = await updateCategory(categoryId, { usage: "job" });
    setLoading(false);
    if (!res.ok) {
      setMessage({ ok: false, text: res.error ?? "용도 변경 실패" });
      return;
    }
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, usage: "job" } : c))
    );
    setPendingJobOrderIds(null);
    setJobCategoryRefs((prev) =>
      prev.map((r) => (r.id === categoryId ? { ...r, usage: "job" } : r))
    );
    setMessage({ ok: true, text: "인력구인 카테고리로 변경했습니다." });
  }

  async function handleQuickAddJobCategory(e: React.FormEvent) {
    e.preventDefault();
    const name = quickJobName.trim();
    if (!name) return;
    setLoading(true);
    setMessage(null);
    const res = await addMainCategory(name, quickJobSort, "job");
    setLoading(false);
    if (!res.ok || !res.row) {
      setMessage({ ok: false, text: res.error ?? "업종 추가 실패" });
      return;
    }
    setCategories((prev) => [...prev, res.row as CategoryRow].sort((a, b) => a.sort_order - b.sort_order));
    setPendingJobOrderIds(null);
    setQuickJobName("");
    setQuickJobSort(jobMainCategories.length);
    setMessage({ ok: true, text: "인력구인 업종이 추가되었습니다." });
  }

  function beginInlineEditJobRow(rowId: string) {
    const row = categoryById.get(rowId);
    if (!row) return;
    setEditingJobRowId(rowId);
    setEditingJobName(row.name);
    setEditingJobSort(row.sort_order);
  }

  async function saveInlineEditJobRow() {
    if (!editingJobRowId) return;
    setLoading(true);
    setMessage(null);
    const res = await updateCategory(editingJobRowId, {
      name: editingJobName,
      sort_order: editingJobSort,
    });
    setLoading(false);
    if (!res.ok) {
      setMessage({ ok: false, text: res.error ?? "수정 실패" });
      return;
    }
    setCategories((prev) =>
      prev.map((c) =>
        c.id === editingJobRowId ? { ...c, name: editingJobName.trim(), sort_order: editingJobSort } : c
      )
    );
    setPendingJobOrderIds(null);
    setJobCategoryRefs((prev) =>
      prev.map((r) => (r.id === editingJobRowId ? { ...r, name: editingJobName.trim() } : r))
    );
    setEditingJobRowId(null);
    setMessage({ ok: true, text: "업종명이 수정되었습니다." });
  }

  function reorderJobRowsLocally(dragId: string, dropId: string) {
    if (!dragId || !dropId || dragId === dropId) return;
    const baseIds = (pendingJobOrderIds ?? jobQuickRows.map((r) => r.id)).slice();
    const from = baseIds.indexOf(dragId);
    const to = baseIds.indexOf(dropId);
    if (from < 0 || to < 0) return;
    baseIds.splice(from, 1);
    baseIds.splice(to, 0, dragId);
    setPendingJobOrderIds(baseIds);
  }

  async function saveJobOrder() {
    const rows = displayedJobRows;
    const changes = rows
      .map((r, idx) => ({ id: r.id, sort_order: idx }))
      .filter((x) => (categoryById.get(x.id)?.sort_order ?? x.sort_order) !== x.sort_order);
    if (changes.length === 0) {
      setMessage({ ok: true, text: "변경된 순서가 없습니다." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const results = await Promise.all(changes.map((c) => updateCategory(c.id, { sort_order: c.sort_order })));
    setLoading(false);
    const failed = results.find((r) => !r.ok);
    if (failed) {
      setMessage({ ok: false, text: failed.error ?? "순서 저장 실패" });
      return;
    }
    const changeMap = new Map(changes.map((c) => [c.id, c.sort_order]));
    setCategories((prev) => prev.map((c) => (changeMap.has(c.id) ? { ...c, sort_order: changeMap.get(c.id) ?? c.sort_order } : c)));
    setPendingJobOrderIds(null);
    setMessage({ ok: true, text: "순서가 저장되었습니다." });
  }

  async function handleAddPreset(e: React.FormEvent) {
    e.preventDefault();
    const label = newPresetLabel.trim();
    if (!label) return;
    setLoading(true);
    setMessage(null);
    const res = await addJobTypePreset({
      label,
      sort_order: presetRows.length,
    });
    setLoading(false);
    if (!res.ok || !res.row) {
      setMessage({ ok: false, text: res.error ?? "프리셋 추가 실패" });
      return;
    }
    setJobTypePresets((prev) => [...prev, res.row as JobTypePresetRow]);
    setPendingPresetOrderIds(null);
    setNewPresetLabel("");
    setMessage({ ok: true, text: "프리셋이 추가되었습니다." });
  }

  function beginEditPreset(row: JobTypePresetRow) {
    setEditingPresetId(row.id);
    setEditingPresetKey(row.key);
    setEditingPresetLabel(row.label);
    setEditingPresetSort(row.sort_order);
  }

  async function saveEditPreset() {
    if (!editingPresetId) return;
    setLoading(true);
    setMessage(null);
    const res = await updateJobTypePreset(editingPresetId, {
      key: editingPresetKey,
      label: editingPresetLabel,
      sort_order: editingPresetSort,
    });
    setLoading(false);
    if (!res.ok) {
      setMessage({ ok: false, text: res.error ?? "프리셋 수정 실패" });
      return;
    }
    setJobTypePresets((prev) =>
      prev.map((p) =>
        p.id === editingPresetId
          ? { ...p, key: editingPresetKey.trim(), label: editingPresetLabel.trim(), sort_order: editingPresetSort }
          : p
      )
    );
    setPendingPresetOrderIds(null);
    setEditingPresetId(null);
    setMessage({ ok: true, text: "프리셋이 수정되었습니다." });
  }

  function reorderPresetsLocally(dragId: string, dropId: string) {
    if (!dragId || !dropId || dragId === dropId) return;
    const baseIds = (pendingPresetOrderIds ?? presetRows.map((r) => r.id)).slice();
    const from = baseIds.indexOf(dragId);
    const to = baseIds.indexOf(dropId);
    if (from < 0 || to < 0) return;
    baseIds.splice(from, 1);
    baseIds.splice(to, 0, dragId);
    setPendingPresetOrderIds(baseIds);
  }

  async function savePresetOrder() {
    const rows = displayedPresetRows;
    const changes = rows
      .map((r, idx) => ({ id: r.id, sort_order: idx }))
      .filter((x) => (jobTypePresets.find((p) => p.id === x.id)?.sort_order ?? x.sort_order) !== x.sort_order);
    if (changes.length === 0) {
      setMessage({ ok: true, text: "변경된 순서가 없습니다." });
      return;
    }
    setLoading(true);
    setMessage(null);
    const results = await Promise.all(changes.map((c) => updateJobTypePreset(c.id, { sort_order: c.sort_order })));
    setLoading(false);
    const failed = results.find((r) => !r.ok);
    if (failed) {
      setMessage({ ok: false, text: failed.error ?? "프리셋 순서 저장 실패" });
      return;
    }
    const map = new Map(changes.map((c) => [c.id, c.sort_order]));
    setJobTypePresets((prev) => prev.map((p) => (map.has(p.id) ? { ...p, sort_order: map.get(p.id) ?? p.sort_order } : p)));
    setPendingPresetOrderIds(null);
    setMessage({ ok: true, text: "프리셋 순서가 저장되었습니다." });
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">용도별 카테고리</h2>
        <p className="mb-4 text-sm text-slate-500">
          현장거래·인력구인·기본을 구분해 관리합니다. 현장거래: 유형(정기 매매 등)은 글쓰기에서 선택하고, 여기서는 업무 종류(병원 청소, 사무실 청소 등)만 관리합니다.
        </p>
        <div className="flex flex-wrap gap-2">
          {USAGE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setSelectedUsage(tab.value);
                setNewSubParentId("");
                setEditingId(null);
                if (tab.value !== "listing") setSelectedListingTypeFilter(null);
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedUsage === tab.value
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </section>

      {message && (
        <p
          className={
            message.ok
              ? "rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800"
              : "rounded-lg bg-red-50 p-3 text-sm text-red-700"
          }
        >
          {message.text}
        </p>
      )}

      {isListingTab && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">유형 (거래 유형)</h2>
          <p className="mb-4 text-sm text-slate-600">
            정기 매매·일회 매매·정기 소개·일회 소개·도급 각 유형을 선택하면, 해당 유형에서만 선택 가능한 업무 종류만 아래 목록에 표시됩니다. 「이 유형에서 제거」는 선택한 유형과의 연결만 해제하며, 수정·비활성화는 해당 업무 종류에 동일하게 적용됩니다.
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedListingTypeFilter(null)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedListingTypeFilter == null
                  ? "bg-slate-800 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              전체
            </button>
            {LISTING_TYPE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedListingTypeFilter(key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedListingTypeFilter === key
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {LISTING_TYPE_LABELS[key]}
              </button>
            ))}
          </div>
        </section>
      )}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{mainLabel} 추가</h2>
        <form onSubmit={handleAddMain} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">이름</span>
            <input
              type="text"
              value={newMainName}
              onChange={(e) => setNewMainName(e.target.value)}
              placeholder={isListingTab ? "예: 병원 청소, 사무실 청소" : "예: 일반청소"}
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">정렬 순서</span>
            <input
              type="number"
              value={newMainSort}
              onChange={(e) => setNewMainSort(Number(e.target.value) || 0)}
              className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !newMainName.trim()}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {mainLabel} 추가
          </button>
        </form>
      </section>

      {!isListingTab && (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{subLabel} 추가</h2>
        <form onSubmit={handleAddSub} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">{mainLabel}</span>
            <select
              value={newSubParentId}
              onChange={(e) => setNewSubParentId(e.target.value)}
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">선택</option>
              {mainCategories.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">이름</span>
            <input
              type="text"
              value={newSubName}
              onChange={(e) => setNewSubName(e.target.value)}
              placeholder="예: 사무실청소"
              className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">정렬</span>
            <input
              type="number"
              value={newSubSort}
              onChange={(e) => setNewSubSort(Number(e.target.value) || 0)}
              className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={loading || !newSubName.trim() || !newSubParentId}
            className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
          >
            {subLabel} 추가
          </button>
        </form>
      </section>
      )}

      {isJobTab && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">구인 폼 업종 프리셋(기준)</h2>
          <p className="mb-4 text-sm text-slate-500">
            구인 등록 화면 칩 순서/노출의 기준입니다. 평균 단가 데이터는 프리셋 키에 연결됩니다.
          </p>
          <form onSubmit={handleAddPreset} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">표시 라벨</span>
              <input
                type="text"
                value={newPresetLabel}
                onChange={(e) => setNewPresetLabel(e.target.value)}
                placeholder="예: 고압수 작업"
                className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !newPresetLabel.trim()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              프리셋 추가
            </button>
          </form>
          <p className="mb-3 text-xs text-slate-500">프리셋 키는 라벨 기준으로 서버에서 자동 생성됩니다. (중복 시 번호 자동 부여)</p>
          <div className="mb-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void savePresetOrder()}
              disabled={loading || !isPresetOrderDirty}
              className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              순서 저장
            </button>
            {isPresetOrderDirty && <span className="text-xs text-amber-700">프리셋 순서 변경됨 · 저장 버튼을 눌러 반영하세요.</span>}
          </div>
          <ul className="space-y-2">
            {displayedPresetRows.map((r) => (
              <li
                key={r.id}
                draggable={!loading}
                onDragStart={(e) => {
                  setDraggingPresetId(r.id);
                  e.dataTransfer.setData("text/plain", r.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  const dragId = draggingPresetId || e.dataTransfer.getData("text/plain");
                  if (dragId) reorderPresetsLocally(dragId, r.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const dragId = e.dataTransfer.getData("text/plain") || draggingPresetId || "";
                  if (dragId) reorderPresetsLocally(dragId, r.id);
                  setDraggingPresetId(null);
                }}
                onDragEnd={() => setDraggingPresetId(null)}
                className={`flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/40 p-3 ${
                  loading ? "cursor-not-allowed opacity-70" : "cursor-move"
                }`}
              >
                <span className="text-sm text-slate-400">☰</span>
                {editingPresetId === r.id ? (
                  <>
                    <input
                      type="text"
                      value={editingPresetKey}
                      onChange={(e) => setEditingPresetKey(e.target.value)}
                      className="w-44 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                    <input
                      type="text"
                      value={editingPresetLabel}
                      onChange={(e) => setEditingPresetLabel(e.target.value)}
                      className="w-40 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      value={editingPresetSort}
                      onChange={(e) => setEditingPresetSort(Number(e.target.value) || 0)}
                      className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                    <button type="button" onClick={saveEditPreset} className="text-sm text-blue-600 hover:underline">저장</button>
                    <button type="button" onClick={() => setEditingPresetId(null)} className="text-sm text-slate-500 hover:underline">취소</button>
                  </>
                ) : (
                  <>
                    <span className="font-medium text-slate-800">{r.label}</span>
                    <span className="text-xs text-slate-500">key: {r.key}</span>
                    <span className="text-xs text-slate-500">순서 {r.sort_order}</span>
                    <button type="button" onClick={() => beginEditPreset(r)} className="text-sm text-slate-600 hover:underline">수정</button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(`프리셋 「${r.label}」을(를) 삭제할까요?`)) return;
                        setLoading(true);
                        setMessage(null);
                        const res = await deleteJobTypePreset(r.id);
                        setLoading(false);
                        if (!res.ok) {
                          setMessage({ ok: false, text: res.error ?? "프리셋 삭제 실패" });
                          return;
                        }
                        setJobTypePresets((prev) => prev.filter((p) => p.id !== r.id));
                        setPendingPresetOrderIds(null);
                        setMessage({ ok: true, text: "프리셋이 삭제되었습니다." });
                      }}
                      className="text-sm text-red-600 hover:underline"
                    >
                      삭제
                    </button>
                  </>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-slate-500">팁: 프리셋은 드래그 후 `순서 저장`을 눌러야 반영됩니다.</p>
        </section>
      )}

      {isJobTab && (
        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-2 text-lg font-semibold text-slate-800">인력구인 카테고리 빠른 관리(보조)</h2>
          <p className="mb-4 text-sm text-slate-500">
            카테고리 매핑 점검용입니다. 폼 칩 순서/노출은 위 프리셋 섹션을 기준으로 합니다.
          </p>

          <form onSubmit={handleQuickAddJobCategory} className="mb-4 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">업종명</span>
              <input
                type="text"
                value={quickJobName}
                onChange={(e) => setQuickJobName(e.target.value)}
                placeholder="예: 고압수 작업"
                className="w-44 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-slate-500">정렬</span>
              <input
                type="number"
                value={quickJobSort}
                onChange={(e) => setQuickJobSort(Number(e.target.value) || 0)}
                className="w-20 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={loading || !quickJobName.trim()}
              className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              업종 바로 추가
            </button>
          </form>

          {displayedJobRows.length === 0 ? (
            <p className="text-sm text-slate-500">아직 인력구인 업종이 없습니다. 위에서 먼저 추가해 주세요.</p>
          ) : (
            <>
            <div className="mb-3 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void saveJobOrder()}
                disabled={loading || !isJobOrderDirty}
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                순서 저장
              </button>
              {isJobOrderDirty && <span className="text-xs text-amber-700">순서 변경됨 · 저장 버튼을 눌러 반영하세요.</span>}
            </div>
            <ul className="space-y-2">
              {displayedJobRows.map((r) => (
                <li
                  key={r.id}
                  draggable={!loading}
                  onDragStart={(e) => {
                    setDraggingJobRowId(r.id);
                    e.dataTransfer.setData("text/plain", r.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    const dragId = draggingJobRowId || e.dataTransfer.getData("text/plain");
                    if (dragId) reorderJobRowsLocally(dragId, r.id);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const dragId = e.dataTransfer.getData("text/plain") || draggingJobRowId || "";
                    if (dragId) reorderJobRowsLocally(dragId, r.id);
                    setDraggingJobRowId(null);
                  }}
                  onDragEnd={() => setDraggingJobRowId(null)}
                  className={`flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/40 p-3 ${
                    loading ? "cursor-not-allowed opacity-70" : "cursor-move"
                  }`}
                >
                  <span className="text-sm text-slate-400" title="드래그해서 순서 변경">☰</span>
                  {editingJobRowId === r.id ? (
                    <>
                      <input
                        type="text"
                        value={editingJobName}
                        onChange={(e) => setEditingJobName(e.target.value)}
                        className="w-44 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        value={editingJobSort}
                        onChange={(e) => setEditingJobSort(Number(e.target.value) || 0)}
                        className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={saveInlineEditJobRow}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingJobRowId(null)}
                        className="text-sm text-slate-500 hover:underline"
                      >
                        취소
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="font-medium text-slate-800">{r.name}</span>
                      <span className="text-xs text-slate-500">사용 {r.refCount}건</span>
                      <span className="text-xs text-slate-500">순서 {r.sort_order}</span>
                    </>
                  )}
                  <span
                    className={`rounded px-2 py-0.5 text-xs ${
                      r.usage === "job"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    usage: {r.usage}
                  </span>
                  {r.usage !== "job" && (
                    <button
                      type="button"
                      onClick={() => moveToJobUsage(r.id)}
                      disabled={loading}
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                    >
                      인력구인으로 변경
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => beginInlineEditJobRow(r.id)}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    빠른 수정
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const c = categories.find((x) => x.id === r.id);
                      if (c) void handleDelete(c);
                    }}
                    disabled={loading}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
          {jobRefsOutsideJobUsage.length > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              주의: usage가 job이 아닌 업종 {jobRefsOutsideJobUsage.length}개는 구인 등록 화면 노출에서 제외될 수 있습니다.
            </p>
          )}
          <p className="mt-2 text-xs text-slate-500">팁: 항목 왼쪽 ☰ 아이콘을 드래그하면 순서가 즉시 바뀌고, `순서 저장`을 누르면 최종 반영됩니다.</p>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-2 text-lg font-semibold text-slate-800">{mainLabel} 목록</h2>
        {isListingTab && selectedListingTypeFilter && (
          <p className="mb-4 text-sm text-slate-500">
            「{LISTING_TYPE_LABELS[selectedListingTypeFilter as ListingTypeKey]}」에서 선택 가능한 업무 종류입니다.
          </p>
        )}
        {isListingTab && selectedListingTypeFilter && visibleMainCategoriesForListing.length === 0 && (
          <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            이 유형에 연결된 업무 종류가 없습니다. 아래에서 업무 종류를 추가한 뒤 「적용 유형 설정」으로 이 유형을 지정하거나, 전체 목록에서 기존 항목의 적용 유형을 수정하세요.
          </p>
        )}
        <ul className="space-y-2">
          {(isListingTab ? visibleMainCategoriesForListing : mainCategories).map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/50 p-3"
            >
              {editingId === m.id ? (
                <>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-40 rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                  <input
                    type="number"
                    value={editSort}
                    onChange={(e) => setEditSort(Number(e.target.value) || 0)}
                    className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                  />
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    저장
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-sm text-slate-500 hover:underline"
                  >
                    취소
                  </button>
                </>
              ) : (
                <>
                  <span className="font-medium text-slate-800">{m.name}</span>
                  <span className="text-xs text-slate-500">순서 {m.sort_order}</span>
                  {!m.is_active && (
                    <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                      비활성
                    </span>
                  )}
                  {isListingTab && (
                    <>
                      <span className="text-xs text-slate-500">
                        적용 유형: {editingListingTypesId === m.id ? "" : listingTypesSummary(m.id)}
                      </span>
                      {editingListingTypesId === m.id ? (
                        <>
                          <div className="flex flex-wrap items-center gap-2">
                            {LISTING_TYPE_KEYS.map((key) => (
                              <label key={key} className="flex items-center gap-1 text-sm">
                                <input
                                  type="checkbox"
                                  checked={draftListingTypes.includes(key)}
                                  onChange={(e) => {
                                    if (e.target.checked) setDraftListingTypes((prev) => [...prev, key]);
                                    else setDraftListingTypes((prev) => prev.filter((t) => t !== key));
                                  }}
                                />
                                {LISTING_TYPE_LABELS[key]}
                              </label>
                            ))}
                          </div>
                          <button
                            type="button"
                            onClick={() => saveListingTypes(m.id)}
                            disabled={loading}
                            className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                          >
                            적용 유형 저장
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingListingTypesId(null)}
                            className="text-sm text-slate-500 hover:underline"
                          >
                            취소
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEditListingTypes(m)}
                          className="text-sm text-slate-600 hover:underline"
                        >
                          적용 유형 설정
                        </button>
                      )}
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => startEdit(m)}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    수정
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleActive(m)}
                    className="text-sm text-slate-600 hover:underline"
                  >
                    {m.is_active ? "비활성화" : "활성화"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      isListingTab && selectedListingTypeFilter
                        ? handleRemoveFromType(m)
                        : handleDelete(m)
                    }
                    disabled={loading}
                    className="text-sm text-red-600 hover:underline disabled:opacity-50"
                  >
                    {isListingTab && selectedListingTypeFilter ? "이 유형에서 제거" : "삭제"}
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      {!isListingTab && (
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">{subLabel} 목록</h2>
        <ul className="space-y-2">
          {subCategories.map((s) => {
            const parent = mainCategories.find((m) => m.id === s.parent_id);
            return (
              <li
                key={s.id}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-100 bg-slate-50/30 p-3 pl-6"
              >
                {editingId === s.id ? (
                  <>
                    <select
                      value={editParentId}
                      onChange={(e) => setEditParentId(e.target.value)}
                      className="w-40 rounded border border-slate-200 px-2 py-1 text-sm"
                    >
                      {mainCategories.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-40 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                    <input
                      type="number"
                      value={editSort}
                      onChange={(e) => setEditSort(Number(e.target.value) || 0)}
                      className="w-16 rounded border border-slate-200 px-2 py-1 text-sm"
                    />
                    <button
                      type="button"
                      onClick={saveEdit}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="text-sm text-slate-500 hover:underline"
                    >
                      취소
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">{parent?.name ?? "—"} →</span>
                    <span className="font-medium text-slate-800">{s.name}</span>
                    <span className="text-xs text-slate-500">순서 {s.sort_order}</span>
                    {!s.is_active && (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        비활성
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => startEdit(s)}
                      className="text-sm text-slate-600 hover:underline"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(s)}
                      className="text-sm text-slate-600 hover:underline"
                    >
                      {s.is_active ? "비활성화" : "활성화"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(s)}
                      disabled={loading}
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                    >
                      삭제
                    </button>
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
      )}
    </div>
  );
}
