import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  variant?: "inline" | "bar";
};

/** 배너 근처 → 광고 문의 페이지 */
export default function RadarAdInquiryLink({ className, variant = "inline" }: Props) {
  if (variant === "bar") {
    return (
      <div
        className={cn(
          "flex items-center justify-center border-t border-slate-200/90 bg-slate-50/90 py-2",
          className
        )}
      >
        <Link
          href="/advertise#inquiry"
          className="text-xs font-medium text-slate-600 hover:text-teal-700"
        >
          이 자리 배너 광고 문의 →
        </Link>
      </div>
    );
  }

  return (
    <p className={cn("text-center", className)}>
      <Link href="/advertise" className="text-xs font-medium text-slate-500 hover:text-teal-700">
        배너 광고 문의 · 노출 지면 안내
      </Link>
    </p>
  );
}
