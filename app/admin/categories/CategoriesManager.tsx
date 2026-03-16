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
}: {
  initialCategories: CategoryRow[];
  initialCategoryListingTypes?: Record<string, string[]>;
}) {
  const [categories, setCategories] = useState(initialCategories);
  const [categoryListingTypes, setCategoryListingTypesState] = useState<Record<string, string[]>>(initialCategoryListingTypes);
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
  const [editingListingTypesId, setEditingListingTypesId] = useState<string | null>(null);
  const [draftListingTypes, setDraftListingTypes] = useState<string[]>([]);
  /** 현장거래 탭에서 필터: 선택한 유형에 해당하는 업무 종류만 목록에 표시. null = 전체 */
  const [selectedListingTypeFilter, setSelectedListingTypeFilter] = useState<string | null>(null);

  const filtered = categories.filter((c) => (c.usage ?? "default") === selectedUsage);
  const mainCategories = filtered.filter((c) => c.parent_id == null);
  const mainIds = new Set(mainCategories.map((m) => m.id));
  const subCategories = filtered.filter(
    (c) => c.parent_id != null && mainIds.has(c.parent_id)
  );
  // 현장거래 탭: 유형 = 거래 유형(정기 매매 등, 고정), 업무 종류 = 카테고리(병원 청소, 사무실 청소 등)
  const isListingTab = selectedUsage === "listing";
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
  }

  async function saveEdit() {
    if (!editingId) return;
    setLoading(true);
    setMessage(null);
    const res = await updateCategory(editingId, { name: editName, sort_order: editSort });
    setLoading(false);
    if (res.ok) {
      setCategories((prev) =>
        prev.map((c) =>
          c.id === editingId ? { ...c, name: editName.trim(), sort_order: editSort } : c
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
