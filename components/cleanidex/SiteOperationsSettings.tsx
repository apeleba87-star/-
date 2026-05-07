"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { WEEKDAY_LABELS_KO, getWeekStartIso, parseIsoDate, toIsoDate } from "@/lib/cleanidex/week";

type Site = {
  id: string;
  client_id: string;
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  geofence_radius_m: number | null;
};

type Client = { id: string; name: string };

type ScheduleRule = {
  id: string;
  effective_from: string;
  cadence: "weekly_count" | "weekday";
  weekly_count: number | null;
  weekdays: number[] | null;
  notes: string | null;
  created_at: string;
};

type Override = {
  id: string;
  week_start: string;
  kind: "skip" | "add";
  occur_date: string;
  notes: string | null;
};

type Props = {
  isDark: boolean;
  baseCard: string;
  baseInput: string;
  onError: (msg: string | null) => void;
  onNotice: (msg: string | null) => void;
};

const DAY_BUTTONS: { code: number; label: string }[] = [
  { code: 1, label: WEEKDAY_LABELS_KO[1] },
  { code: 2, label: WEEKDAY_LABELS_KO[2] },
  { code: 3, label: WEEKDAY_LABELS_KO[3] },
  { code: 4, label: WEEKDAY_LABELS_KO[4] },
  { code: 5, label: WEEKDAY_LABELS_KO[5] },
  { code: 6, label: WEEKDAY_LABELS_KO[6] },
  { code: 0, label: WEEKDAY_LABELS_KO[0] },
];

function formatRule(rule: ScheduleRule): string {
  if (rule.cadence === "weekly_count" && rule.weekly_count !== null) {
    return `주 ${rule.weekly_count}회`;
  }
  if (rule.cadence === "weekday" && rule.weekdays && rule.weekdays.length > 0) {
    return rule.weekdays
      .slice()
      .sort((a, b) => a - b)
      .map((d) => `매주 ${WEEKDAY_LABELS_KO[d]}`)
      .join(", ");
  }
  return "-";
}

export default function SiteOperationsSettings({ isDark, baseCard, baseInput, onError, onNotice }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // 위치 편집
  const [editLat, setEditLat] = useState("");
  const [editLng, setEditLng] = useState("");
  const [editRadius, setEditRadius] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);
  const [resolvingGps, setResolvingGps] = useState(false);

  // 룰
  const [rules, setRules] = useState<ScheduleRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(false);
  const [newCadence, setNewCadence] = useState<"weekly_count" | "weekday">("weekday");
  const [newWeeklyCount, setNewWeeklyCount] = useState("1");
  const [newWeekdays, setNewWeekdays] = useState<number[]>([3]); // 기본: 수요일
  const [newEffectiveFrom, setNewEffectiveFrom] = useState(() => toIsoDate(new Date()));
  const [newRuleNotes, setNewRuleNotes] = useState("");
  const [savingRule, setSavingRule] = useState(false);

  // 오버라이드
  const [overrides, setOverrides] = useState<Override[]>([]);
  const [overridesLoading, setOverridesLoading] = useState(false);
  const [overrideWeekStart, setOverrideWeekStart] = useState(() => getWeekStartIso(new Date()));
  const [newOverrideKind, setNewOverrideKind] = useState<"skip" | "add">("skip");
  const [newOverrideDate, setNewOverrideDate] = useState(() => toIsoDate(new Date()));
  const [newOverrideNotes, setNewOverrideNotes] = useState("");
  const [savingOverride, setSavingOverride] = useState(false);

  const loadInitial = useCallback(async () => {
    setLoading(true);
    try {
      const [clientsRes, sitesRes] = await Promise.all([
        fetch("/api/cleanidex/clients", { cache: "no-store" }),
        fetch("/api/cleanidex/sites", { cache: "no-store" }),
      ]);
      const clientsJson = await clientsRes.json();
      const sitesJson = await sitesRes.json();
      if (!clientsRes.ok || !clientsJson?.ok) throw new Error(clientsJson?.error || "clients_load_failed");
      if (!sitesRes.ok || !sitesJson?.ok) throw new Error(sitesJson?.error || "sites_load_failed");
      setClients(clientsJson.data ?? []);
      const list = (sitesJson.data ?? []) as Site[];
      setSites(list);
      if (list.length > 0 && !selectedSiteId) setSelectedSiteId(list[0].id);
    } catch (e) {
      onError(e instanceof Error ? e.message : "사이트/거래처 정보를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onError, selectedSiteId]);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  const selectedSite = useMemo(() => sites.find((s) => s.id === selectedSiteId) ?? null, [sites, selectedSiteId]);
  const selectedClientName = useMemo(() => {
    if (!selectedSite) return "";
    return clients.find((c) => c.id === selectedSite.client_id)?.name ?? "";
  }, [clients, selectedSite]);

  useEffect(() => {
    if (!selectedSite) return;
    setEditLat(selectedSite.lat !== null ? String(selectedSite.lat) : "");
    setEditLng(selectedSite.lng !== null ? String(selectedSite.lng) : "");
    setEditRadius(selectedSite.geofence_radius_m !== null ? String(selectedSite.geofence_radius_m) : "");
  }, [selectedSite]);

  const loadRules = useCallback(
    async (siteId: string) => {
      if (!siteId) return;
      setRulesLoading(true);
      try {
        const res = await fetch(`/api/cleanidex/sites/${siteId}/schedule`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "rules_load_failed");
        setRules((json.data ?? []) as ScheduleRule[]);
      } catch (e) {
        onError(e instanceof Error ? e.message : "주간 룰을 불러오지 못했습니다.");
      } finally {
        setRulesLoading(false);
      }
    },
    [onError]
  );

  const loadOverrides = useCallback(
    async (siteId: string, weekStart: string) => {
      if (!siteId) return;
      setOverridesLoading(true);
      try {
        const res = await fetch(`/api/cleanidex/sites/${siteId}/overrides?week_start=${weekStart}`, { cache: "no-store" });
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "overrides_load_failed");
        setOverrides((json.data ?? []) as Override[]);
      } catch (e) {
        onError(e instanceof Error ? e.message : "오버라이드를 불러오지 못했습니다.");
      } finally {
        setOverridesLoading(false);
      }
    },
    [onError]
  );

  useEffect(() => {
    if (selectedSiteId) {
      loadRules(selectedSiteId);
      loadOverrides(selectedSiteId, overrideWeekStart);
    }
  }, [selectedSiteId, overrideWeekStart, loadRules, loadOverrides]);

  async function onSaveLocation(e: FormEvent) {
    e.preventDefault();
    if (!selectedSite) return;
    setSavingLocation(true);
    onError(null);
    try {
      const body: Record<string, number | null> = {};
      body.lat = editLat.trim() === "" ? null : Number(editLat);
      body.lng = editLng.trim() === "" ? null : Number(editLng);
      body.geofence_radius_m = editRadius.trim() === "" ? null : Number(editRadius);
      const res = await fetch(`/api/cleanidex/sites/${selectedSite.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "location_save_failed");
      setSites((prev) => prev.map((s) => (s.id === selectedSite.id ? (json.data as Site) : s)));
      onNotice("위치/지오펜스를 저장했습니다.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "위치를 저장하지 못했습니다.");
    } finally {
      setSavingLocation(false);
    }
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      onError("이 브라우저에서는 GPS를 사용할 수 없습니다.");
      return;
    }
    setResolvingGps(true);
    onError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setEditLat(pos.coords.latitude.toFixed(6));
        setEditLng(pos.coords.longitude.toFixed(6));
        setResolvingGps(false);
      },
      (err) => {
        onError(`GPS 실패: ${err.message}`);
        setResolvingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 0 }
    );
  }

  function toggleNewWeekday(code: number) {
    setNewWeekdays((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }

  async function onCreateRule(e: FormEvent) {
    e.preventDefault();
    if (!selectedSite) return;
    setSavingRule(true);
    onError(null);
    try {
      const body: Record<string, unknown> = {
        effective_from: newEffectiveFrom,
        cadence: newCadence,
        notes: newRuleNotes.trim() || undefined,
      };
      if (newCadence === "weekly_count") {
        const n = Number(newWeeklyCount);
        if (!Number.isFinite(n) || n < 1) throw new Error("weekly_count_invalid");
        body.weekly_count = Math.floor(n);
      } else {
        if (newWeekdays.length === 0) throw new Error("weekdays_required");
        body.weekdays = newWeekdays;
      }
      const res = await fetch(`/api/cleanidex/sites/${selectedSite.id}/schedule`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "rule_create_failed");
      onNotice("새 주간 룰을 추가했습니다.");
      await loadRules(selectedSite.id);
      setNewRuleNotes("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "룰을 추가하지 못했습니다.");
    } finally {
      setSavingRule(false);
    }
  }

  async function onCreateOverride(e: FormEvent) {
    e.preventDefault();
    if (!selectedSite) return;
    setSavingOverride(true);
    onError(null);
    try {
      const res = await fetch(`/api/cleanidex/sites/${selectedSite.id}/overrides`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: newOverrideKind,
          occur_date: newOverrideDate,
          notes: newOverrideNotes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "override_create_failed");
      onNotice("이번 주 변경사항을 추가했습니다.");
      const ws = getWeekStartIso(parseIsoDate(newOverrideDate));
      if (ws !== overrideWeekStart) setOverrideWeekStart(ws);
      else await loadOverrides(selectedSite.id, overrideWeekStart);
      setNewOverrideNotes("");
    } catch (e) {
      onError(e instanceof Error ? e.message : "변경사항을 추가하지 못했습니다.");
    } finally {
      setSavingOverride(false);
    }
  }

  async function onDeleteOverride(id: string) {
    if (!selectedSite) return;
    if (!confirm("이 변경사항을 삭제할까요?")) return;
    onError(null);
    try {
      const res = await fetch(`/api/cleanidex/sites/${selectedSite.id}/overrides?id=${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "override_delete_failed");
      await loadOverrides(selectedSite.id, overrideWeekStart);
    } catch (e) {
      onError(e instanceof Error ? e.message : "삭제하지 못했습니다.");
    }
  }

  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const dimBox = isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-xl border p-4 ${baseCard}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold">현장 운영 설정</h2>
          <p className={`mt-0.5 text-xs ${subText}`}>위치(GPS) · 주간 방문 룰 · 이번 주 변경사항</p>
        </div>
        <select
          value={selectedSiteId}
          onChange={(e) => setSelectedSiteId(e.target.value)}
          className={`rounded border px-3 py-2 text-sm ${baseInput}`}
          disabled={loading || sites.length === 0}
        >
          {sites.length === 0 ? <option value="">현장이 없습니다</option> : null}
          {sites.map((s) => {
            const cn = clients.find((c) => c.id === s.client_id)?.name ?? "";
            return (
              <option key={s.id} value={s.id}>
                {cn ? `${cn} · ` : ""}
                {s.name}
              </option>
            );
          })}
        </select>
      </div>

      {!selectedSite ? (
        <p className={`mt-3 text-sm ${subText}`}>현장을 선택하세요.</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {/* 위치 */}
          <form onSubmit={onSaveLocation} className={`rounded-lg border p-3 ${dimBox}`}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">위치 / 지오펜스</h3>
              <button
                type="button"
                onClick={useCurrentLocation}
                disabled={resolvingGps}
                className="rounded bg-emerald-600 px-2 py-1 text-xs text-white disabled:opacity-50"
              >
                {resolvingGps ? "측위 중…" : "현재 위치 가져오기"}
              </button>
            </div>
            <p className={`mt-1 text-xs ${subText}`}>
              {selectedClientName ? `${selectedClientName} · ` : ""}
              {selectedSite.name}
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <label className="text-xs">
                <span className={subText}>위도</span>
                <input
                  value={editLat}
                  onChange={(e) => setEditLat(e.target.value)}
                  inputMode="decimal"
                  placeholder="37.566535"
                  className={`mt-1 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
                />
              </label>
              <label className="text-xs">
                <span className={subText}>경도</span>
                <input
                  value={editLng}
                  onChange={(e) => setEditLng(e.target.value)}
                  inputMode="decimal"
                  placeholder="126.977969"
                  className={`mt-1 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
                />
              </label>
              <label className="col-span-2 text-xs">
                <span className={subText}>지오펜스 반경 (m, 기본 200)</span>
                <input
                  value={editRadius}
                  onChange={(e) => setEditRadius(e.target.value)}
                  inputMode="numeric"
                  placeholder="200"
                  className={`mt-1 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
                />
              </label>
            </div>
            <button
              type="submit"
              disabled={savingLocation}
              className="mt-2 rounded bg-indigo-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
            >
              {savingLocation ? "저장 중…" : "위치 저장"}
            </button>
          </form>

          {/* 주간 룰 */}
          <div className={`rounded-lg border p-3 ${dimBox}`}>
            <h3 className="text-sm font-semibold">주간 방문 룰</h3>
            <p className={`mt-1 text-xs ${subText}`}>요일 또는 횟수 기반. 변경 시 새 룰 추가 → 시작일 이후 적용.</p>

            <div className="mt-2 space-y-1">
              {rulesLoading ? (
                <p className={`text-xs ${subText}`}>불러오는 중…</p>
              ) : rules.length === 0 ? (
                <p className={`text-xs ${subText}`}>등록된 룰이 없습니다.</p>
              ) : (
                rules.slice(0, 5).map((r) => (
                  <div key={r.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>
                      <span className="font-semibold">{formatRule(r)}</span>
                      <span className={`ml-2 ${subText}`}>· {r.effective_from} 부터</span>
                    </span>
                    {r.notes ? <span className={`truncate ${subText}`}>{r.notes}</span> : null}
                  </div>
                ))
              )}
            </div>

            <form onSubmit={onCreateRule} className={`mt-3 rounded border p-2 ${isDark ? "border-slate-700" : "border-slate-300"}`}>
              <div className="flex flex-wrap gap-1">
                <button
                  type="button"
                  onClick={() => setNewCadence("weekday")}
                  className={`rounded px-2 py-1 text-xs ${newCadence === "weekday" ? "bg-indigo-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-200"}`}
                >
                  요일 지정
                </button>
                <button
                  type="button"
                  onClick={() => setNewCadence("weekly_count")}
                  className={`rounded px-2 py-1 text-xs ${newCadence === "weekly_count" ? "bg-indigo-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-200"}`}
                >
                  주 N회
                </button>
              </div>

              {newCadence === "weekday" ? (
                <div className="mt-2 flex flex-wrap gap-1">
                  {DAY_BUTTONS.map((d) => {
                    const active = newWeekdays.includes(d.code);
                    return (
                      <button
                        key={d.code}
                        type="button"
                        onClick={() => toggleNewWeekday(d.code)}
                        className={`rounded px-2 py-1 text-xs ${active ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-200"}`}
                      >
                        {d.label}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={newWeeklyCount}
                  onChange={(e) => setNewWeeklyCount(e.target.value)}
                  className={`mt-2 w-24 rounded border px-2 py-1 text-sm ${baseInput}`}
                />
              )}

              <label className="mt-2 block text-xs">
                <span className={subText}>적용 시작일</span>
                <input
                  type="date"
                  value={newEffectiveFrom}
                  onChange={(e) => setNewEffectiveFrom(e.target.value)}
                  className={`mt-1 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
                />
              </label>
              <input
                value={newRuleNotes}
                onChange={(e) => setNewRuleNotes(e.target.value)}
                placeholder="메모 (선택)"
                className={`mt-2 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
              />
              <button
                type="submit"
                disabled={savingRule}
                className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {savingRule ? "추가 중…" : "룰 추가"}
              </button>
            </form>
          </div>

          {/* 오버라이드 */}
          <div className={`rounded-lg border p-3 ${dimBox}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-semibold">이번 주 변경</h3>
              <input
                type="date"
                value={overrideWeekStart}
                onChange={(e) => setOverrideWeekStart(getWeekStartIso(parseIsoDate(e.target.value)))}
                className={`rounded border px-2 py-1 text-xs ${baseInput}`}
              />
            </div>
            <p className={`mt-1 text-xs ${subText}`}>주 시작 (월): {overrideWeekStart}</p>

            <div className="mt-2 space-y-1">
              {overridesLoading ? (
                <p className={`text-xs ${subText}`}>불러오는 중…</p>
              ) : overrides.length === 0 ? (
                <p className={`text-xs ${subText}`}>변경사항 없음</p>
              ) : (
                overrides.map((o) => (
                  <div key={o.id} className="flex items-center justify-between gap-2 text-xs">
                    <span>
                      <span
                        className={`mr-1 inline-flex rounded px-1.5 py-0.5 text-[10px] ${
                          o.kind === "skip"
                            ? isDark
                              ? "bg-rose-900 text-rose-200"
                              : "bg-rose-100 text-rose-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {o.kind === "skip" ? "스킵" : "추가"}
                      </span>
                      {o.occur_date}
                      {o.notes ? <span className={`ml-1 ${subText}`}>· {o.notes}</span> : null}
                    </span>
                    <button
                      type="button"
                      onClick={() => onDeleteOverride(o.id)}
                      className={`rounded px-1.5 py-0.5 text-[10px] ${isDark ? "bg-slate-700 text-slate-200" : "bg-slate-200 text-slate-700"}`}
                    >
                      삭제
                    </button>
                  </div>
                ))
              )}
            </div>

            <form onSubmit={onCreateOverride} className={`mt-3 rounded border p-2 ${isDark ? "border-slate-700" : "border-slate-300"}`}>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setNewOverrideKind("skip")}
                  className={`rounded px-2 py-1 text-xs ${newOverrideKind === "skip" ? "bg-rose-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-200"}`}
                >
                  이 날 스킵
                </button>
                <button
                  type="button"
                  onClick={() => setNewOverrideKind("add")}
                  className={`rounded px-2 py-1 text-xs ${newOverrideKind === "add" ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-200"}`}
                >
                  이 날 추가
                </button>
              </div>
              <input
                type="date"
                value={newOverrideDate}
                onChange={(e) => setNewOverrideDate(e.target.value)}
                className={`mt-2 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
              />
              <input
                value={newOverrideNotes}
                onChange={(e) => setNewOverrideNotes(e.target.value)}
                placeholder="메모 (선택)"
                className={`mt-2 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
              />
              <button
                type="submit"
                disabled={savingOverride}
                className="mt-2 rounded bg-slate-900 px-3 py-1.5 text-sm text-white disabled:opacity-50"
              >
                {savingOverride ? "추가 중…" : "변경 추가"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
