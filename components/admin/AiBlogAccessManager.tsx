"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import { apiJson } from "@/lib/ai-blog/messages";
import type { AccessLog, AdminAccessRow, AdminPlan } from "@/lib/ai-blog/admin-access";

const STATE_BADGE: Record<string, { label: string; cls: string }> = {
  active: { label: "사용 중", cls: "bg-emerald-100 text-emerald-800" },
  expired: { label: "만료", cls: "bg-slate-100 text-slate-700" },
  suspended: { label: "정지", cls: "bg-red-100 text-red-800" },
  none: { label: "권한 없음", cls: "bg-slate-100 text-slate-500" },
};

const ACTION_LABEL: Record<string, string> = {
  grant: "권한 부여",
  extend: "기간 연장",
  set_expiry: "만료일 지정",
  change_plan: "요금제 변경",
  suspend: "정지",
  resume: "정지 해제",
};

const MONTH_OPTIONS = [1, 3, 6, 12];

const inputCls = "rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-slate-500 focus:outline-none";
const btnDark = "rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50";
const btnLight = "rounded-lg bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200 disabled:opacity-50";

type PeriodForm = {
  mode: "months" | "date";
  months: number;
  expires_on: string;
  plan_code: string;
  amount: string;
  payer_name: string;
  memo: string;
};

function emptyForm(planCode: string): PeriodForm {
  return { mode: "months", months: 1, expires_on: "", plan_code: planCode, amount: "", payer_name: "", memo: "" };
}

function formatWon(v: string) {
  return v ? Number(v).toLocaleString("ko-KR") : "";
}

function PeriodFields({
  form,
  setForm,
  plans,
  showPlan,
}: {
  form: PeriodForm;
  setForm: (f: PeriodForm) => void;
  plans: AdminPlan[];
  showPlan: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {showPlan ? (
        <select
          className={inputCls}
          value={form.plan_code}
          onChange={(e) => setForm({ ...form, plan_code: e.target.value })}
        >
          {plans.map((p) => (
            <option key={p.code} value={p.code}>
              {p.name} (월 {p.monthly_content_limit}편)
            </option>
          ))}
        </select>
      ) : null}
      {MONTH_OPTIONS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setForm({ ...form, mode: "months", months: m })}
          className={`rounded-lg px-3 py-1.5 text-sm ${
            form.mode === "months" && form.months === m ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          {m}개월
        </button>
      ))}
      <button
        type="button"
        onClick={() => setForm({ ...form, mode: "date" })}
        className={`rounded-lg px-3 py-1.5 text-sm ${
          form.mode === "date" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
        }`}
      >
        만료일 직접
      </button>
      {form.mode === "date" ? (
        <input
          type="date"
          className={inputCls}
          value={form.expires_on}
          onChange={(e) => setForm({ ...form, expires_on: e.target.value })}
        />
      ) : null}
      <div className="relative">
        <input
          className={`${inputCls} w-32 pr-7 text-right`}
          inputMode="numeric"
          placeholder="입금액"
          value={formatWon(form.amount)}
          onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "").slice(0, 9) })}
        />
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-500">원</span>
      </div>
      <input
        className={`${inputCls} w-28`}
        placeholder="입금자명"
        value={form.payer_name}
        onChange={(e) => setForm({ ...form, payer_name: e.target.value })}
      />
      <input
        className={`${inputCls} min-w-40 flex-1`}
        placeholder="메모 (선택)"
        value={form.memo}
        onChange={(e) => setForm({ ...form, memo: e.target.value })}
      />
    </div>
  );
}

function periodPayload(form: PeriodForm) {
  return {
    ...(form.mode === "months"
      ? { action: "extend", months: form.months }
      : { action: "set_expiry", expires_on: form.expires_on }),
    plan_code: form.plan_code,
    amount_krw: form.amount ? Number(form.amount) : null,
    payer_name: form.payer_name,
    memo: form.memo,
  };
}

export default function AiBlogAccessManager({ rows, plans }: { rows: AdminAccessRow[]; plans: AdminPlan[] }) {
  const router = useRouter();
  const defaultPlan = plans[0]?.code ?? "";
  const [email, setEmail] = useState("");
  const [grant, setGrant] = useState<PeriodForm>(emptyForm(defaultPlan));
  const [editing, setEditing] = useState<string | null>(null);
  const [edit, setEdit] = useState<PeriodForm>(emptyForm(defaultPlan));
  const [logsFor, setLogsFor] = useState<string | null>(null);
  const [logs, setLogs] = useState<AccessLog[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const run = async (payload: Record<string, unknown>, done: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await apiJson("/api/admin/ai-blog/access", { method: "POST", body: JSON.stringify(payload) });
      setMessage({ tone: "ok", text: done });
      router.refresh();
      return true;
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submitGrant = async () => {
    if (!email.trim()) return setMessage({ tone: "error", text: "회원 이메일을 입력해 주세요." });
    if (grant.mode === "date" && !grant.expires_on) return setMessage({ tone: "error", text: "만료일을 선택해 주세요." });
    const ok = await run({ email: email.trim(), ...periodPayload(grant) }, `${email.trim()} 권한을 저장했습니다.`);
    if (ok) {
      setEmail("");
      setGrant(emptyForm(defaultPlan));
    }
  };

  const openEdit = (r: AdminAccessRow) => {
    setEditing(editing === r.user_id ? null : r.user_id);
    setEdit(emptyForm(r.plan_code));
    setLogsFor(null);
  };

  const submitEdit = async (r: AdminAccessRow) => {
    if (edit.mode === "date" && !edit.expires_on) return setMessage({ tone: "error", text: "만료일을 선택해 주세요." });
    const ok = await run({ user_id: r.user_id, ...periodPayload(edit) }, `${r.email ?? "회원"} 기간을 변경했습니다.`);
    if (ok) setEditing(null);
  };

  const toggleSuspend = (r: AdminAccessRow) => {
    const suspend = r.state !== "suspended";
    if (suspend && !window.confirm(`${r.email ?? "이 회원"}의 AI 블로그 사용을 정지할까요?`)) return;
    void run(
      { user_id: r.user_id, action: suspend ? "suspend" : "resume" },
      suspend ? "사용을 정지했습니다." : "정지를 해제했습니다.",
    );
  };

  const toggleLogs = async (r: AdminAccessRow) => {
    if (logsFor === r.user_id) return setLogsFor(null);
    setEditing(null);
    setLogsFor(r.user_id);
    setLogs([]);
    try {
      setLogs(await apiJson<AccessLog[]>(`/api/admin/ai-blog/access?user_id=${r.user_id}`));
    } catch (e) {
      setMessage({ tone: "error", text: (e as Error).message });
    }
  };

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">권한 부여 · 기간 연장</h2>
        <p className="text-xs text-slate-500">
          이미 권한이 있으면 남은 기간 뒤에 붙여 연장하고, 만료됐거나 처음이면 오늘부터 계산합니다.
        </p>
        <input
          className={`${inputCls} w-full max-w-sm`}
          type="email"
          placeholder="회원 이메일"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <PeriodFields form={grant} setForm={setGrant} plans={plans} showPlan />
        <div>
          <button type="button" className={btnDark} disabled={busy} onClick={submitGrant}>
            저장
          </button>
        </div>
      </section>

      {message ? (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            message.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="px-4 py-3 font-semibold text-slate-700">이메일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">업체</th>
              <th className="px-4 py-3 font-semibold text-slate-700">요금제</th>
              <th className="px-4 py-3 font-semibold text-slate-700">상태</th>
              <th className="px-4 py-3 font-semibold text-slate-700">만료일</th>
              <th className="px-4 py-3 font-semibold text-slate-700">이번 달 작성</th>
              <th className="px-4 py-3 font-semibold text-slate-700">AI 비용(추정)</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  조건에 맞는 회원이 없습니다.
                </td>
              </tr>
            ) : (
              rows.map((r) => {
                const badge = STATE_BADGE[r.state];
                return (
                  <Fragment key={r.user_id}>
                    <tr className="border-b border-slate-100">
                      <td className="max-w-[220px] truncate px-4 py-2.5 text-slate-800" title={r.email ?? undefined}>
                        {r.email ?? "—"}
                        {r.memo ? <p className="truncate text-xs text-slate-400">{r.memo}</p> : null}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{r.company_name ?? "프로필 미등록"}</td>
                      <td className="px-4 py-2.5">
                        <select
                          className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-xs"
                          value={r.plan_code}
                          disabled={busy}
                          onChange={(e) =>
                            void run(
                              { user_id: r.user_id, action: "change_plan", plan_code: e.target.value },
                              "요금제를 변경했습니다.",
                            )
                          }
                        >
                          {plans.map((p) => (
                            <option key={p.code} value={p.code}>
                              {p.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">
                        {r.expires_on}
                        {r.days_left != null && r.state === "active" ? (
                          <span className={`ml-1 text-xs ${r.days_left <= 7 ? "font-medium text-amber-600" : "text-slate-400"}`}>
                            ({r.days_left === 0 ? "오늘까지" : `${r.days_left}일 남음`})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">
                        {r.contents_used}/{r.monthly_limit}편
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{Math.round(r.cost_krw).toLocaleString("ko-KR")}원</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <button type="button" className={btnLight} onClick={() => openEdit(r)}>
                            연장
                          </button>
                          <button type="button" className={btnLight} disabled={busy} onClick={() => toggleSuspend(r)}>
                            {r.state === "suspended" ? "해제" : "정지"}
                          </button>
                          <button type="button" className={btnLight} onClick={() => void toggleLogs(r)}>
                            기록
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editing === r.user_id ? (
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td colSpan={8} className="space-y-2 px-4 py-3">
                          <PeriodFields form={edit} setForm={setEdit} plans={plans} showPlan={false} />
                          <div className="flex gap-2">
                            <button type="button" className={btnDark} disabled={busy} onClick={() => void submitEdit(r)}>
                              저장
                            </button>
                            <button type="button" className={btnLight} onClick={() => setEditing(null)}>
                              취소
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : null}
                    {logsFor === r.user_id ? (
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <td colSpan={8} className="px-4 py-3">
                          {logs.length ? (
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-slate-500">
                                  <th className="py-1 pr-3 text-left font-medium">일시</th>
                                  <th className="py-1 pr-3 text-left font-medium">처리</th>
                                  <th className="py-1 pr-3 text-left font-medium">만료일</th>
                                  <th className="py-1 pr-3 text-left font-medium">입금</th>
                                  <th className="py-1 pr-3 text-left font-medium">메모</th>
                                  <th className="py-1 text-left font-medium">처리자</th>
                                </tr>
                              </thead>
                              <tbody>
                                {logs.map((l) => (
                                  <tr key={l.id} className="text-slate-700">
                                    <td className="py-1 pr-3">{new Date(l.created_at).toLocaleString("ko-KR")}</td>
                                    <td className="py-1 pr-3">
                                      {ACTION_LABEL[l.action] ?? l.action}
                                      {l.plan_code ? ` · ${l.plan_code}` : ""}
                                    </td>
                                    <td className="py-1 pr-3">
                                      {l.prev_expires_on ?? "—"} → {l.new_expires_on ?? "—"}
                                    </td>
                                    <td className="py-1 pr-3">
                                      {l.amount_krw != null ? `${l.amount_krw.toLocaleString("ko-KR")}원` : "—"}
                                      {l.payer_name ? ` (${l.payer_name})` : ""}
                                    </td>
                                    <td className="py-1 pr-3">{l.memo ?? ""}</td>
                                    <td className="py-1">{l.actor_email ?? "—"}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <p className="text-xs text-slate-500">기록을 불러오는 중이거나 기록이 없습니다.</p>
                          )}
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
