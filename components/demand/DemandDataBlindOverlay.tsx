import type { ReactNode } from "react";
import DemandGuestLoginCta from "@/components/demand/DemandGuestLoginCta";
import { cn } from "@/lib/utils";

type Props = {
  blind: boolean;
  /** true일 때만 짧은 캡션 표시 (블록 1곳용). 표 셀 등은 blur만 */
  showCaption?: boolean;
  /** blur 위 로그인 버튼 (비로그인 지역 데이터) */
  showLoginCta?: boolean;
  message?: string;
  className?: string;
  children: ReactNode;
};

/** 숫자·차트 형태는 유지, 내용은 blur. 캡션은 기본 끔(중복 안내 방지) */
export default function DemandDataBlindOverlay({
  blind,
  showCaption = false,
  showLoginCta = false,
  message,
  className,
  children,
}: Props) {
  if (!blind) return <>{children}</>;

  const ariaLabel = message ?? "로그인 후 확인";

  return (
    <div className={cn("relative min-h-[2rem]", className)}>
      <div className="pointer-events-none select-none blur-[5px] saturate-50" aria-hidden="true">
        {children}
      </div>
      {showLoginCta ? (
        <DemandGuestLoginCta variant="overlay" message={message} />
      ) : showCaption ? (
        <div
          className="absolute inset-0 flex items-center justify-center rounded-md bg-white/40 px-2 backdrop-blur-[1px]"
          role="status"
        >
          <span className="text-center text-xs font-semibold text-slate-600">{ariaLabel}</span>
        </div>
      ) : (
        <div className="absolute inset-0 rounded-md" role="status" aria-label={ariaLabel} />
      )}
    </div>
  );
}

export const DEMAND_PULSE_VALUE_LOCKED = -1;

export function isDemandPulseValueLocked(value: number | null | undefined): boolean {
  return value === DEMAND_PULSE_VALUE_LOCKED;
}
