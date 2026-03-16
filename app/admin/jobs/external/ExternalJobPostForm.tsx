"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createExternalJobPost } from "./actions";
import { REGION_SIDO_LIST, REGION_GUGUN, formatRegionForDb } from "@/lib/listings/regions";

type CategoryRow = { id: string; name: string };

export default function ExternalJobPostForm({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [regionSido, setRegionSido] = useState<(typeof REGION_SIDO_LIST)[number]>("서울");
  const [regionGugun, setRegionGugun] = useState("");
  const [workDate, setWorkDate] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [categoryMainId, setCategoryMainId] = useState(categories[0]?.id ?? "");
  const [payAmount, setPayAmount] = useState("");
  const [payUnit, setPayUnit] = useState<"day" | "half_day" | "hour">("day");
  const [sourceUrl, setSourceUrl] = useState("");

  const gugunOptions = REGION_GUGUN[regionSido] ?? [];
  const effectiveGugun = regionGugun && gugunOptions.includes(regionGugun) ? regionGugun : (gugunOptions[0] ?? "");
  const region = formatRegionForDb(regionSido, effectiveGugun);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createExternalJobPost({
      title,
      region,
      district: effectiveGugun,
      work_date: workDate || null,
      description: description || null,
      contact_phone: contactPhone,
      status,
      category_main_id: categoryMainId,
      pay_amount: Number(payAmount) || 0,
      pay_unit: payUnit,
      source_url: sourceUrl || null,
    });
    setLoading(false);
    if (result.ok) {
      router.push("/jobs");
      router.refresh();
    } else {
      setError(result.error ?? "저장 실패");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      {error && (
        <div className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">제목 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">시/도 *</label>
          <select
            value={regionSido}
            onChange={(e) => {
              setRegionSido(e.target.value as (typeof REGION_SIDO_LIST)[number]);
              setRegionGugun("");
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {REGION_SIDO_LIST.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">구/군 *</label>
          <select
            value={effectiveGugun}
            onChange={(e) => setRegionGugun(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {gugunOptions.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">마감일/근무일 (선택)</label>
        <input
          type="date"
          value={workDate}
          onChange={(e) => setWorkDate(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
        <p className="mt-1 text-xs text-slate-500">진행 중 건은 이 날짜에 자동 마감됩니다. 마감건이면 상태를 마감으로 선택하세요.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">상세 내용</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">연락처 *</label>
        <input
          type="text"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="010-0000-0000"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">상태 *</label>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as "open" | "closed")}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="open">모집 중</option>
          <option value="closed">마감 (평균 일당 집계용)</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">일당/금액 *</label>
          <input
            type="number"
            min={1}
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">단위 *</label>
          <select
            value={payUnit}
            onChange={(e) => setPayUnit(e.target.value as "day" | "half_day" | "hour")}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="day">일당</option>
            <option value="half_day">반당</option>
            <option value="hour">시급</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">카테고리 *</label>
        <select
          value={categoryMainId}
          onChange={(e) => setCategoryMainId(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">출처 URL (선택)</label>
        <input
          type="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          placeholder="https://..."
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "저장 중…" : "등록"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
