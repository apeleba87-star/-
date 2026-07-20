"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRIMARY_PLACE_ORDER, getPlaceLabel } from "@/lib/knowledge-hub/solutions/taxonomy";
import { getPlaceJobPath } from "@/lib/knowledge-hub/place-jobs/shared";
import type { PlaceJob, PlaceJobStatus } from "@/lib/knowledge-hub/place-jobs/types";

type JobItem = PlaceJob & { source: "seed" | "db"; path: string };

type Props = {
  seedJobs: JobItem[];
  dbJobs: JobItem[];
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

export default function AdminPlaceJobsPanel({ seedJobs, dbJobs }: Props) {
  const router = useRouter();
  const [localDb, setLocalDb] = useState(dbJobs);
  useEffect(() => setLocalDb(dbJobs), [dbJobs]);

  const [screen, setScreen] = useState<"list" | "form">("list");
  const [browse, setBrowse] = useState<"place" | "jobs">("place");
  const [filterPlaceId, setFilterPlaceId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState("office");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [summary, setSummary] = useState("");
  const [prepareText, setPrepareText] = useState("");
  const [stepsText, setStepsText] = useState("");
  const [motionsText, setMotionsText] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [frequency, setFrequency] = useState("");
  const [cautionsText, setCautionsText] = useState("");
  const [relatedServicePath, setRelatedServicePath] = useState("");
  const [sortOrder, setSortOrder] = useState(0);

  const allListed = useMemo(() => {
    const archived = new Set(localDb.filter((j) => j.status === "archived").map((j) => j.id));
    const map = new Map<string, JobItem>();
    for (const j of seedJobs) {
      if (archived.has(j.id)) continue;
      map.set(j.id, j);
    }
    for (const j of localDb) {
      if (j.status === "archived") continue;
      map.set(j.id, { ...j, source: "db" });
    }
    return [...map.values()].sort(
      (a, b) =>
        a.placeId.localeCompare(b.placeId) ||
        a.sortOrder - b.sortOrder ||
        a.title.localeCompare(b.title, "ko")
    );
  }, [seedJobs, localDb]);

  const placeBuckets = useMemo(() => {
    const count = new Map<string, number>();
    for (const j of allListed) count.set(j.placeId, (count.get(j.placeId) ?? 0) + 1);
    return PRIMARY_PLACE_ORDER.map((id) => ({
      id,
      label: getPlaceLabel(id),
      n: count.get(id) ?? 0,
    })).filter((p) => p.n > 0);
  }, [allListed]);

  const filteredJobs = useMemo(
    () => allListed.filter((j) => j.placeId === filterPlaceId),
    [allListed, filterPlaceId]
  );

  function startCreate() {
    setEditingId(null);
    setPlaceId(filterPlaceId || "office");
    setSlug("");
    setTitle("");
    setStatus("published");
    setSummary("");
    setPrepareText("");
    setStepsText("");
    setMotionsText("");
    setChecklistText("");
    setFrequency("");
    setCautionsText("");
    setRelatedServicePath("");
    setSortOrder(0);
    setMsg(null);
    setScreen("form");
  }

  function startEdit(job: JobItem) {
    setEditingId(job.id);
    setPlaceId(job.placeId);
    setSlug(job.slug);
    setTitle(job.title);
    setStatus(job.status === "published" ? "published" : "draft");
    setSummary(job.summary ?? "");
    setPrepareText(listToLines(job.prepare));
    setStepsText(listToLines(job.steps));
    setMotionsText(listToLines(job.motions));
    setChecklistText(listToLines(job.checklist));
    setFrequency(job.frequency ?? "");
    setCautionsText(listToLines(job.cautions));
    setRelatedServicePath(job.relatedServicePath ?? "");
    setSortOrder(job.sortOrder);
    setMsg(null);
    setScreen("form");
  }

  async function saveJob() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        id: editingId || undefined,
        placeId,
        slug: slug || undefined,
        title,
        status,
        summary,
        prepare: linesToList(prepareText),
        steps: linesToList(stepsText),
        motions: linesToList(motionsText),
        checklist: linesToList(checklistText),
        frequency,
        cautions: linesToList(cautionsText),
        relatedServicePath: relatedServicePath || undefined,
        sortOrder,
      };
      const res = await fetch("/api/admin/place-jobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string; id?: string; path?: string };
      if (!json.ok) {
        setMsg(json.error || "저장 실패");
        return;
      }
      const savedId = json.id ?? editingId!;
      const saved: JobItem = {
        id: savedId,
        placeId,
        slug: slug || savedId.split("__")[1] || "job",
        title: title.trim(),
        summary: summary.trim() || undefined,
        prepare: linesToList(prepareText),
        steps: linesToList(stepsText),
        motions: linesToList(motionsText),
        checklist: linesToList(checklistText),
        frequency: frequency.trim() || undefined,
        cautions: linesToList(cautionsText),
        relatedServicePath: relatedServicePath.trim() || undefined,
        status: status as PlaceJobStatus,
        sortOrder,
        source: "db",
        path: json.path ?? getPlaceJobPath({ placeId, slug: slug || "job" }),
      };
      setLocalDb((prev) => {
        const idx = prev.findIndex((j) => j.id === savedId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [...prev, saved];
      });
      setEditingId(savedId);
      setMsg(`저장됨 ${saved.path}`);
      router.refresh();
      setScreen("list");
      setBrowse("jobs");
      setFilterPlaceId(placeId);
    } catch {
      setMsg("저장 중 오류");
    } finally {
      setBusy(false);
    }
  }

  async function saveTitleInline(job: JobItem, nextTitle: string) {
    const t = nextTitle.trim();
    if (!t || t === job.title) {
      setEditingTitleId(null);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/admin/place-jobs", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...job, title: t, status: job.status === "published" ? "published" : "draft" }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setMsg(json.error || "제목 저장 실패");
        return;
      }
      setLocalDb((prev) => {
        const row = { ...job, title: t, source: "db" as const };
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = row;
          return copy;
        }
        return [...prev, row];
      });
      setEditingTitleId(null);
      setMsg("제목 저장됨");
      router.refresh();
    } catch {
      setMsg("제목 저장 오류");
    } finally {
      setBusy(false);
    }
  }

  async function deleteJob(job: JobItem) {
    if (!window.confirm(`「${job.title}」을(를) 삭제할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/place-jobs", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setMsg(json.error || "삭제 실패");
        return;
      }
      setLocalDb((prev) => {
        const archived = { ...job, status: "archived" as const, source: "db" as const };
        const idx = prev.findIndex((j) => j.id === job.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = archived;
          return copy;
        }
        return [...prev, archived];
      });
      setMsg("삭제됨");
      router.refresh();
    } catch {
      setMsg("삭제 오류");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "form") {
    return (
      <div className="mx-auto max-w-3xl space-y-4 px-4 py-8">
        <button type="button" className="text-sm font-bold text-teal-800" onClick={() => setScreen("list")}>
          ← 목록
        </button>
        <h1 className="text-2xl font-black text-slate-900">{editingId ? "방법 편집" : "방법 만들기"}</h1>
        {msg ? <p className="text-sm font-medium text-teal-800">{msg}</p> : null}

        <label className="block text-sm">
          <span className="font-bold text-slate-600">장소</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={placeId}
            onChange={(e) => setPlaceId(e.target.value)}
          >
            {PRIMARY_PLACE_ORDER.map((id) => (
              <option key={id} value={id}>
                {getPlaceLabel(id)}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-bold text-slate-600">제목</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-bold text-slate-600">URL slug</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="비우면 자동"
          />
        </label>
        <label className="block text-sm">
          <span className="font-bold text-slate-600">한줄로 보면</span>
          <textarea
            className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </label>
        {(
          [
            ["준비 (줄마다)", prepareText, setPrepareText],
            ["순서 (줄마다)", stepsText, setStepsText],
            ["동작·팁 (줄마다)", motionsText, setMotionsText],
            ["마감 체크 (줄마다)", checklistText, setChecklistText],
            ["주의 (줄마다)", cautionsText, setCautionsText],
          ] as const
        ).map(([label, val, set]) => (
          <label key={label} className="block text-sm">
            <span className="font-bold text-slate-600">{label}</span>
            <textarea
              className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={val}
              onChange={(e) => set(e.target.value)}
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="font-bold text-slate-600">주기</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-bold text-slate-600">기존 가이드 경로</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={relatedServicePath}
            onChange={(e) => setRelatedServicePath(e.target.value)}
            placeholder="/services/office-regular/floor"
          />
        </label>
        <label className="block text-sm">
          <span className="font-bold text-slate-600">상태</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          >
            <option value="draft">draft</option>
            <option value="published">published</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-bold text-slate-600">정렬</span>
          <input
            type="number"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </label>
        <button
          type="button"
          disabled={busy || !title.trim()}
          onClick={() => void saveJob()}
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
        >
          저장
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900">장소별 청소 방법</h1>
        <p className="mt-1 text-sm text-slate-600">
          장소 → 할 일로 좁힌 뒤 편집합니다.{" "}
          <Link href="/places" className="font-semibold text-teal-800 hover:underline">
            공개 허브
          </Link>
          {" · "}
          <Link href="/admin/solutions" className="font-semibold text-slate-600 hover:underline">
            오염 솔루션
          </Link>
          {" · "}
          <Link href="/admin/materials" className="font-semibold text-slate-600 hover:underline">
            재질별
          </Link>
        </p>
        {msg ? <p className="mt-2 text-sm font-medium text-teal-800">{msg}</p> : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black text-slate-900">
            방법 목록
            <span className="ml-2 text-sm font-bold text-slate-500">({allListed.length})</span>
          </h2>
          <button
            type="button"
            onClick={startCreate}
            className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white"
          >
            새로 만들기
          </button>
        </div>

        {browse !== "place" ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="text-sm font-bold text-teal-800"
              onClick={() => {
                setBrowse("place");
                setFilterPlaceId("");
              }}
            >
              ← 뒤로
            </button>
            <span className="text-sm text-slate-500">{getPlaceLabel(filterPlaceId)}</span>
          </div>
        ) : null}

        {browse === "place" ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {placeBuckets.map((pl) => (
              <li key={pl.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3 text-left"
                  onClick={() => {
                    setFilterPlaceId(pl.id);
                    setBrowse("jobs");
                  }}
                >
                  <span className="font-bold text-slate-950">{pl.label}</span>
                  <span className="text-sm font-bold text-slate-500">{pl.n}개 →</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {filteredJobs.map((j) => (
              <li key={j.id} className="flex flex-wrap items-start gap-2 py-3">
                <div className="min-w-0 flex-1">
                  {editingTitleId === j.id ? (
                    <input
                      autoFocus
                      className="w-full rounded-lg border border-teal-600 px-2 py-1.5 text-sm font-bold"
                      value={titleDraft}
                      onChange={(e) => setTitleDraft(e.target.value)}
                      onBlur={() => void saveTitleInline(j, titleDraft)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void saveTitleInline(j, titleDraft);
                        if (e.key === "Escape") setEditingTitleId(null);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      className="text-left font-bold text-slate-950 hover:text-teal-800"
                      onClick={() => {
                        setEditingTitleId(j.id);
                        setTitleDraft(j.title);
                      }}
                    >
                      {j.title}
                    </button>
                  )}
                  <p className="mt-0.5 text-xs text-slate-500">
                    {j.source === "db" ? "DB" : "시드"} · {j.status}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(j)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                >
                  편집하기
                </button>
                {j.status === "published" ? (
                  <Link href={j.path} className="px-2 py-2 text-sm font-bold text-slate-500">
                    보기
                  </Link>
                ) : null}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void deleteJob(j)}
                  className="px-2 py-2 text-sm font-bold text-red-600"
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
