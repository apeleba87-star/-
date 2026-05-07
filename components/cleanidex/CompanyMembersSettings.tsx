"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Company = {
  id: string;
  name: string;
  display_name: string | null;
  business_number: string | null;
  phone: string | null;
  address: string | null;
  logo_path: string | null;
};

type Member = {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  role_code: string | null;
  role_name: string | null;
  is_active: boolean;
  invited_at: string | null;
  created_at: string;
  is_self: boolean;
};

const ROLE_OPTIONS: { code: "admin" | "field" | "viewer"; label: string; hint: string }[] = [
  { code: "admin", label: "관리자", hint: "설정 변경·계약·직원 관리" },
  { code: "field", label: "현장 작업자", hint: "출근·작업·사진·체크리스트" },
  { code: "viewer", label: "뷰어", hint: "읽기 전용" },
];

function roleLabel(code: string | null): string {
  return ROLE_OPTIONS.find((r) => r.code === code)?.label ?? code ?? "-";
}

type Props = {
  isDark: boolean;
  baseCard: string;
  baseInput: string;
  onError: (msg: string | null) => void;
  onNotice: (msg: string | null) => void;
};

export default function CompanyMembersSettings({ isDark, baseCard, baseInput, onError, onNotice }: Props) {
  const [company, setCompany] = useState<Company | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [membersLoading, setMembersLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessNumber, setBusinessNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const loadCompany = useCallback(async () => {
    setCompanyLoading(true);
    try {
      const res = await fetch("/api/cleanidex/company", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "company_load_failed");
      const c = json.data as Company;
      setCompany(c);
      setIsAdmin(Boolean(json.is_admin));
      setName(c.name ?? "");
      setDisplayName(c.display_name ?? "");
      setBusinessNumber(c.business_number ?? "");
      setPhone(c.phone ?? "");
      setAddress(c.address ?? "");
    } catch (e) {
      onError(e instanceof Error ? e.message : "회사 정보를 불러오지 못했습니다.");
    } finally {
      setCompanyLoading(false);
    }
  }, [onError]);

  const loadMembers = useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await fetch("/api/cleanidex/members", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "members_load_failed");
      setMembers((json.data ?? []) as Member[]);
    } catch (e) {
      onError(e instanceof Error ? e.message : "직원 목록을 불러오지 못했습니다.");
    } finally {
      setMembersLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    loadCompany();
    loadMembers();
  }, [loadCompany, loadMembers]);

  const dirty = useMemo(() => {
    if (!company) return false;
    return (
      name.trim() !== (company.name ?? "") ||
      (displayName.trim() || null) !== (company.display_name ?? null) ||
      (businessNumber.trim() || null) !== (company.business_number ?? null) ||
      (phone.trim() || null) !== (company.phone ?? null) ||
      (address.trim() || null) !== (company.address ?? null)
    );
  }, [company, name, displayName, businessNumber, phone, address]);

  async function onSaveCompany(e: FormEvent) {
    e.preventDefault();
    if (!isAdmin || !company) return;
    if (!name.trim()) {
      onError("회사명을 입력해주세요.");
      return;
    }
    setSavingCompany(true);
    onError(null);
    try {
      const res = await fetch("/api/cleanidex/company", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          display_name: displayName.trim() || null,
          business_number: businessNumber.trim() || null,
          phone: phone.trim() || null,
          address: address.trim() || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "company_update_failed");
      setCompany(json.data as Company);
      onNotice("회사 정보를 저장했습니다.");
    } catch (e) {
      onError(e instanceof Error ? e.message : "회사 정보를 저장하지 못했습니다.");
    } finally {
      setSavingCompany(false);
    }
  }

  async function patchMember(userId: string, patch: { role_code?: string; is_active?: boolean }) {
    setSavingMemberId(userId);
    onError(null);
    try {
      const res = await fetch(`/api/cleanidex/members/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "member_update_failed");
      onNotice("직원 정보를 저장했습니다.");
      await loadMembers();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "직원 정보를 저장하지 못했습니다.";
      const friendly =
        msg === "self_demote_blocked"
          ? "본인 권한은 admin 이외로 변경할 수 없습니다."
          : msg === "self_deactivate_blocked"
            ? "본인 계정은 비활성화할 수 없습니다."
            : msg === "last_admin_blocked"
              ? "회사에 최소 1명의 관리자가 필요합니다."
              : msg;
      onError(friendly);
    } finally {
      setSavingMemberId(null);
    }
  }

  const subText = isDark ? "text-slate-400" : "text-slate-500";

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* 회사 정보 카드 */}
      <form onSubmit={onSaveCompany} className={`rounded-xl border p-4 ${baseCard} md:col-span-2`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold">회사 정보</h2>
          {!isAdmin ? <span className={`text-xs ${subText}`}>읽기 전용 (admin 만 수정 가능)</span> : null}
        </div>
        {companyLoading ? (
          <p className={`mt-2 text-sm ${subText}`}>불러오는 중…</p>
        ) : (
          <>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <label className="text-xs">
                <span className={subText}>회사명 *</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isAdmin}
                  maxLength={200}
                  className={`mt-1 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
                />
              </label>
              <label className="text-xs">
                <span className={subText}>표시명 (선택)</span>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  disabled={!isAdmin}
                  maxLength={200}
                  placeholder="예: ㈜클린아이덱스"
                  className={`mt-1 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
                />
              </label>
              <label className="text-xs">
                <span className={subText}>사업자등록번호</span>
                <input
                  value={businessNumber}
                  onChange={(e) => setBusinessNumber(e.target.value)}
                  disabled={!isAdmin}
                  maxLength={50}
                  placeholder="000-00-00000"
                  className={`mt-1 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
                />
              </label>
              <label className="text-xs">
                <span className={subText}>대표 연락처</span>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={!isAdmin}
                  maxLength={50}
                  placeholder="02-000-0000"
                  className={`mt-1 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
                />
              </label>
              <label className="text-xs md:col-span-2">
                <span className={subText}>주소</span>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={!isAdmin}
                  maxLength={500}
                  className={`mt-1 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
                />
              </label>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <button
                type="submit"
                disabled={!isAdmin || !dirty || savingCompany}
                className="rounded bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {savingCompany ? "저장 중…" : "저장"}
              </button>
              {dirty && isAdmin ? <span className={`text-xs ${subText}`}>저장하지 않은 변경사항이 있습니다.</span> : null}
            </div>
          </>
        )}
      </form>

      {/* 직원 카드 */}
      <div className={`rounded-xl border p-4 ${baseCard} md:col-span-2`}>
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">직원</h2>
            <p className={`mt-0.5 text-xs ${subText}`}>
              역할 3종: 관리자(설정·계약·직원), 현장 작업자(출근·작업), 뷰어(읽기 전용)
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadMembers()}
            className={`rounded px-2 py-1 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
          >
            새로고침
          </button>
        </div>

        {membersLoading ? (
          <p className={`mt-2 text-sm ${subText}`}>불러오는 중…</p>
        ) : members.length === 0 ? (
          <p className={`mt-2 text-sm ${subText}`}>등록된 직원이 없습니다.</p>
        ) : (
          <>
            {!isAdmin ? (
              <p className={`mb-2 text-xs ${subText}`}>타인의 이메일은 일부만 표시됩니다. 전체 주소는 관리자만 볼 수 있습니다.</p>
            ) : null}
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className={`text-xs ${subText}`}>
                <tr className="text-left">
                  <th className="py-2 pr-3">이름 / 이메일</th>
                  <th className="py-2 pr-3">연락처</th>
                  <th className="py-2 pr-3">역할</th>
                  <th className="py-2 pr-3">상태</th>
                  <th className="py-2 pr-3 text-right">액션</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m) => {
                  const saving = savingMemberId === m.id;
                  return (
                    <tr key={m.id} className={`border-t ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                      <td className="py-2 pr-3 align-top">
                        <div className="font-medium">
                          {m.display_name || m.email || m.id.slice(0, 8)}
                          {m.is_self ? <span className={`ml-1 text-[10px] ${subText}`}>(나)</span> : null}
                        </div>
                        {m.email ? <div className={`text-xs ${subText}`}>{m.email}</div> : null}
                      </td>
                      <td className="py-2 pr-3 align-top text-xs">{m.phone || "-"}</td>
                      <td className="py-2 pr-3 align-top">
                        {isAdmin ? (
                          <select
                            value={m.role_code ?? ""}
                            onChange={(e) => patchMember(m.id, { role_code: e.target.value })}
                            disabled={saving || (m.is_self && m.role_code === "admin")}
                            className={`rounded border px-2 py-1 text-xs ${baseInput}`}
                          >
                            {ROLE_OPTIONS.map((r) => (
                              <option key={r.code} value={r.code}>
                                {r.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs">{roleLabel(m.role_code)}</span>
                        )}
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] ${
                            m.is_active
                              ? "bg-emerald-100 text-emerald-700"
                              : isDark
                                ? "bg-slate-700 text-slate-300"
                                : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {m.is_active ? "활성" : "비활성"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 align-top text-right">
                        {isAdmin ? (
                          <button
                            type="button"
                            onClick={() => patchMember(m.id, { is_active: !m.is_active })}
                            disabled={saving || m.is_self}
                            className={`rounded px-2 py-1 text-xs ${
                              m.is_active
                                ? isDark
                                  ? "bg-rose-900 text-rose-100"
                                  : "bg-rose-100 text-rose-700"
                                : "bg-emerald-600 text-white"
                            } disabled:opacity-50`}
                          >
                            {saving ? "저장 중…" : m.is_active ? "비활성화" : "활성화"}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </div>
  );
}
