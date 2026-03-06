"use client";

import { useState } from "react";
import {
  addMainCategory,
  addSubCategory,
  updateCategory,
} from "./actions";

type CategoryRow = {
  id: string;
  name: string;
  parent_id: string | null;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export default function CategoriesManager({
  initialCategories,
}: {
  initialCategories: CategoryRow[];
}) {
  const [categories, setCategories] = useState(initialCategories);
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

  const mainCategories = categories.filter((c) => c.parent_id == null);
  const subCategories = categories.filter((c) => c.parent_id != null);

  async function handleAddMain(e: React.FormEvent) {
    e.preventDefault();
    const name = newMainName.trim();
    if (!name) return;
    setLoading(true);
    setMessage(null);
    const res = await addMainCategory(name, newMainSort);
    setLoading(false);
    if (res.ok && res.row) {
      setCategories((prev) => [...prev, res.row!].sort((a, b) => a.sort_order - b.sort_order));
      setNewMainName("");
      setNewMainSort(mainCategories.length);
      setMessage({ ok: true, text: "대분류가 추가되었습니다." });
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
    const res = await addSubCategory(newSubParentId, name, newSubSort);
    setLoading(false);
    if (res.ok && res.row) {
      setCategories((prev) => [...prev, res.row!].sort((a, b) => a.sort_order - b.sort_order));
      setNewSubName("");
      setNewSubSort(subCategories.filter((c) => c.parent_id === newSubParentId).length);
      setMessage({ ok: true, text: "소분류가 추가되었습니다." });
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

  return (
    <div className="space-y-8">
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

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">대분류 추가</h2>
        <form onSubmit={handleAddMain} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">이름</span>
            <input
              type="text"
              value={newMainName}
              onChange={(e) => setNewMainName(e.target.value)}
              placeholder="예: 일반청소"
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
            대분류 추가
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">소분류 추가</h2>
        <form onSubmit={handleAddSub} className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-slate-500">대분류</span>
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
            소분류 추가
          </button>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">대분류 목록</h2>
        <ul className="space-y-2">
          {mainCategories.map((m) => (
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
                </>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="mb-4 text-lg font-semibold text-slate-800">소분류 목록</h2>
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
                  </>
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
