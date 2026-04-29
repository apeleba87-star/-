"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type VerifyResult = {
  work_session_id: string;
  confirmed: boolean;
  token_expires_at: string | null;
  checklist?: Array<{
    checklist_item_id: string;
    checklist_item_title: string;
    selected_option_id: string;
    selected_option_label: string;
  }>;
  photos?: Array<{
    file_id: string;
    zone_id: string | null;
    zone_name: string | null;
    signed_url: string | null;
  }>;
};

export default function CleanidexConfirmPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [data, setData] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const saved = typeof window !== "undefined" ? window.localStorage.getItem("cleanidex_theme") : null;
    setIsDark(saved === "dark");
  }, []);

  useEffect(() => {
    if (!token) {
      setError("유효하지 않은 링크입니다.");
      return;
    }
    fetch(`/api/cleanidex/client-confirmations/verify?token=${encodeURIComponent(token)}`)
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!ok) {
          setError(json.error ?? "확인 링크 조회에 실패했습니다.");
          return;
        }
        setData(json.data);
      })
      .catch(() => setError("네트워크 오류가 발생했습니다."));
  }, [token]);

  async function onConfirm() {
    if (!token || submitting) return;
    setSubmitting(true);
    setDone(true);

    const res = await fetch(`/api/cleanidex/client-confirmations/verify?token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error ?? "확인 처리에 실패했습니다. 다시 시도해주세요.");
      setDone(false);
      setSubmitting(false);
      return;
    }
    setData((prev) =>
      prev
        ? {
            ...prev,
            confirmed: true,
          }
        : prev,
    );
    setSubmitting(false);
  }

  return (
    <div className={`min-h-screen ${isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"}`}>
      <div className="page-shell py-10">
        <div className={`mx-auto max-w-md rounded-xl border p-6 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}>
          <h1 className="text-xl font-bold">고객 확인</h1>
          <p className={`mt-2 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>작업 완료 내용을 확인했다면 아래 버튼을 눌러주세요.</p>

          {error ? <p className="mt-3 text-sm font-medium text-rose-700">{error}</p> : null}

          {data ? (
            <div className={`mt-4 rounded-lg p-3 text-sm ${isDark ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-700"}`}>
              <p>작업기록 ID: {data.work_session_id.slice(0, 8)}</p>
              <p>상태: {data.confirmed || done ? "확인됨" : "미확인"}</p>
            </div>
          ) : null}

          {data?.photos?.length ? (
            <div className="mt-4">
              <h2 className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>작업 사진</h2>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {data.photos.map((photo) => (
                  <div key={photo.file_id} className={`rounded-lg border p-2 ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-white"}`}>
                    {photo.signed_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photo.signed_url} alt={photo.zone_name ?? "작업 사진"} className="h-24 w-full rounded object-cover" />
                    ) : (
                      <div className="h-24 rounded bg-slate-200" />
                    )}
                    <p className="mt-1 text-xs">{photo.zone_name ?? "구역 미지정"}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {data?.checklist?.length ? (
            <div className="mt-4">
              <h2 className={`text-sm font-semibold ${isDark ? "text-slate-100" : "text-slate-800"}`}>체크리스트</h2>
              <div className="mt-2 space-y-1">
                {data.checklist.map((item) => (
                  <div
                    key={item.checklist_item_id}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${isDark ? "bg-slate-800 text-slate-200" : "bg-slate-50 text-slate-700"}`}
                  >
                    <span>{item.checklist_item_title}</span>
                    <span className="font-semibold">{item.selected_option_label}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <button
            type="button"
            onClick={onConfirm}
            disabled={!data || data.confirmed || done || submitting}
            className="mt-4 w-full rounded-lg bg-emerald-600 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300"
          >
            {data?.confirmed || done ? "확인되었습니다" : submitting ? "처리 중..." : "확인하기"}
          </button>
        </div>
      </div>
    </div>
  );
}
