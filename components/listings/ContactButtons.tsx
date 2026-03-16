"use client";

import { motion } from "framer-motion";

type Props = {
  phone: string;
  /** true면 전화/문자 비활성화 (매칭 완료 후에만 연락 가능 등) */
  disabled?: boolean;
  /** listing detail 페이지용: 그라디언트 + 3D 그림자, h-14 */
  variant?: "default" | "listingDetail";
};

export default function ContactButtons({ phone, disabled, variant = "default" }: Props) {
  const tel = phone.replace(/\D/g, "");
  const hrefTel = !disabled && tel ? `tel:${tel}` : undefined;
  const hrefSms = !disabled && tel ? `sms:${tel}` : undefined;
  const isDetail = variant === "listingDetail";

  const buttonClass = isDetail
    ? "inline-flex min-h-14 min-w-[140px] items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold transition-all duration-200"
    : "inline-flex min-h-[48px] min-w-[120px] items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold";

  const activeTelClass = isDetail
    ? "bg-gradient-to-r from-emerald-600 to-emerald-500 text-white shadow-[0_8px_20px_rgba(5,150,105,0.35)] hover:shadow-[0_12px_28px_rgba(5,150,105,0.4)] hover:scale-[1.02]"
    : "bg-emerald-600 text-white shadow-md hover:bg-emerald-700";

  const activeSmsClass = isDetail
    ? "border-2 border-emerald-500 bg-white font-medium text-emerald-700 hover:bg-emerald-50 hover:border-emerald-600"
    : "border border-slate-200 bg-white/80 text-slate-800 shadow-sm hover:bg-slate-50";

  const disabledClass = "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400";

  const Wrap = isDetail ? motion.div : "div";
  const wrapProps = isDetail ? { whileHover: { scale: 1.02 }, className: "inline-block" } : {};

  return (
    <div className="flex flex-wrap items-center gap-3">
      {hrefTel != null ? (
        <Wrap {...wrapProps}>
          <a href={hrefTel} className={`${buttonClass} ${activeTelClass}`}>
            전화하기
          </a>
        </Wrap>
      ) : (
        <span
          className={`${buttonClass} ${disabledClass}`}
          title={disabled ? "확정된 지원자만 연락할 수 있습니다." : undefined}
        >
          전화하기
        </span>
      )}
      {hrefSms != null ? (
        <Wrap {...wrapProps}>
          <a href={hrefSms} className={`${buttonClass} ${activeSmsClass}`}>
            문자하기
          </a>
        </Wrap>
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
