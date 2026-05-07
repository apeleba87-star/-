"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Site = { id: string; name: string; client_id: string; lat: number | null; lng: number | null; geofence_radius_m: number | null };
type Client = { id: string; name: string };

type AttendanceEvent = {
  id: string;
  user_id: string;
  site_id: string | null;
  work_session_id: string | null;
  kind: "check_in" | "check_out";
  occurred_at: string;
  geofence_status: "inside" | "outside" | "unknown";
  distance_m: number | null;
  notes: string | null;
  site: { id: string; name: string } | null;
};

type StaleRequirement = {
  id: string;
  client_id: string;
  client_name: string | null;
  content: string;
  agreed_at: string;
  age_days: number | null;
  is_stale: boolean;
};

type Props = {
  isDark: boolean;
  baseCard: string;
  baseInput: string;
  onError: (msg: string | null) => void;
  onNotice: (msg: string | null) => void;
};

function todayIsoLocal(): string {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (!Number.isFinite(d.valueOf())) return iso;
  return d.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
}

function flattenSite(raw: unknown): { id: string; name: string } | null {
  if (Array.isArray(raw)) {
    const first = raw[0] as { id?: string; name?: string } | undefined;
    if (first?.id && first.name) return { id: first.id, name: first.name };
    return null;
  }
  if (raw && typeof raw === "object") {
    const obj = raw as { id?: string; name?: string };
    if (obj.id && obj.name) return { id: obj.id, name: obj.name };
  }
  return null;
}

export default function TodayOperationsView({ isDark, baseCard, baseInput, onError, onNotice }: Props) {
  const [sites, setSites] = useState<Site[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [events, setEvents] = useState<AttendanceEvent[]>([]);
  const [stale, setStale] = useState<StaleRequirement[]>([]);
  const [staleThreshold, setStaleThreshold] = useState(30);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"check_in" | "check_out" | null>(null);

  const [chosenSiteId, setChosenSiteId] = useState<"auto" | string>("auto");
  const [lastResult, setLastResult] = useState<{
    kind: "check_in" | "check_out";
    site_name?: string;
    geofence_status?: "inside" | "outside" | "unknown";
    distance_m?: number | null;
    occurred_at: string;
  } | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const today = todayIsoLocal();
      const [sitesRes, clientsRes, evRes, stRes] = await Promise.all([
        fetch("/api/cleanidex/sites", { cache: "no-store" }),
        fetch("/api/cleanidex/clients", { cache: "no-store" }),
        fetch(`/api/cleanidex/attendance?date=${today}&limit=200`, { cache: "no-store" }),
        fetch("/api/cleanidex/client-requirements?stale=1", { cache: "no-store" }),
      ]);
      const sitesJson = await sitesRes.json();
      const clientsJson = await clientsRes.json();
      const evJson = await evRes.json();
      const stJson = await stRes.json();
      if (!sitesRes.ok || !sitesJson?.ok) throw new Error(sitesJson?.error || "sites_load_failed");
      if (!clientsRes.ok || !clientsJson?.ok) throw new Error(clientsJson?.error || "clients_load_failed");
      if (!evRes.ok || !evJson?.ok) throw new Error(evJson?.error || "attendance_load_failed");
      if (!stRes.ok || !stJson?.ok) throw new Error(stJson?.error || "stale_load_failed");
      setSites((sitesJson.data ?? []) as Site[]);
      setClients((clientsJson.data ?? []) as Client[]);
      const rawEvents = (evJson.data ?? []) as Array<Omit<AttendanceEvent, "site"> & { site: unknown }>;
      setEvents(rawEvents.map((e) => ({ ...e, site: flattenSite(e.site) })));
      setStale((stJson.data ?? []) as StaleRequirement[]);
      if (typeof stJson.stale_threshold_days === "number") setStaleThreshold(stJson.stale_threshold_days);
    } catch (e) {
      onError(e instanceof Error ? e.message : "오늘 데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function getCoords(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) {
        reject(new Error("이 브라우저에서는 GPS를 사용할 수 없습니다."));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10_000,
        maximumAge: 0,
      });
    });
  }

  async function onCheckIn() {
    setBusy("check_in");
    onError(null);
    try {
      const pos = await getCoords();
      const body: Record<string, unknown> = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
      };
      if (chosenSiteId !== "auto") body.site_id = chosenSiteId;
      const res = await fetch("/api/cleanidex/attendance/check-in", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const code = json?.error || "check_in_failed";
        const retrySec = typeof json?.retry_after_sec === "number" ? json.retry_after_sec : 60;
        const friendly =
          code === "no_nearby_site"
            ? "근처에 등록된 현장이 없습니다. 위에서 현장을 직접 선택해 다시 시도하세요."
            : code === "already_checked_in"
              ? "이미 진행 중인 작업 세션이 있습니다. 먼저 체크아웃하세요."
              : code === "rate_limit_exceeded"
                ? `체크인 시도가 너무 잦습니다. 약 ${retrySec}초 후 다시 시도해 주세요.`
                : code === "accuracy_m_invalid"
                  ? "위치 정확도 값이 비정상입니다. 브라우저를 다시 열거나 잠시 후 시도해 주세요."
                  : code;
        throw new Error(friendly);
      }
      setLastResult({
        kind: "check_in",
        site_name: json.data?.site?.name,
        geofence_status: json.data?.geofence_status,
        distance_m: json.data?.distance_m,
        occurred_at: json.data?.occurred_at,
      });
      onNotice("체크인 완료 — 작업 세션이 시작되었습니다.");
      await loadAll();
    } catch (e) {
      onError(e instanceof Error ? e.message : "체크인에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  async function onCheckOut() {
    setBusy("check_out");
    onError(null);
    try {
      const pos = await getCoords();
      const res = await fetch("/api/cleanidex/attendance/check-out", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy_m: pos.coords.accuracy,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) {
        const code = json?.error || "check_out_failed";
        const retrySec = typeof json?.retry_after_sec === "number" ? json.retry_after_sec : 60;
        const friendly =
          code === "no_open_session"
            ? "진행 중인 작업 세션이 없습니다."
            : code === "rate_limit_exceeded"
              ? `체크아웃 시도가 너무 잦습니다. 약 ${retrySec}초 후 다시 시도해 주세요.`
              : code === "accuracy_m_invalid"
                ? "위치 정확도 값이 비정상입니다. 잠시 후 다시 시도해 주세요."
                : code;
        throw new Error(friendly);
      }
      setLastResult({
        kind: "check_out",
        geofence_status: json.data?.geofence_status,
        distance_m: json.data?.distance_m,
        occurred_at: json.data?.occurred_at,
      });
      onNotice(
        json.data?.session_completed_at
          ? "체크아웃 완료 — 모든 필수 사진이 갖춰져 작업이 자동 완료되었습니다."
          : "체크아웃 완료 — 누락된 필수 사진이 있어 자동 완료는 보류 중입니다."
      );
      await loadAll();
    } catch (e) {
      onError(e instanceof Error ? e.message : "체크아웃에 실패했습니다.");
    } finally {
      setBusy(null);
    }
  }

  const hasOpenSession = useMemo(() => {
    // 본인의 가장 최근 이벤트가 check_in 이고 그 후 check_out 이 없으면 open.
    // 정확한 본인 user_id 가 없어도, 같은 work_session_id 의 in/out 짝으로 판단.
    const sessionMap = new Map<string, { in: AttendanceEvent | null; out: AttendanceEvent | null }>();
    for (const e of events) {
      if (!e.work_session_id) continue;
      const slot = sessionMap.get(e.work_session_id) ?? { in: null, out: null };
      if (e.kind === "check_in") slot.in = e;
      else slot.out = e;
      sessionMap.set(e.work_session_id, slot);
    }
    return Array.from(sessionMap.values()).some((s) => s.in && !s.out);
  }, [events]);

  const today = todayIsoLocal();
  const subText = isDark ? "text-slate-400" : "text-slate-500";
  const dimBox = isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50";

  return (
    <div className="space-y-4">
      {/* 체크인 카드 */}
      <div className={`rounded-xl border p-4 ${baseCard}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="font-semibold">오늘 운영 — {today}</h2>
            <p className={`mt-0.5 text-xs ${subText}`}>
              GPS 체크인 = 작업 세션 시작 · 체크아웃 = 종료. 지오펜스 밖이어도 기록만 남깁니다.
            </p>
          </div>
          <button
            type="button"
            onClick={loadAll}
            className={`rounded px-2 py-1 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
          >
            새로고침
          </button>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className={`rounded-lg border p-3 ${dimBox}`}>
            <h3 className="text-sm font-semibold">출근 (체크인)</h3>
            <label className="mt-2 block text-xs">
              <span className={subText}>현장 선택</span>
              <select
                value={chosenSiteId}
                onChange={(e) => setChosenSiteId(e.target.value as "auto" | string)}
                className={`mt-1 w-full rounded border px-2 py-1.5 text-sm ${baseInput}`}
              >
                <option value="auto">자동 감지 (가장 가까운 현장)</option>
                {sites.map((s) => {
                  const cn = clients.find((c) => c.id === s.client_id)?.name ?? "";
                  return (
                    <option key={s.id} value={s.id}>
                      {cn ? `${cn} · ` : ""}
                      {s.name}
                      {s.lat === null ? " (위치 미설정)" : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <button
              type="button"
              onClick={onCheckIn}
              disabled={busy !== null || hasOpenSession}
              className="mt-3 w-full rounded bg-emerald-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "check_in" ? "측위 중…" : hasOpenSession ? "이미 진행 중인 세션 있음" : "현재 위치로 체크인"}
            </button>
          </div>

          <div className={`rounded-lg border p-3 ${dimBox}`}>
            <h3 className="text-sm font-semibold">퇴근 (체크아웃)</h3>
            <p className={`mt-1 text-xs ${subText}`}>
              체크아웃 시 필수 사진이 모두 있으면 작업이 자동 완료됩니다.
            </p>
            <button
              type="button"
              onClick={onCheckOut}
              disabled={busy !== null || !hasOpenSession}
              className="mt-3 w-full rounded bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {busy === "check_out" ? "측위 중…" : "현재 위치로 체크아웃"}
            </button>
            {!hasOpenSession ? (
              <p className={`mt-2 text-xs ${subText}`}>진행 중인 세션이 없습니다.</p>
            ) : null}
          </div>
        </div>

        {lastResult ? (
          <div
            className={`mt-3 rounded border p-2 text-xs ${
              lastResult.geofence_status === "outside"
                ? isDark
                  ? "border-amber-800 bg-amber-950/40 text-amber-200"
                  : "border-amber-300 bg-amber-50 text-amber-800"
                : isDark
                  ? "border-slate-700 bg-slate-800/40"
                  : "border-slate-200 bg-slate-50"
            }`}
          >
            <span className="font-semibold">{lastResult.kind === "check_in" ? "체크인" : "체크아웃"}</span> ·{" "}
            {formatTime(lastResult.occurred_at)}
            {lastResult.site_name ? ` · ${lastResult.site_name}` : ""}
            {lastResult.geofence_status
              ? ` · 지오펜스 ${
                  lastResult.geofence_status === "inside"
                    ? "안"
                    : lastResult.geofence_status === "outside"
                      ? `밖 (${lastResult.distance_m}m)`
                      : "정보 없음"
                }`
              : ""}
          </div>
        ) : null}
      </div>

      {/* 오늘 출근 이벤트 목록 */}
      <div className={`rounded-xl border p-4 ${baseCard}`}>
        <h3 className="font-semibold">오늘 출근 이벤트</h3>
        {loading ? (
          <p className={`mt-2 text-sm ${subText}`}>불러오는 중…</p>
        ) : events.length === 0 ? (
          <p className={`mt-2 text-sm ${subText}`}>아직 출근 기록이 없습니다.</p>
        ) : (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className={`text-xs ${subText}`}>
                <tr className="text-left">
                  <th className="py-1 pr-2">시각</th>
                  <th className="py-1 pr-2">현장</th>
                  <th className="py-1 pr-2">유형</th>
                  <th className="py-1 pr-2">지오펜스</th>
                  <th className="py-1 pr-2">거리</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className={`border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                    <td className="py-1 pr-2">{formatTime(e.occurred_at)}</td>
                    <td className="py-1 pr-2">{e.site?.name ?? "-"}</td>
                    <td className="py-1 pr-2">{e.kind === "check_in" ? "체크인" : "체크아웃"}</td>
                    <td className="py-1 pr-2">
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] ${
                          e.geofence_status === "outside"
                            ? isDark
                              ? "bg-amber-900 text-amber-200"
                              : "bg-amber-100 text-amber-700"
                            : e.geofence_status === "inside"
                              ? "bg-emerald-100 text-emerald-700"
                              : isDark
                                ? "bg-slate-700 text-slate-200"
                                : "bg-slate-200 text-slate-700"
                        }`}
                      >
                        {e.geofence_status === "inside" ? "안" : e.geofence_status === "outside" ? "밖" : "?"}
                      </span>
                    </td>
                    <td className="py-1 pr-2">{e.distance_m !== null ? `${e.distance_m}m` : "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stale 요구사항 알림 */}
      <div className={`rounded-xl border p-4 ${baseCard}`}>
        <h3 className="font-semibold">오래된 거래처 요구사항</h3>
        <p className={`mt-1 text-xs ${subText}`}>{staleThreshold}일 초과 — 재협의를 검토하세요.</p>
        {stale.length === 0 ? (
          <p className={`mt-2 text-sm ${subText}`}>오래된 요구사항이 없습니다.</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {stale.slice(0, 10).map((s) => (
              <li
                key={s.id}
                className={`flex items-center justify-between gap-2 rounded border p-2 text-xs ${dimBox}`}
              >
                <span>
                  <span className="font-semibold">{s.client_name ?? s.client_id.slice(0, 8)}</span>
                  <span className={`ml-2 ${subText}`}>· 협의 후 {s.age_days ?? "-"}일</span>
                </span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${isDark ? "bg-amber-900 text-amber-200" : "bg-amber-100 text-amber-700"}`}>
                  stale
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
