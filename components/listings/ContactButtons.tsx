"use client";

type Props = {
  phone: string;
  /** true면 전화/문자 비활성화 (매칭 완료 후에만 연락 가능 등) */
  disabled?: boolean;
};

export default function ContactButtons({ phone, disabled }: Props) {
  const tel = phone.replace(/\D/g, "");
  const hrefTel = !disabled && tel ? `tel:${tel}` : undefined;
  const hrefSms = !disabled && tel ? `sms:${tel}` : undefined;
  const buttonClass =
    "inline-flex min-h-[48px] min-w-[120px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold";
  const activeTelClass = "bg-emerald-600 text-white shadow-md hover:bg-emerald-700";
  const activeSmsClass = "border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:bg-slate-50";
  const disabledClass = "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {hrefTel != null ? (
        <a href={hrefTel} className={`${buttonClass} ${activeTelClass}`}>
          전화하기
        </a>
      ) : (
        <span
          className={`${buttonClass} ${disabledClass}`}
          title={disabled ? "확정된 지원자만 연락할 수 있습니다." : undefined}
        >
          전화하기
        </span>
      )}
      {hrefSms != null ? (
        <a href={hrefSms} className={`${buttonClass} border border-slate-200 bg-white/80 font-medium text-slate-800 shadow-sm hover:bg-slate-50`}>
          문자하기
        </a>
      ) : (
        <span
          className={`${buttonClass} ${disabledClass}`}
          title={disabled ? "확정된 지원자만 연락할 수 있습니다." : undefined}
        >
          문자하기
        </span>
      )}
      {disabled && (
        <span className="text-xs text-slate-500">매칭 확정 후 연락 가능합니다.</span>
      )}
    </div>
  );
}
