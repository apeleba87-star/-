"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  companyId: string | null;
  imageUrl: string;
  onImageUrlChange: (v: string) => void;
  /** 등록 전(null)이면 파일 업로드 비활성 */
  disabled?: boolean;
};

export default function PartnerMainImageFields({ companyId, imageUrl, onImageUrlChange, disabled }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState<string | null>(null);

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !companyId || disabled) return;
    setUploading(true);
    setUploadErr(null);
    try {
      const fd = new FormData();
      fd.set("company_id", companyId);
      fd.set("file", file);
      const res = await fetch("/api/admin/partner-main-image/upload", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
      if (!res.ok || !data?.ok || !data.url) throw new Error(data?.error ?? "업로드에 실패했습니다.");
      onImageUrlChange(data.url);
      router.refresh();
    } catch (err) {
      setUploadErr(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-slate-800">메인 사진</p>
      <input
        value={imageUrl}
        onChange={(e) => onImageUrlChange(e.target.value)}
        placeholder="이미지 URL (선택)"
        disabled={disabled}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label
          className={`inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 ${!companyId || disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          {uploading ? "업로드 중…" : "파일 업로드 (WebP 최적화)"}
          <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => void onFileChange(e)} disabled={!companyId || Boolean(disabled) || uploading} />
        </label>
        {!companyId ? <span className="text-xs text-slate-500">신규 등록 저장 후 파일 업로드를 사용할 수 있습니다.</span> : null}
      </div>
      {uploadErr ? <p className="text-xs text-rose-600">{uploadErr}</p> : null}
      {imageUrl ? (
        <div className="mt-2 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt="미리보기" className="max-h-40 w-full object-contain" />
        </div>
      ) : null}
    </div>
  );
}
