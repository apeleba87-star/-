"use client";

import { useState } from "react";
import {
  deleteEduBlogCategory,
  saveEduBlogCategory,
} from "@/app/admin/blog/category-actions";
import { slugifyEduCategoryName, type EduBlogCategory } from "@/lib/edu-blog/categories";
import { eduBlogCategoryPath } from "@/lib/edu-blog/constants";

type Props = {
  initialCategories: EduBlogCategory[];
};

type Draft = {
  name: string;
  slug: string;
  description: string;
  sort_order: string;
  is_published: boolean;
};

function emptyDraft(): Draft {
  return { name: "", slug: "", description: "", sort_order: "0", is_published: true };
}

function fromCategory(c: EduBlogCategory): Draft {
  return {
    name: c.name,
    slug: c.slug,
    description: c.description ?? "",
    sort_order: String(c.sort_order),
    is_published: c.is_published,
  };
}

export default function EduBlogCategoriesManager({ initialCategories }: Props) {
  const [categories, setCategories] = useState(initialCategories);
  const [createDraft, setCreateDraft] = useState<Draft>(emptyDraft());
  const [slugTouched, setSlugTouched] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<Draft>(emptyDraft());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const result = await saveEduBlogCategory({
      name: createDraft.name,
      slug: createDraft.slug || slugifyEduCategoryName(createDraft.name),
      description: createDraft.description,
      sort_order: Number(createDraft.sort_order) || 0,
      is_published: createDraft.is_published,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    setError(null);
    const result = await saveEduBlogCategory({
      id,
      name: editDraft.name,
      slug: editDraft.slug,
      description: editDraft.description,
      sort_order: Number(editDraft.sort_order) || 0,
      is_published: editDraft.is_published,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    window.location.reload();
  }

  async function handleDelete(c: EduBlogCategory) {
    const ok = window.confirm(
      `「${c.name}」칸을 삭제할까요? 이 칸의 글은 남고, 허브 목록에서만 빠집니다.`
    );
    if (!ok) return;
    setSaving(true);
    setError(null);
    const result = await deleteEduBlogCategory(c.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setCategories((prev) => prev.filter((x) => x.id !== c.id));
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700" role="alert">
          {error}
        </p>
      ) : null}

      <form onSubmit={handleCreate} className="card space-y-3">
        <p className="font-bold text-slate-900">새 칸</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label">이름</label>
            <input
              className="input"
              value={createDraft.name}
              onChange={(e) => {
                const name = e.target.value;
                setCreateDraft((d) => ({
                  ...d,
                  name,
                  slug: slugTouched ? d.slug : slugifyEduCategoryName(name),
                }));
              }}
              placeholder="입주청소"
              required
            />
          </div>
          <div>
            <label className="label">슬러그 (URL)</label>
            <input
              className="input"
              value={createDraft.slug}
              onChange={(e) => {
                setSlugTouched(true);
                setCreateDraft((d) => ({ ...d, slug: e.target.value }));
              }}
              placeholder="입주청소"
              required
            />
            <p className="mt-1 text-xs text-slate-500">
              {createDraft.slug.trim()
                ? eduBlogCategoryPath(createDraft.slug.trim())
                : "/blog/c/…"}
            </p>
          </div>
        </div>
        <div>
          <label className="label">설명 (허브 카드 · 선택)</label>
          <input
            className="input"
            value={createDraft.description}
            onChange={(e) => setCreateDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="신입 입주 순서, 견적, 클레임"
          />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="label">정렬</label>
            <input
              type="number"
              className="input w-24"
              value={createDraft.sort_order}
              onChange={(e) => setCreateDraft((d) => ({ ...d, sort_order: e.target.value }))}
            />
          </div>
          <label className="mt-6 flex items-center gap-2 text-sm font-medium text-slate-800">
            <input
              type="checkbox"
              checked={createDraft.is_published}
              onChange={(e) => setCreateDraft((d) => ({ ...d, is_published: e.target.checked }))}
            />
            공개 (허브 안쪽 칸에 표시)
          </label>
        </div>
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? "저장 중…" : "칸 추가"}
        </button>
      </form>

      {categories.length === 0 ? (
        <p className="text-slate-500">아직 칸이 없습니다. 위에서 입주·마케팅 등을 추가하세요.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {categories.map((c) => {
            const isEditing = editingId === c.id;
            return (
              <li key={c.id} className="px-4 py-3">
                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <input
                        className="input"
                        value={editDraft.name}
                        onChange={(e) => setEditDraft((d) => ({ ...d, name: e.target.value }))}
                      />
                      <input
                        className="input"
                        value={editDraft.slug}
                        onChange={(e) => setEditDraft((d) => ({ ...d, slug: e.target.value }))}
                      />
                    </div>
                    <input
                      className="input"
                      value={editDraft.description}
                      onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                      placeholder="설명"
                    />
                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        type="number"
                        className="input w-24"
                        value={editDraft.sort_order}
                        onChange={(e) => setEditDraft((d) => ({ ...d, sort_order: e.target.value }))}
                      />
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editDraft.is_published}
                          onChange={(e) =>
                            setEditDraft((d) => ({ ...d, is_published: e.target.checked }))
                          }
                        />
                        공개
                      </label>
                      <button
                        type="button"
                        className="btn-primary text-sm"
                        disabled={saving}
                        onClick={() => handleUpdate(c.id)}
                      >
                        저장
                      </button>
                      <button
                        type="button"
                        className="btn-secondary text-sm"
                        onClick={() => setEditingId(null)}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-900">{c.name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {c.slug}
                        {" · "}
                        {c.is_published ? (
                          <span className="text-teal-700">공개</span>
                        ) : (
                          <span className="text-amber-700">숨김</span>
                        )}
                        {` · 정렬 ${c.sort_order}`}
                      </p>
                      {c.description ? (
                        <p className="mt-1 text-sm text-slate-600">{c.description}</p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {c.is_published ? (
                        <a
                          href={eduBlogCategoryPath(c.slug)}
                          className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
                          target="_blank"
                          rel="noreferrer"
                        >
                          보기
                        </a>
                      ) : null}
                      <button
                        type="button"
                        className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
                        onClick={() => {
                          setEditingId(c.id);
                          setEditDraft(fromCategory(c));
                          setError(null);
                        }}
                      >
                        수정
                      </button>
                      <button
                        type="button"
                        className="rounded bg-rose-50 px-3 py-1.5 text-sm text-rose-800 hover:bg-rose-100"
                        disabled={saving}
                        onClick={() => handleDelete(c)}
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
