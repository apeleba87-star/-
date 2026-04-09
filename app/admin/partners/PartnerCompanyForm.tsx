"use client";

import { useMemo, useState } from "react";
import { createPartnerCompany } from "./actions";
import PartnerMainImageFields from "@/components/partners/PartnerMainImageFields";

type Option = { code: string; label: string };

type Props = {
  categories: Option[];
  regions: Option[];
};

type PriceDraft = { item_name: string; unit: string; base_price: string; note: string };

const EMPTY_PRICE: PriceDraft = { item_name: "", unit: "", base_price: "", note: "" };

export default function PartnerCompanyForm({ categories, regions }: Props) {
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [oneLiner, setOneLiner] = useState("");
  const [workScope, setWorkScope] = useState("");
  const [homepageUrl, setHomepageUrl] = useState("");
  const [snsUrl, setSnsUrl] = useState("");
  const [mainImageUrl, setMainImageUrl] = useState("");
  const [businessVerified, setBusinessVerified] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [prices, setPrices] = useState<PriceDraft[]>([{ ...EMPTY_PRICE }]);
  const [deferredMainFile, setDeferredMainFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sortedCategories = useMemo(() => [...categories].sort((a, b) => a.label.localeCompare(b.label, "ko")), [categories]);
  const sortedRegions = useMemo(() => [...regions].sort((a, b) => a.label.localeCompare(b.label, "ko")), [regions]);

  function toggleValue(values: string[], value: string, setter: (next: string[]) => void) {
    if (values.includes(value)) setter(values.filter((v) => v !== value));
    else setter([...values, value]);
  }

  function setPriceRow(index: number, patch: Partial<PriceDraft>) {
    setPrices((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const result = await createPartnerCompany({
        name,
        contact_name: contactName,
        phone,
        one_liner: oneLiner || null,
        work_scope: workScope || null,
        homepage_url: homepageUrl || null,
        sns_url: snsUrl || null,
        main_image_url: mainImageUrl || null,
        business_verified: businessVerified,
        category_codes: selectedCategories,
        region_codes: selectedRegions,
        prices: prices
          .map((p) => ({
            item_name: p.item_name.trim(),
            unit: p.unit.trim() || null,
            base_price: Number(p.base_price),
            note: p.note.trim() || null,
          }))
          .filter((p) => p.item_name && Number.isFinite(p.base_price) && p.base_price >= 0),
      });
      if (!result.ok) throw new Error(result.error);
      const newId = "id" in result ? (result as { id: string }).id : null;
      const fileToUpload = deferredMainFile;
      if (newId && fileToUpload) {
        try {
          const fd = new FormData();
          fd.set("company_id", newId);
          fd.set("file", fileToUpload);
          const up = await fetch("/api/admin/partner-main-image/upload", { method: "POST", body: fd });
          const upData = (await up.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
          if (!up.ok || !upData?.ok) throw new Error(upData?.error ?? "메인 이미지 업로드에 실패했습니다.");
        } catch (upErr) {
          setError(upErr instanceof Error ? upErr.message : "메인 이미지 업로드에 실패했습니다.");
          setMessage("업체는 등록되었습니다. 메인 이미지는 수정 화면에서 다시 올려 주세요.");
          setDeferredMainFile(null);
          return;
        }
        setDeferredMainFile(null);
      }
      setMessage(fileToUpload && newId ? "협력업체가 등록되었고 메인 이미지를 업로드했습니다." : "협력업체가 등록되었습니다.");
      setName("");
      setContactName("");
      setPhone("");
      setOneLiner("");
      setWorkScope("");
      setHomepageUrl("");
      setSnsUrl("");
      setMainImageUrl("");
      setBusinessVerified(true);
      setSelectedCategories([]);
      setSelectedRegions([]);
      setPrices([{ ...EMPTY_PRICE }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">협력업체 등록</h2>
        <p className="text-xs text-slate-500">초기에는 관리자가 직접 등록하고, 추후 owner 계정 연결로 업체 성과를 열어줍니다.</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="업체명" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="대표자명" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700">
          <input type="checkbox" checked={businessVerified} onChange={(e) => setBusinessVerified(e.target.checked)} />
          사업자 확인
        </label>
      </div>

      <textarea value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="한 줄 소개" className="min-h-[76px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <textarea value={workScope} onChange={(e) => setWorkScope(e.target.value)} placeholder="작업가능 범위 (예: 하루 4way 30대 / 2개 팀 운영)" className="min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

      <div className="grid gap-3 md:grid-cols-2">
        <input value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} placeholder="홈페이지 URL (선택)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={snsUrl} onChange={(e) => setSnsUrl(e.target.value)} placeholder="SNS URL (선택)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <PartnerMainImageFields companyId={null} imageUrl={mainImageUrl} onImageUrlChange={setMainImageUrl} />

      <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-3">
        <p className="mb-2 text-xs text-slate-600">저장 직후 자동 업로드할 메인 이미지 파일 (선택). URL만 쓰면 비워 두세요.</p>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="block w-full text-xs text-slate-600"
          onChange={(e) => setDeferredMainFile(e.target.files?.[0] ?? null)}
        />
        {deferredMainFile ? <p className="mt-1 text-[11px] text-slate-500">선택됨: {deferredMainFile.name}</p> : null}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-800">가능 업종</p>
        <div className="flex flex-wrap gap-2">
          {sortedCategories.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => toggleValue(selectedCategories, c.code, setSelectedCategories)}
              className={`rounded-full border px-3 py-1 text-xs ${selectedCategories.includes(c.code) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700"}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-slate-800">활동 지역</p>
        <div className="flex flex-wrap gap-2">
          {sortedRegions.map((r) => (
            <button
              key={r.code}
              type="button"
              onClick={() => toggleValue(selectedRegions, r.code, setSelectedRegions)}
              className={`rounded-full border px-3 py-1 text-xs ${selectedRegions.includes(r.code) ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-slate-300 text-slate-700"}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-slate-800">기본 단가</p>
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
            부가세 포함 입력
          </span>
        </div>
        {prices.map((row, idx) => (
          <div key={idx} className="grid gap-2 md:grid-cols-4">
            <input value={row.item_name} onChange={(e) => setPriceRow(idx, { item_name: e.target.value })} placeholder="항목명" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={row.unit} onChange={(e) => setPriceRow(idx, { unit: e.target.value })} placeholder="단위(대/평)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={row.base_price} onChange={(e) => setPriceRow(idx, { base_price: e.target.value })} placeholder="금액(VAT 포함)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            <input value={row.note} onChange={(e) => setPriceRow(idx, { note: e.target.value })} placeholder="비고(선택)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
        ))}
        <div className="flex gap-2">
          <button type="button" onClick={() => setPrices((prev) => [...prev, { ...EMPTY_PRICE }])} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700">
            단가 항목 추가
          </button>
          {prices.length > 1 ? (
            <button type="button" onClick={() => setPrices((prev) => prev.slice(0, -1))} className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-700">
              마지막 항목 삭제
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button disabled={loading} type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-emerald-300">
          {loading ? "등록 중..." : "협력업체 등록"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
