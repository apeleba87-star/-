"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { RISK_LEVEL_KO } from "@/lib/knowledge-hub/korean-labels";
import {
  MATERIAL_GROUP_LABEL,
  MATERIAL_GROUP_ORDER,
  getMaterialGroupId,
  type MaterialGroupId,
} from "@/lib/knowledge-hub/materials/groups";
import type { MaterialGuideStatus } from "@/lib/knowledge-hub/materials/types";

export type AdminMaterialItem = {
  materialId: string;
  name: string;
  riskLevel: string;
  principle: string;
  donts: string[];
  okHints: string[];
  care: string[];
  status: MaterialGuideStatus;
  source: "seed" | "db";
};

type Props = {
  materials: AdminMaterialItem[];
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

export default function AdminMaterialsPanel({ materials: initial }: Props) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  useEffect(() => setItems(initial), [initial]);

  const [screen, setScreen] = useState<"list" | "form">("list");
  const [browse, setBrowse] = useState<"group" | "materials">("group");
  const [filterGroup, setFilterGroup] = useState<MaterialGroupId | "">("");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [materialId, setMaterialId] = useState("");
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [principle, setPrinciple] = useState("");
  const [dontsText, setDontsText] = useState("");
  const [okHintsText, setOkHintsText] = useState("");
  const [careText, setCareText] = useState("");

  const listed = useMemo(() => {
    return [...items].sort(
      (a, b) =>
        getMaterialGroupId(a.materialId).localeCompare(getMaterialGroupId(b.materialId)) ||
        a.name.localeCompare(b.name, "ko")
    );
  }, [items]);

  const groupBuckets = useMemo(() => {
    const count = new Map<MaterialGroupId, number>();
    for (const m of listed) {
      const g = getMaterialGroupId(m.materialId);
      count.set(g, (count.get(g) ?? 0) + 1);
    }
    return MATERIAL_GROUP_ORDER.map((id) => ({
      id,
      label: MATERIAL_GROUP_LABEL[id],
      n: count.get(id) ?? 0,
    })).filter((g) => g.n > 0);
  }, [listed]);

  const filtered = useMemo(
    () => listed.filter((m) => getMaterialGroupId(m.materialId) === filterGroup),
    [listed, filterGroup]
  );

  function startEdit(m: AdminMaterialItem) {
    setMaterialId(m.materialId);
    setName(m.name);
    setStatus(m.status === "published" ? "published" : "draft");
    setPrinciple(m.principle);
    setDontsText(listToLines(m.donts));
    setOkHintsText(listToLines(m.okHints));
    setCareText(listToLines(m.care));
    setMsg(null);
    setScreen("form");
  }

  async function saveGuide() {
    setBusy(true);
    setMsg(null);
    try {
      const payload = {
        materialId,
        principle,
        donts: linesToList(dontsText),
        okHints: linesToList(okHintsText),
        care: linesToList(careText),
        status,
      };
      const res = await fetch("/api/admin/material-guides", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setMsg(json.error || "저장 실패");
        return;
      }
      setItems((prev) =>
        prev.map((m) =>
          m.materialId === materialId
            ? {
                ...m,
                principle: principle.trim(),
                donts: linesToList(dontsText),
                okHints: linesToList(okHintsText),
                care: linesToList(careText),
                status,
                source: "db",
              }
            : m
        )
      );
      setMsg("저장됨");
      router.refresh();
      setScreen("list");
      setBrowse("materials");
      setFilterGroup(getMaterialGroupId(materialId));
    } catch {
      setMsg("저장 중 오류");
    } finally {
      setBusy(false);
    }
  }

  async function resetToSeed(m: AdminMaterialItem) {
    if (m.source !== "db") {
      setMsg("시드만 있어 초기화할 DB 오버레이가 없습니다.");
      return;
    }
    if (!window.confirm(`「${m.name}」DB 가이드를 지우고 시드로 되돌릴까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/material-guides", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialId: m.materialId }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (!json.ok) {
        setMsg(json.error || "초기화 실패");
        return;
      }
      setMsg("시드로 되돌림 — 새로고침하면 시드 내용이 반영됩니다.");
      router.refresh();
    } catch {
      setMsg("초기화 오류");
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
        <h1 className="text-2xl font-black text-slate-900">표면 안전 편집</h1>
        <p className="text-sm text-slate-600">
          {name}{" "}
          <span className="text-slate-400">({materialId})</span>
        </p>
        {msg ? <p className="text-sm font-medium text-teal-800">{msg}</p> : null}

        <label className="block text-sm">
          <span className="font-bold text-slate-600">한줄 원칙</span>
          <textarea
            className="mt-1 min-h-[88px] w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={principle}
            onChange={(e) => setPrinciple(e.target.value)}
          />
        </label>
        {(
          [
            ["하면 안 됨 (줄마다)", dontsText, setDontsText],
            ["권장 접근 (줄마다)", okHintsText, setOkHintsText],
            ["일상 관리 (줄마다)", careText, setCareText],
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
          <span className="font-bold text-slate-600">상태</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          >
            <option value="draft">draft (공개는 시드 유지)</option>
            <option value="published">published (공개에 반영)</option>
          </select>
        </label>
        <button
          type="button"
          disabled={busy || !principle.trim()}
          onClick={() => void saveGuide()}
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
        <h1 className="text-2xl font-black text-slate-900">재질별 표면 안전</h1>
        <p className="mt-1 text-sm text-slate-600">
          재질군 → 재질로 좁힌 뒤 원칙·금기·권장을 편집합니다.{" "}
          <Link href="/materials" className="font-semibold text-teal-800 hover:underline">
            공개 허브
          </Link>
          {" · "}
          <Link href="/admin/solutions" className="font-semibold text-slate-600 hover:underline">
            오염 솔루션
          </Link>
          {" · "}
          <Link href="/admin/places" className="font-semibold text-slate-600 hover:underline">
            장소별
          </Link>
        </p>
        {msg ? <p className="mt-2 text-sm font-medium text-teal-800">{msg}</p> : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-black text-slate-900">
          재질 목록
          <span className="ml-2 text-sm font-bold text-slate-500">({listed.length})</span>
        </h2>

        {browse !== "group" ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              className="text-sm font-bold text-teal-800"
              onClick={() => {
                setBrowse("group");
                setFilterGroup("");
              }}
            >
              ← 뒤로
            </button>
            <span className="text-sm text-slate-500">
              {filterGroup ? MATERIAL_GROUP_LABEL[filterGroup] : ""}
            </span>
          </div>
        ) : null}

        {browse === "group" ? (
          <ul className="mt-4 divide-y divide-slate-100">
            {groupBuckets.map((g) => (
              <li key={g.id}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between py-3 text-left"
                  onClick={() => {
                    setFilterGroup(g.id);
                    setBrowse("materials");
                  }}
                >
                  <span className="font-bold text-slate-950">{g.label}</span>
                  <span className="text-sm font-bold text-slate-500">{g.n}개 →</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {filtered.map((m) => (
              <li key={m.materialId} className="flex flex-wrap items-start gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-slate-950">{m.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {m.source === "db" ? "DB" : "시드"} · {m.status}
                    {" · "}위험도 {RISK_LEVEL_KO[m.riskLevel] ?? m.riskLevel}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => startEdit(m)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold"
                >
                  편집하기
                </button>
                {m.status === "published" || m.source === "seed" ? (
                  <Link
                    href={`/materials/${m.materialId}`}
                    className="px-2 py-2 text-sm font-bold text-slate-500"
                  >
                    보기
                  </Link>
                ) : null}
                {m.source === "db" ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void resetToSeed(m)}
                    className="px-2 py-2 text-sm font-bold text-red-600"
                  >
                    시드로
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
