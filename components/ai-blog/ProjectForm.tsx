"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChoiceWithCustom, Chip, Field, Notice, btnPrimary, card, input } from "@/components/ai-blog/ui";
import { apiJson } from "@/lib/ai-blog/messages";
import { PROPERTY_TYPES, SERVICE_TYPES, type Project, type ProjectAttribute } from "@/lib/ai-blog/types";

type Form = {
  service_type: string;
  region_sido: string;
  region_sigungu: string;
  region_dong: string;
  property_type: string;
  area_pyeong: string;
  worker_count: string;
  work_hours: string;
  price: string;
  work_date: string;
  description: string;
};

function toForm(p: Project | null, defaultService: string): Form {
  return {
    service_type: p?.service_type ?? defaultService,
    region_sido: p?.region_sido ?? "",
    region_sigungu: p?.region_sigungu ?? "",
    region_dong: p?.region_dong ?? "",
    property_type: p?.property_type ?? "아파트",
    area_pyeong: p?.area_pyeong != null ? String(p.area_pyeong) : "",
    worker_count: p?.worker_count != null ? String(p.worker_count) : "",
    work_hours: p?.work_minutes != null ? String(Math.round((p.work_minutes / 60) * 10) / 10) : "",
    price: p?.price != null ? String(p.price) : "",
    work_date: p?.work_date ?? new Date().toISOString().slice(0, 10),
    description: p?.description ?? "",
  };
}

const formatWon = (digits: string) => (digits ? Number(digits).toLocaleString("ko-KR") : "");

export default function ProjectForm({
  project,
  attributes,
  serviceOptions,
}: {
  project: Project | null;
  attributes: ProjectAttribute[];
  serviceOptions: string[];
}) {
  const router = useRouter();
  const services = [...new Set([...serviceOptions, ...SERVICE_TYPES])];
  const [f, setF] = useState<Form>(() => toForm(project, services[0] ?? "입주청소"));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = (k: keyof Form, v: string) => {
    setSaved(false);
    setF((prev) => ({ ...prev, [k]: v }));
  };
  const text = (k: keyof Form) => ({
    className: input,
    value: f[k],
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value),
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    const hours = Number(f.work_hours);
    const body = {
      ...f,
      work_minutes: Number.isFinite(hours) && hours > 0 ? Math.round(hours * 60) : null,
      attributes,
    };
    try {
      if (project) {
        await apiJson(`/api/ai-blog/projects/${project.id}`, { method: "PATCH", body: JSON.stringify(body) });
        setSaved(true);
        router.refresh();
      } else {
        const created = await apiJson<Project>("/api/ai-blog/projects", { method: "POST", body: JSON.stringify(body) });
        router.push(`/ai-blog/projects/${created.id}?tab=photos`);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${card} max-w-3xl space-y-4 p-5`}>
      <Field label="서비스" hint="목록에 없으면 '+ 추가하기'로 직접 입력하세요.">
        <ChoiceWithCustom
          options={services}
          selected={f.service_type ? [f.service_type] : []}
          onChange={(v) => set("service_type", v[0] ?? "")}
          placeholder="예: 에어컨 청소"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="시/도">
          <input {...text("region_sido")} placeholder="서울" />
        </Field>
        <Field label="구/군">
          <input {...text("region_sigungu")} placeholder="강서구" />
        </Field>
        <Field label="동 (여기까지만 저장)">
          <input {...text("region_dong")} placeholder="마곡동" />
        </Field>
      </div>
      <Field label="건물 유형">
        <div className="flex flex-wrap gap-1.5">
          {PROPERTY_TYPES.map((s) => (
            <Chip key={s} active={f.property_type === s} onClick={() => set("property_type", s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Field>
      <div className="grid gap-3 sm:grid-cols-4">
        <Field label="평수">
          <input {...text("area_pyeong")} inputMode="decimal" placeholder="34" />
        </Field>
        <Field label="작업 인원">
          <input {...text("worker_count")} inputMode="numeric" placeholder="3" />
        </Field>
        <Field label="1인 작업시간(시간)">
          <input {...text("work_hours")} inputMode="decimal" placeholder="1.5" />
        </Field>
        <Field label="작업일">
          <input {...text("work_date")} type="date" />
        </Field>
      </div>
      <Field label="금액 (선택)" hint="업체만 보는 기록입니다. 블로그 글에는 들어가지 않습니다.">
        <div className="relative max-w-xs">
          <input
            className={`${input} pr-8 text-right`}
            inputMode="numeric"
            placeholder="400,000"
            value={formatWon(f.price)}
            onChange={(e) => set("price", e.target.value.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 10))}
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-500">원</span>
        </div>
      </Field>
      <Field label="특이사항 · 추가 설명" hint="AI가 글을 쓸 때 참고합니다.">
        <textarea {...text("description")} rows={3} placeholder="예: 공사 후 분진이 많았음, 욕실 수전 물때" />
      </Field>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">저장했습니다.</Notice> : null}
      <div className="flex justify-end">
        <button type="button" className={btnPrimary} disabled={saving || !f.service_type} onClick={save}>
          {saving ? "저장 중…" : project ? "저장" : "저장하고 사진 정렬"}
        </button>
      </div>
    </div>
  );
}
