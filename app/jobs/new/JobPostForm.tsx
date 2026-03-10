"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, Calendar } from "lucide-react";
import { createJobPost } from "./actions";
import { glassCard } from "@/lib/ui-styles";
import { REGION_SIDO_LIST, REGION_GUGUN, formatRegionForDb } from "@/lib/listings/regions";
import { PAY_UNIT_LABELS } from "@/lib/listings/wage";
import type { PositionInput, PayUnit } from "@/lib/jobs/types";
import { JOB_TYPE_PRESETS, JOB_TYPE_OTHER, SKILL_LEVEL_LABELS } from "@/lib/jobs/job-type-presets";

/** 연락처 입력용: 숫자만 남기고 010-XXXX-XXXX 형식으로 포맷 */
function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

/** 금액 입력: 천단위 콤마 표시용 */
function formatAmountInput(value: number | string | null | undefined): string {
  if (value === "" || value === null || value === undefined) return "";
  const n = typeof value === "string" ? parseInt(value.replace(/\D/g, ""), 10) : Number(value);
  if (Number.isNaN(n) || n <= 0) return "";
  return n.toLocaleString("ko-KR");
}

/** 금액 문자열에서 숫자만 파싱 */
function parseAmountInput(value: string): number {
  const n = parseInt(value.replace(/\D/g, ""), 10);
  return Number.isNaN(n) ? 0 : n;
}

type Props = {
  mainCategories: { id: string }[];
  subCategories: unknown[];
};

const defaultPosition: PositionInput = {
  job_type_key: null,
  job_type_input: "",
  skill_level: "general",
  pay_amount: 0,
  pay_unit: "day",
  required_count: 1,
  work_scope: null,
  notes: null,
  work_period: null,
  start_time: null,
  end_time: null,
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
  const [fullAddress, setFullAddress] = useState("");
  const [accessInstructions, setAccessInstructions] = useState("");
  const [parkingInfo, setParkingInfo] = useState("");
  const [siteNotes, setSiteNotes] = useState("");
  const [useSameTimeForPositions, setUseSameTimeForPositions] = useState(true);
  const [positions, setPositions] = useState<PositionInput[]>([{ ...defaultPosition }]);

  function handleContactChange(raw: string) {
    setContactPhone(formatPhoneInput(raw));
  }

  const timePresets = [
    { label: "오전", start: "08:00", end: "12:00" },
    { label: "오후", start: "13:00", end: "17:00" },
    { label: "종일", start: "08:00", end: "17:00" },
  ] as const;
  function applyTimePreset(start: string, end: string) {
    setStartTime(start);
    setEndTime(end);
  }

  function addPosition() {
    setPositions((prev) => [...prev, { ...defaultPosition }]);
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
      address: null,
      work_date: workDate.trim() || null,
      start_time: startTime.trim() || null,
      end_time: endTime.trim() || null,
      description: description.trim() || null,
      contact_phone: contactPhone.trim(),
      private_details: {
        full_address: fullAddress.trim() || null,
        contact_phone: contactPhone.trim() || null,
        access_instructions: accessInstructions.trim() || null,
        parking_info: parkingInfo.trim() || null,
        notes: siteNotes.trim() || null,
      },
      positions: positions.map((p) => ({
        ...p,
        job_type_key: p.job_type_key ?? null,
        job_type_input: (p.job_type_input ?? "").trim() || null,
        skill_level: p.skill_level === "expert" || p.skill_level === "general" ? p.skill_level : "general",
        pay_amount: typeof p.pay_amount === "number" ? p.pay_amount : parseAmountInput(String(p.pay_amount ?? "")),
        pay_unit: p.pay_unit,
        required_count: Math.max(1, Math.floor(Number(p.required_count) || 1)),
        start_time: useSameTimeForPositions ? (startTime.trim() || null) : (p.start_time?.trim() || null),
        end_time: useSameTimeForPositions ? (endTime.trim() || null) : (p.end_time?.trim() || null),
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

  const inputClass =
    "mt-1.5 w-full rounded-xl border border-slate-200 bg-white/80 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/jobs"
        className="mb-6 inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <span aria-hidden>←</span> 목록
      </Link>
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">인력 구인 글쓰기</h1>
      <p className="mt-0.5 text-sm text-slate-600">현장 정보와 모집 포지션을 입력하세요.</p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-6">
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <section className={`${glassCard} p-5`}>
          <h2 className="text-base font-semibold text-slate-800">현장 공통 정보</h2>
          <p className="mt-0.5 text-xs text-slate-500">제목, 지역, 작업일, 연락처를 입력하세요.</p>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">제목 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputClass}
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
                  className={inputClass}
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
                  className={inputClass}
                >
                  {gugunOptions.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">현장 상세 주소</label>
              <p className="mt-0.5 text-xs text-slate-500">확정된 지원자에게만 공개됩니다.</p>
              <input
                type="text"
                value={fullAddress}
                onChange={(e) => setFullAddress(e.target.value)}
                className={inputClass}
                placeholder="길음로 15길 55"
              />
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/30 p-4">
              <div className="flex items-center gap-2 text-slate-800">
                <Calendar className="h-4 w-4 text-slate-500" aria-hidden />
                <span className="text-sm font-semibold">작업 일시</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">몇 시부터 몇 시까지인지 선택하세요. 빠른 선택을 누르면 시간이 자동으로 채워집니다.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {timePresets.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyTimePreset(preset.start, preset.end)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      startTime === preset.start && endTime === preset.end
                        ? "bg-blue-100 text-blue-800 ring-1 ring-blue-300"
                        : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {preset.label} ({preset.start}~{preset.end})
                  </button>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-end gap-3 sm:gap-4">
                <div className="min-w-[140px] flex-1 sm:flex-none">
                  <label className="block text-xs font-medium text-slate-600">날짜</label>
                  <input
                    type="date"
                    value={workDate}
                    onChange={(e) => setWorkDate(e.target.value)}
                    className={inputClass}
                    aria-label="작업 날짜 선택"
                  />
                </div>
                <div className="flex shrink-0 items-center gap-1 text-slate-400 sm:gap-2">
                  <div className="min-w-[72px] sm:min-w-[80px]">
                    <label className="block text-xs font-medium text-slate-600">시작</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className={inputClass}
                      aria-label="시작 시간"
                    />
                  </div>
                  <span className="mb-2 text-slate-400" aria-hidden>~</span>
                  <div className="min-w-[72px] sm:min-w-[80px]">
                    <label className="block text-xs font-medium text-slate-600">종료</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className={inputClass}
                      aria-label="종료 시간"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <input
                type="checkbox"
                id="use-same-time"
                checked={useSameTimeForPositions}
                onChange={(e) => setUseSameTimeForPositions(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="use-same-time" className="text-sm font-medium text-slate-700">
                이 작업 일시를 모든 포지션에 그대로 적용
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">연락처 (전화/문자) *</label>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={contactPhone}
                onChange={(e) => handleContactChange(e.target.value)}
                className={inputClass}
                placeholder="010-1111-2222"
                maxLength={13}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">현장 간편 설명</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={inputClass}
                placeholder="통상적인 학교 청소 입니다"
              />
            </div>

            <div className="rounded-xl border border-amber-200/60 bg-amber-50/30 p-4">
              <h3 className="text-sm font-semibold text-slate-800">현장 안내 (확정된 지원자에게만 공개)</h3>
              <p className="mt-0.5 text-xs text-slate-500">지원을 확정한 분에게만 아래 내용이 공개됩니다. 위에서 입력한 현장 상세 주소와 함께 공개됩니다.</p>
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600">출입 방법</label>
                  <input
                    type="text"
                    value={accessInstructions}
                    onChange={(e) => setAccessInstructions(e.target.value)}
                    className={inputClass}
                    placeholder="예: 정문 경비실에서 출입증 수령"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">주차 안내</label>
                  <input
                    type="text"
                    value={parkingInfo}
                    onChange={(e) => setParkingInfo(e.target.value)}
                    className={inputClass}
                    placeholder="예: 병설 유치원 내 주차"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">주의사항</label>
                  <textarea
                    value={siteNotes}
                    onChange={(e) => setSiteNotes(e.target.value)}
                    rows={2}
                    className={inputClass}
                    placeholder="개인 준비물, 신분증 등"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={`${glassCard} p-5`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-800">모집 포지션</h2>
              <p className="mt-0.5 text-xs text-slate-500">직종, 인원, 급여를 입력하세요.</p>
            </div>
            <button
              type="button"
              onClick={addPosition}
              className="shrink-0 rounded-xl bg-gradient-to-r from-blue-500 to-blue-700 px-4 py-2.5 text-sm font-medium text-white shadow-md hover:from-blue-600 hover:to-blue-700"
            >
              <Plus className="inline h-4 w-4" aria-hidden /> 포지션 추가
            </button>
          </div>
          <div className="mt-6 space-y-4">
            {positions.map((pos, idx) => (
              <PositionFormBlock
                key={idx}
                index={idx}
                position={pos}
                inputClass={inputClass}
                useSameTime={useSameTimeForPositions}
                onUpdate={(patch) => updatePosition(idx, patch)}
                onRemove={positions.length > 1 ? () => removePosition(idx) : undefined}
              />
            ))}
          </div>
        </section>

        <button
          type="submit"
          disabled={loading}
          className="w-full min-h-[52px] rounded-2xl bg-slate-900 py-3.5 text-base font-semibold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50"
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
  inputClass,
  useSameTime,
  onUpdate,
  onRemove,
}: {
  index: number;
  position: PositionInput;
  inputClass: string;
  useSameTime: boolean;
  onUpdate: (patch: Partial<PositionInput>) => void;
  onRemove?: () => void;
}) {
  const isOther = position.job_type_key === JOB_TYPE_OTHER || !position.job_type_key;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/60 p-4 backdrop-blur-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-700">포지션 {index + 1}</span>
        {onRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600"
            aria-label="포지션 삭제"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">어떤 작업인가요? *</label>
        <div className="mt-2 flex flex-wrap gap-2">
          {JOB_TYPE_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              onClick={() => onUpdate({ job_type_key: preset.key, job_type_input: preset.label })}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
                position.job_type_key === preset.key
                  ? "bg-blue-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {preset.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => onUpdate({ job_type_key: JOB_TYPE_OTHER, job_type_input: position.job_type_input || "" })}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition-colors ${
              isOther ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            기타
          </button>
        </div>
        {isOther && (
          <input
            type="text"
            value={position.job_type_input ?? ""}
            onChange={(e) => onUpdate({ job_type_input: e.target.value })}
            placeholder="예: 고소작업(외벽), 고소작업(유리) 등"
            className={`${inputClass} mt-2`}
          />
        )}
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700">숙련도</label>
        <div className="mt-2 flex gap-4">
          {(["expert", "general"] as const).map((level) => (
            <label key={level} className="flex cursor-pointer items-center gap-2">
              <input
                type="radio"
                name={`skill-${index}`}
                checked={(position.skill_level ?? "general") === level}
                onChange={() => onUpdate({ skill_level: level })}
                className="h-4 w-4 border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-700">{SKILL_LEVEL_LABELS[level]}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-700">모집 인원 *</label>
          <input
            type="number"
            min={1}
            value={position.required_count}
            onChange={(e) => onUpdate({ required_count: Math.max(1, parseInt(e.target.value, 10) || 1) })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">금액 *</label>
          <input
            type="text"
            inputMode="numeric"
            value={formatAmountInput(position.pay_amount)}
            onChange={(e) => onUpdate({ pay_amount: parseAmountInput(e.target.value) })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">지급 단위</label>
          <select
            value={position.pay_unit}
            onChange={(e) => onUpdate({ pay_unit: e.target.value as PayUnit })}
            className={inputClass}
          >
            {(Object.entries(PAY_UNIT_LABELS) as [PayUnit, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>
      {position.pay_unit === "half_day" && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">반당 시간대</label>
          <select
            value={position.work_period ?? ""}
            onChange={(e) => onUpdate({ work_period: (e.target.value || null) as "am" | "pm" | null })}
            className={inputClass}
          >
            <option value="">선택</option>
            <option value="am">오전</option>
            <option value="pm">오후</option>
          </select>
        </div>
      )}
      {!useSameTime && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">작업 시작 시각 <span className="text-slate-400">(선택)</span></label>
            <input
              type="time"
              value={position.start_time ?? ""}
              onChange={(e) => onUpdate({ start_time: e.target.value || null })}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">작업 종료 시각 <span className="text-slate-400">(선택, 야간 시)</span></label>
            <input
              type="time"
              value={position.end_time ?? ""}
              onChange={(e) => onUpdate({ end_time: e.target.value || null })}
              className={inputClass}
            />
          </div>
        </div>
      )}
      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-700">업무 범위 / 비고</label>
        <input
          type="text"
          value={position.work_scope ?? ""}
          onChange={(e) => onUpdate({ work_scope: e.target.value })}
          placeholder="예: 내부 청소, 창문 청소"
          className={inputClass}
        />
      </div>
    </div>
  );
}
