"use client";

import { useMemo, useState, useTransition } from "react";
import { adminSetQuestionTagsAction } from "@/app/admin/questions/actions";
import type { QuestionEntityType } from "@/lib/questions/constants";
import { QUESTION_PLACE_OPTIONS } from "@/lib/questions/places";

type Option = { id: string; label: string; hint?: string };

type Props = {
  questionId: number;
  initial: { type: QuestionEntityType; id: string }[];
  products: Option[];
  contaminants: Option[];
  materials: Option[];
};

export default function AdminQuestionTagsForm({
  questionId,
  initial,
  products,
  contaminants,
  materials,
}: Props) {
  const [productId, setProductId] = useState(
    initial.find((e) => e.type === "product")?.id ?? "",
  );
  const [productId2, setProductId2] = useState(
    initial.filter((e) => e.type === "product")[1]?.id ?? "",
  );
  const [contaminantId, setContaminantId] = useState(
    initial.find((e) => e.type === "contaminant")?.id ?? "",
  );
  const [materialId, setMaterialId] = useState(
    initial.find((e) => e.type === "material")?.id ?? "",
  );
  const [placeId, setPlaceId] = useState(
    initial.find((e) => e.type === "place")?.id ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const places = useMemo(
    () =>
      QUESTION_PLACE_OPTIONS.map((p) => ({
        id: p.id,
        label: p.group === "place" ? p.name : `${p.name} (구역)`,
      })),
    [],
  );

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    const entities: { type: QuestionEntityType; id: string }[] = [];
    if (productId) entities.push({ type: "product", id: productId });
    if (productId2 && productId2 !== productId) {
      entities.push({ type: "product", id: productId2 });
    }
    if (contaminantId) entities.push({ type: "contaminant", id: contaminantId });
    if (materialId) entities.push({ type: "material", id: materialId });
    if (placeId) entities.push({ type: "place", id: placeId });

    startTransition(async () => {
      const res = await adminSetQuestionTagsAction({ questionId, entities });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage("태그를 저장했습니다.");
    });
  }

  return (
    <form onSubmit={onSave} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-base font-bold text-slate-900">태그 지정</h2>
      <p className="text-xs text-slate-500">
        사용자 작성 화면에는 태그가 없습니다. 여기서 제품·오염·재질·장소를 연결하세요.
      </p>
      <SelectField
        label="제품 (대표)"
        value={productId}
        onChange={setProductId}
        options={products}
        placeholder="선택 안 함"
      />
      <SelectField
        label="제품 (추가)"
        value={productId2}
        onChange={setProductId2}
        options={products}
        placeholder="선택 안 함"
      />
      <SelectField
        label="오염"
        value={contaminantId}
        onChange={setContaminantId}
        options={contaminants}
        placeholder="선택 안 함"
      />
      <SelectField
        label="재질"
        value={materialId}
        onChange={setMaterialId}
        options={materials}
        placeholder="선택 안 함"
      />
      <SelectField
        label="장소"
        value={placeId}
        onChange={setPlaceId}
        options={places}
        placeholder="선택 안 함"
      />
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? <p className="text-sm text-teal-700">{message}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
      >
        {pending ? "저장 중…" : "태그 저장"}
      </button>
    </form>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Option[];
  placeholder: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-bold text-slate-600">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.hint ? `${o.label} (${o.hint})` : o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
