"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChoiceWithCustom, Chip, Field, Notice, TagInput, btnPrimary, card, input } from "@/components/ai-blog/ui";
import { apiJson } from "@/lib/ai-blog/messages";
import { SERVICE_TYPES, type BusinessProfile, type WritingStyle } from "@/lib/ai-blog/types";

const STYLES: { id: WritingStyle; label: string; desc: string }[] = [
  { id: "story", label: "친근한 후기형", desc: "기본 모드 1" },
  { id: "expert", label: "전문가 설명형", desc: "기본 모드 2" },
  { id: "checkpoint", label: "짧고 간결하게", desc: "기본 모드 3" },
];

type Form = Omit<BusinessProfile, "company_id" | "career_years"> & { career_years: string };

function toForm(p: BusinessProfile | null): Form {
  return {
    business_name: p?.business_name ?? "",
    owner_name: p?.owner_name ?? "",
    phone: p?.phone ?? "",
    base_region: p?.base_region ?? "",
    service_regions: p?.service_regions ?? [],
    main_services: p?.main_services ?? [],
    career_years: p?.career_years != null ? String(p.career_years) : "",
    intro: p?.intro ?? "",
    strengths: p?.strengths ?? "",
    target_customers: p?.target_customers ?? "",
    writing_style: p?.writing_style ?? "story",
    cta_text: p?.cta_text ?? "",
    homepage_url: p?.homepage_url ?? "",
    naver_place_url: p?.naver_place_url ?? "",
    banned_phrases: p?.banned_phrases ?? [],
  };
}

export default function ProfileForm({ initial }: { initial: BusinessProfile | null }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => toForm(initial));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setSaved(false);
    setF((prev) => ({ ...prev, [k]: v }));
  };
  const text = (k: keyof Form) => ({
    className: input,
    value: (f[k] as string | null) ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => set(k, e.target.value as never),
  });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiJson("/api/ai-blog/profile", { method: "PUT", body: JSON.stringify(f) });
      setSaved(true);
      if (!initial) router.push("/ai-blog");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`${card} space-y-6 p-5`}>
      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="업체명 (필수)">
          <input {...text("business_name")} placeholder="예: OO클린" />
        </Field>
        <Field label="대표자명">
          <input {...text("owner_name")} />
        </Field>
        <Field label="연락처" hint="글 마지막 상담 안내에 들어갑니다.">
          <input {...text("phone")} placeholder="010-0000-0000" />
        </Field>
        <Field label="업체 경력 (년)">
          <input {...text("career_years")} inputMode="numeric" />
        </Field>
        <Field label="활동 지역">
          <input {...text("base_region")} placeholder="예: 서울 강서구" />
        </Field>
        <Field label="서비스 가능 지역" hint="입력 후 Enter">
          <TagInput values={f.service_regions} onChange={(v) => set("service_regions", v)} placeholder="예: 양천구" />
        </Field>
      </section>

      <Field label="주력 서비스" hint="목록에 없으면 '+ 추가하기'로 직접 입력하세요. 새 현장 등록 때 서비스 목록에도 나옵니다.">
        <ChoiceWithCustom
          multiple
          max={10}
          options={SERVICE_TYPES}
          selected={f.main_services}
          onChange={(v) => set("main_services", v)}
          placeholder="예: 에어컨 청소"
        />
      </Field>

      <Field label="원하는 글 스타일" hint="초안 생성 화면의 기본 모드가 됩니다. 생성할 때마다 바꿀 수 있습니다.">
        <div className="flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <Chip key={s.id} active={f.writing_style === s.id} onClick={() => set("writing_style", s.id)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </Field>

      <section className="grid gap-4 sm:grid-cols-2">
        <Field label="업체 소개">
          <textarea {...text("intro")} rows={3} placeholder="어떤 업체인지 두세 줄로" />
        </Field>
        <Field label="업체 강점">
          <textarea {...text("strengths")} rows={3} placeholder="예: 공사 후 분진 제거, 3인 1팀 반나절 마무리" />
        </Field>
        <Field label="주요 고객층">
          <input {...text("target_customers")} placeholder="예: 신혼부부, 아이 있는 집" />
        </Field>
        <Field label="기본 상담 문구" hint="글 마지막 문단에 들어갑니다.">
          <input {...text("cta_text")} placeholder="예: 강서구 입주청소 상담은 편하게 연락 주세요." />
        </Field>
        <Field label="홈페이지">
          <input {...text("homepage_url")} placeholder="https://" />
        </Field>
        <Field label="네이버 플레이스">
          <input {...text("naver_place_url")} placeholder="https://naver.me/..." />
        </Field>
      </section>

      <Field label="사용하지 않을 표현" hint="입력 후 Enter. AI 글에서 자동으로 빠집니다.">
        <TagInput values={f.banned_phrases} onChange={(v) => set("banned_phrases", v)} placeholder="예: 최저가" />
      </Field>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">저장했습니다.</Notice> : null}
      <div className="flex justify-end">
        <button type="button" className={btnPrimary} disabled={saving || !f.business_name.trim()} onClick={save}>
          {saving ? "저장 중…" : initial ? "저장" : "저장하고 시작하기"}
        </button>
      </div>
    </div>
  );
}
