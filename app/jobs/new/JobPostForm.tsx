"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { createJobPost } from "./actions";
import { REGION_SIDO_LIST, REGION_GUGUN, formatRegionForDb } from "@/lib/listings/regions";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { CategoryRow } from "@/lib/listings/types";
import type { PositionInput, PayUnit } from "@/lib/jobs/types";

const OTHER_SUB_ID = "__other__";

type Props = {
  mainCategories: CategoryRow[];
  subCategories: CategoryRow[];
};

const defaultPosition: PositionInput = {
  category_main_id: "",
  category_sub_id: null,
  custom_subcategory_text: null,
  pay_amount: 0,
  pay_unit: "day",
  required_count: 1,
  work_scope: null,
  notes: null,
};

export default function JobPostForm({ mainCategories, subCategories }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [regionSido, setRegionSido] = useState<(typeof REGION_SIDO_LIST)[number]>("서울");
  const gugunOptions = useMemo(() => REGION_GUGUN[regionSido] ?? [], [regionSido]);
  const [regionGugun, setRegionGugun] = useState("");
  const effectiveGugun = regionGugun && gugunOptions.includes(regionGugun) ? regionGugun : gugunOptions[0] ?? "";
  const [workDate, setWorkDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [positions, setPositions] = useState<PositionInput[]>([{ ...defaultPosition, category_main_id: mainCategories[0]?.id ?? "" }]);

  function addPosition() {
    setPositions((prev) => [...prev, { ...defaultPosition, category_main_id: mainCategories[0]?.id ?? "" }]);
  }

  function removePosition(index: number) {
    setPositions((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  function updatePosition(index: number, patch: Partial<PositionInput>) {
    setPositions((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const regionFull = formatRegionForDb(regionSido, effectiveGugun);
    if (!title.trim()) {
      setError("제목을 입력하세요.");
      setLoading(false);
      return;
    }
    if (!contactPhone.trim()) {
      setError("연락처를 입력하세요.");
      setLoading(false);
      return;
    }
    const result = await createJobPost({
      title: title.trim(),
      region: regionSido,
      district: effectiveGugun,
      work_date: workDate.trim() || null,
      start_time: startTime.trim() || null,
      end_time: endTime.trim() || null,
      description: description.trim() || null,
      contact_phone: contactPhone.trim(),
      positions: positions.map((p) => ({
        ...p,
        category_main_id: p.category_main_id,
        category_sub_id: p.category_sub_id || null,
        custom_subcategory_text: p.custom_subcategory_text || null,
        pay_amount: Number(p.pay_amount) || 0,
        pay_unit: p.pay_unit,
        required_count: Math.max(1, Math.floor(Number(p.required_count) || 1)),
      })),
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error ?? "저장 실패");
      return;
    }
    router.push(result.id ? `/jobs/${result.id}` : "/jobs");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <Link href="/jobs" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 목록
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-slate-900">인력 구인 글쓰기</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-slate-800">현장 공통 정보</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="예: OO빌딩 정기청소 인력 구함"
                required
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-700">지역 *</label>
                <select
                  value={regionSido}
                  onChange={(e) => {
                    const next = e.target.value as (typeof REGION_SIDO_LIST)[number];
                    setRegionSido(next);
                    setRegionGugun(REGION_GUGUN[next]?.[0] ?? "");
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {REGION_SIDO_LIST.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">지역구 *</label>
                <select
                  value={effectiveGugun}
                  onChange={(e) => setRegionGugun(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {gugunOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-700">작업일</label>
                <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">시작 시간</label>
                <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700">종료 시간</label>
                <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">연락처 (전화/문자) *</label>
              <input
                type="tel"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="010-0000-0000"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">현장 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                placeholder="작업 장소, 조건 등"
              />
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800">모집 포지션</h2>
            <button
              type="button"
              onClick={addPosition}
              className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" /> 포지션 추가
            </button>
          </div>
          <div className="space-y-6">
            {positions.map((pos, idx) => (
              <PositionFormBlock
                key={idx}
                index={idx}
                position={pos}
                mainCategories={mainCategories}
                subCategories={subCategories}
                onUpdate={(patch) => updatePosition(idx, patch)}
                onRemove={positions.length > 1 ? () => removePosition(idx) : undefined}
              />
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-slate-900 py-3 font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          {loading ? "등록 중…" : "등록하기"}
        </button>
      </form>
    </div>
  );
}

function PositionFormBlock({
  index,
  position,
  mainCategories,
  subCategories,
  onUpdate,
  onRemove,
}: {
  index: number;
  position: PositionInput;
  mainCategories: CategoryRow[];
  subCategories: CategoryRow[];
  onUpdate: (patch: Partial<PositionInput>) => void;
  onRemove?: () => void;
}) {
  const subOptions = useMemo(
    () => subCategories.filter((c) => c.parent_id === position.category_main_id),
    [subCategories, position.category_main_id]
  );
  const showCustomSub = position.category_sub_id === null || position.category_sub_id === OTHER_SUB_ID;

  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-600">포지션 {index + 1}</span>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-slate-400 hover:text-red-600">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium text-slate-500">대분류 *</label>
          <select
            value={position.category_main_id}
            onChange={(e) => {
              onUpdate({ category_main_id: e.target.value, category_sub_id: null, custom_subcategory_text: null });
            }}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {mainCategories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">소분류</label>
          <select
            value={position.category_sub_id ?? OTHER_SUB_ID}
            onChange={(e) => onUpdate({ category_sub_id: e.target.value === OTHER_SUB_ID ? null : e.target.value, custom_subcategory_text: null })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {subOptions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value={OTHER_SUB_ID}>기타</option>
          </select>
          {showCustomSub && (
            <input
              type="text"
              value={position.custom_subcategory_text ?? ""}
              onChange={(e) => onUpdate({ custom_subcategory_text: e.target.value })}
              placeholder="기타 직접 입력"
              className="mt-2 w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
            />
          )}
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-xs font-medium text-slate-500">모집 인원 *</label>
          <input
            type="number"
            min={1}
            value={position.required_count}
            onChange={(e) => onUpdate({ required_count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">금액 *</label>
          <input
            type="number"
            min={0}
            value={position.pay_amount || ""}
            onChange={(e) => onUpdate({ pay_amount: parseFloat(e.target.value) || 0 })}
            placeholder="160000"
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">지급 단위</label>
          <select
            value={position.pay_unit}
            onChange={(e) => onUpdate({ pay_unit: e.target.value as PayUnit })}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            {(Object.entries(PAY_UNIT_LABELS) as [PayUnit, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-500">업무 범위 / 비고</label>
        <input
          type="text"
          value={position.work_scope ?? ""}
          onChange={(e) => onUpdate({ work_scope: e.target.value })}
          placeholder="예: 내부 청소, 창문 청소"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>
    </div>
  );
}
