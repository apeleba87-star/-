"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type Client = { id: string; name: string };

type Requirement = {
  id: string;
  client_id: string;
  content: string;
  agreed_at: string;
  agreed_contact_name: string | null;
  agreed_contact_phone: string | null;
  notes: string | null;
  created_at: string;
};

type Props = {
  isDark: boolean;
  baseCard: string;
  baseInput: string;
  onError: (msg: string | null) => void;
  onNotice: (msg: string | null) => void;
};

function formatLocalDateTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.valueOf())) return iso;
  return d.toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function ageDays(iso: string): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 3600 * 1000));
}

export default function ClientRequirementsSettings({ isDark, baseCard, baseInput, onError, onNotice }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [history, setHistory] = useState<Requirement[]>([]);
  const [staleThreshold, setStaleThreshold] = useState(30);
  const [loadingClients, setLoadingClients] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newContent, setNewContent] = useState("");
  const [newAgreedAt, setNewAgreedAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [newContactName, setNewContactName] = useState("");
  const [newContactPhone, setNewContactPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const loadClients = useCallback(async () => {
    setLoadingClients(true);
    try {
      const res = await fetch("/api/cleanidex/clients", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "clients_load_failed");
      const list = (json.data ?? []) as Client[];
      setClients(list);
      if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "거래처를 불러오지 못했습니다.");
    } finally {
      setLoadingClients(false);
    }
  }, [onError, selectedId]);

  const loadHistory = useCallback(
    async (clientId: string) => {
      if (!clientId) return;
      setLoadingHistory(true);
      try {
        const res = await fetch(`/api/cleanidex/clients/${clientId}/requirements?history=1&limit=20`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "requirements_load_failed");
        setHistory((json.history ?? []) as Requirement[]);
        if (typeof json.stale_threshold_days === "number") setStaleThreshold(json.stale_threshold_days);
      } catch (e) {
        onError(e instanceof Error ? e.message : "요구사항 이력을 불러오지 못했습니다.");
      } finally {
        setLoadingHistory(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cleanidex/company", { cache: "no-store" });
        const json = await res.json();
        if (!cancelled && res.ok && json?.ok) setIsAdmin(Boolean(json.is_admin));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedId) loadHistory(selectedId);
  }, [selectedId, loadHistory]);

  async function onAddRequirement(e: FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    if (!newContent.trim()) {
      onError("요구사항 내용을 입력해주세요.");
      return;
    }
    setSaving(true);
    onError(null);
    try {
      const res = await fetch(`/api/cleanidex/clients/${selectedId}/requirements`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          content: newContent.trim(),
          agreed_at: new Date(newAgreedAt).toISOString(),
          agreed_contact_name: newContactName.trim() || null,
          agreed_contact_phone: newContactPhone.trim() || null,
          notes: newNotes.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const code = json?.error as string | undefined;
        if (code === "admin_required") throw new Error("요구사항 추가는 관리자만 할 수 있습니다.");
        throw new Error(code || "requirement_create_failed");
      }
      onNotice("새 요구사항을 기록했습니다.");
      setNewContent("");
      setNewContactName("");
      setNewContactPhone("");
      setNewNotes("");
      await loadHistory(selectedId);
    } catch (e) {
      onError(e instanceof Error ? e.message : "요구사항을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  }

  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const dimBox = isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50";
  const current = history[0] ?? null;
  const currentAge = current ? ageDays(current.agreed_at) : null;
  const isStale = currentAge !== null && currentAge > staleThreshold;

  return (
    <div className={`rounded-xl border p-4 ${baseCard}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">거래처 요구사항</h2>
          <p className={`mt-0.5 text-xs ${subText}`}>
            새 row 추가로 이력 보존 — 담당자가 바뀌어도 협의 내용이 그대로 남습니다 (
            {staleThreshold}일 초과 시 stale 표시).
          </p>
        </div>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={`rounded border px-3 py-2 text-sm ${baseInput}`}
          disabled={loadingClients || clients.length === 0}
        >
          {clients.length === 0 ? <option value="">거래처가 없습니다</option> : null}
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {!selectedId ? (
        <p className={`mt-3 text-sm ${subText}`}>거래처를 선택하세요.</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {/* 현재 요구사항 + 이력 */}
          <div className={`rounded-lg border p-3 ${dimBox}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">현재 요구사항</h3>
              {current ? (
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] ${
                    isStale
                      ? isDark
                        ? "bg-amber-900 text-amber-200"
                        : "bg-amber-100 text-amber-700"
                      : "bg-emerald-100 text-emerald-700"
                  }`}
                >
                  {isStale ? `협의 후 ${currentAge}일` : `최신 (${currentAge ?? "-"}일 전)`}
                </span>
              ) : null}
            </div>

            {loadingHistory ? (
              <p className={`mt-2 text-xs ${subText}`}>불러오는 중…</p>
            ) : !current ? (
              <p className={`mt-2 text-xs ${subText}`}>아직 등록된 요구사항이 없습니다.</p>
            ) : (
              <div className="mt-2 space-y-1">
                <div className="whitespace-pre-wrap rounded border p-2 text-sm">{current.content}</div>
                <p className={`text-xs ${subText}`}>
                  협의: {formatLocalDateTime(current.agreed_at)}
                  {current.agreed_contact_name ? ` · 담당 ${current.agreed_contact_name}` : ""}
                  {current.agreed_contact_phone ? ` (${current.agreed_contact_phone})` : ""}
                </p>
              </div>
            )}

            {history.length > 1 ? (
              <details className="mt-3">
                <summary className={`cursor-pointer text-xs ${subText}`}>이력 {history.length - 1}건 보기</summary>
                <div className="mt-2 space-y-2">
                  {history.slice(1).map((h) => (
                    <div key={h.id} className={`rounded border p-2 text-xs ${isDark ? "border-slate-700" : "border-slate-300"}`}>
                      <p className={`mb-1 ${subText}`}>
                        {formatLocalDateTime(h.agreed_at)}
                        {h.agreed_contact_name ? ` · ${h.agreed_contact_name}` : ""}
                      </p>
                      <p className="whitespace-pre-wrap">{h.content}</p>
                    </div>
                  ))}
                </div>
              </details>
            ) : null}
          </div>

          {/* 새 요구사항 추가 */}
          <form onSubmit={onAddRequirement} className={`rounded-lg border p-3 ${dimBox}`}>
            <h3 className="text-sm font-semibold">새 요구사항 기록</h3>
            <p className={`mt-1 text-xs ${subText}`}>변경 시마다 새 항목 추가 — 기존 내용은 이력으로 보존됩니다.</p>
            {!isAdmin ? (
              <p
                className={`mt-2 rounded border px-2 py-1.5 text-xs ${
                  isDark ? "border-amber-800 bg-amber-950/40 text-amber-200" : "border-amber-200 bg-amber-50 text-amber-900"
                }`}
              >
                요구사항 추가는 <strong>관리자</strong>만 할 수 있습니다. 이력 조회는 모든 멤버에게 허용됩니다.
              </p>
            ) : null}

            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              rows={5}
              maxLength={5000}
              placeholder="협의된 요구사항을 자세히 기재"
              disabled={!isAdmin}
              className={`mt-2 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
            />
            <label className="mt-2 block text-xs">
              <span className={subText}>협의 일시</span>
              <input
                type="datetime-local"
                value={newAgreedAt}
                onChange={(e) => setNewAgreedAt(e.target.value)}
                disabled={!isAdmin}
                className={`mt-1 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
              />
            </label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input
                value={newContactName}
                onChange={(e) => setNewContactName(e.target.value)}
                placeholder="담당자 이름"
                maxLength={200}
                disabled={!isAdmin}
                className={`rounded border px-2 py-1.5 text-sm ${baseInput}`}
              />
              <input
                value={newContactPhone}
                onChange={(e) => setNewContactPhone(e.target.value)}
                placeholder="담당자 연락처"
                maxLength={50}
                disabled={!isAdmin}
                className={`rounded border px-2 py-1.5 text-sm ${baseInput}`}
              />
            </div>
            <input
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="내부 메모 (선택)"
              maxLength={2000}
              disabled={!isAdmin}
              className={`mt-2 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
            />
            <button
              type="submit"
              disabled={saving || !newContent.trim() || !isAdmin}
              className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {saving ? "저장 중…" : "기록 추가"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
