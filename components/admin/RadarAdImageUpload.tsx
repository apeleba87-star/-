"use client";

import { cn } from "@/lib/utils";

export type RadarAdImageUploadStatus = "idle" | "uploading" | "success" | "error";

type Props = {
  imageUrl: string | null;
  status: RadarAdImageUploadStatus;
  errorMessage: string | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
};

export default function RadarAdImageUpload({
  imageUrl,
  status,
  errorMessage,
  onUpload,
  onRemove,
}: Props) {
  const uploading = status === "uploading";
  const showSuccess = status === "success" && Boolean(imageUrl);
  const showError = status === "error";

  return (
    <div className="sm:col-span-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-700">이미지</span>
        {showSuccess ? (
          <span className="text-xs font-medium text-emerald-700">✓ 업로드 완료</span>
        ) : uploading ? (
          <span className="text-xs font-medium text-teal-700">업로드 중…</span>
        ) : showError ? (
          <span className="text-xs font-medium text-red-600">업로드 실패</span>
        ) : imageUrl ? (
          <span className="text-xs text-slate-500">등록됨</span>
        ) : null}
      </div>

      <label
        className={cn(
          "relative mt-1 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 transition-colors",
          uploading && "border-teal-400 bg-teal-50/40",
          showSuccess && "border-emerald-400 bg-emerald-50/30",
          showError && "border-red-300 bg-red-50/40",
          !uploading && !showSuccess && !showError && "border-slate-200 bg-slate-50/50 hover:border-teal-300 hover:bg-teal-50/30"
        )}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2 py-2">
            <span className="h-8 w-8 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
            <p className="text-sm font-medium text-teal-800">이미지 업로드 중…</p>
          </div>
        ) : imageUrl ? (
          <div className="flex w-full flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt="" className="max-h-32 rounded-lg object-contain shadow-sm" />
            <p className="text-xs text-slate-500">클릭하여 이미지 변경</p>
          </div>
        ) : (
          <div className="py-2 text-center">
            <p className="text-sm text-slate-600">클릭하여 이미지 업로드</p>
            <p className="mt-1 text-xs text-slate-400">JPG · PNG · WebP · 500KB 이하</p>
          </div>
        )}

        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          disabled={uploading}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
            e.target.value = "";
          }}
        />
      </label>

      {showError && errorMessage ? (
        <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {errorMessage}
        </p>
      ) : null}

      {imageUrl && !uploading ? (
        <button
          type="button"
          onClick={onRemove}
          className="mt-2 text-xs text-slate-500 underline hover:text-slate-800"
        >
          이미지 제거
        </button>
      ) : null}
    </div>
  );
}
