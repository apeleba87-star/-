"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updatePartnerCompany } from "../../actions";
import PartnerMainImageFields from "@/components/partners/PartnerMainImageFields";

type Option = { code: string; label: string };

export type PartnerEditInitial = {
  id: string;
  name: string;
  contact_name: string;
  phone: string;
  one_liner: string | null;
  work_scope: string | null;
  business_verified: boolean;
  homepage_url: string | null;
  sns_url: string | null;
  main_image_url: string | null;
  status: string;
  owner_user_id: string | null;
  category_codes: string[];
  region_codes: string[];
  prices: { item_name: string; unit: string | null; base_price: number; note: string | null }[];
};

type Props = {
  initial: PartnerEditInitial;
  categories: Option[];
  regions: Option[];
};

type PriceDraft = { item_name: string; unit: string; base_price: string; note: string };
const EMPTY_PRICE: PriceDraft = { item_name: "", unit: "", base_price: "", note: "" };

const STATUS_OPTIONS = [
  { value: "draft", label: "초안" },
  { value: "pending", label: "대기" },
  { value: "active", label: "공개" },
  { value: "paused", label: "일시중지" },
  { value: "archived", label: "보관" },
] as const;

export default function PartnerCompanyEditForm({ initial, categories, regions }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial.name);
  const [contactName, setContactName] = useState(initial.contact_name);
  const [phone, setPhone] = useState(initial.phone);
  const [oneLiner, setOneLiner] = useState(initial.one_liner ?? "");
  const [workScope, setWorkScope] = useState(initial.work_scope ?? "");
  const [homepageUrl, setHomepageUrl] = useState(initial.homepage_url ?? "");
  const [snsUrl, setSnsUrl] = useState(initial.sns_url ?? "");
  const [mainImageUrl, setMainImageUrl] = useState(initial.main_image_url ?? "");
  const [businessVerified, setBusinessVerified] = useState(initial.business_verified);
  const [status, setStatus] = useState(initial.status);
  const [ownerUserId, setOwnerUserId] = useState(initial.owner_user_id ?? "");
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initial.category_codes);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(initial.region_codes);
  const [prices, setPrices] = useState<PriceDraft[]>(
    initial.prices.length > 0
      ? initial.prices.map((p) => ({
          item_name: p.item_name,
          unit: p.unit ?? "",
          base_price: String(p.base_price),
          note: p.note ?? "",
        }))
      : [{ ...EMPTY_PRICE }]
  );
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
      const result = await updatePartnerCompany({
        id: initial.id,
        name,
        contact_name: contactName,
        phone,
        one_liner: oneLiner || null,
        work_scope: workScope || null,
        homepage_url: homepageUrl || null,
        sns_url: snsUrl || null,
        main_image_url: mainImageUrl || null,
        business_verified: businessVerified,
        status: status as "draft" | "pending" | "active" | "paused" | "archived",
        owner_user_id: ownerUserId.trim() || null,
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
      setMessage("저장되었습니다.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">협력업체 수정</h2>
          <p className="text-xs text-slate-500">기본 정보·단가·메인 사진(URL 또는 업로드)을 관리자가 직접 수정합니다.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Link href={`/admin/partners/${initial.id}/portfolio`} className="font-medium text-emerald-700 hover:underline">
            포트폴리오
          </Link>
          <Link href="/admin/partners" className="font-medium text-slate-600 hover:underline">
            목록
          </Link>
          <Link href={`/partners/${initial.id}`} className="font-medium text-sky-700 hover:underline" target="_blank">
            공개 페이지
          </Link>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="업체명" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="대표자명" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="연락처" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <input
          value={ownerUserId}
          onChange={(e) => setOwnerUserId(e.target.value)}
          placeholder="Owner 사용자 UUID (선택)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
        />
        <label className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 md:col-span-2">
          <input type="checkbox" checked={businessVerified} onChange={(e) => setBusinessVerified(e.target.checked)} />
          사업자 확인
        </label>
      </div>

      <textarea value={oneLiner} onChange={(e) => setOneLiner(e.target.value)} placeholder="한 줄 소개" className="min-h-[76px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      <textarea value={workScope} onChange={(e) => setWorkScope(e.target.value)} placeholder="작업가능 범위" className="min-h-[88px] w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />

      <div className="grid gap-3 md:grid-cols-2">
        <input value={homepageUrl} onChange={(e) => setHomepageUrl(e.target.value)} placeholder="홈페이지 URL (선택)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={snsUrl} onChange={(e) => setSnsUrl(e.target.value)} placeholder="SNS URL (선택)" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
      </div>

      <PartnerMainImageFields companyId={initial.id} imageUrl={mainImageUrl} onImageUrlChange={setMainImageUrl} />

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
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">부가세 포함 입력</span>
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
        <button disabled={loading} type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-emerald-300">
          {loading ? "저장 중..." : "변경 저장"}
        </button>
        {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </form>
  );
}
