import Link from "next/link";
import { ArrowRight } from "lucide-react";

const VARIANT_CLASS: Record<"indigo" | "teal" | "slate", string> = {
  indigo:
    "border-indigo-200/80 bg-gradient-to-br from-indigo-50/95 via-white to-violet-50/40 ring-indigo-100/70 hover:border-indigo-300/90 hover:ring-indigo-200/60",
  teal:
    "border-teal-200/80 bg-gradient-to-br from-teal-50/95 via-white to-emerald-50/35 ring-teal-100/70 hover:border-teal-300/90 hover:ring-teal-200/60",
  slate:
    "border-slate-200/80 bg-gradient-to-br from-slate-50/90 via-white to-slate-50/50 ring-slate-100/80 hover:border-slate-300/90 hover:ring-slate-200/70",
};

type Props = {
  situation: string;
  actionLabel: string;
  href: string;
  variant?: keyof typeof VARIANT_CLASS;
  /** 기본: 이어서 확인하기 */
  sectionLabel?: string;
};

export default function ReportNextStep({
  situation,
  actionLabel,
  href,
  variant = "slate",
  sectionLabel = "이어서 확인하기",
}: Props) {
  const label = `${actionLabel}. ${situation}`;
  return (
    <Link
      href={href}
      aria-label={label}
      className={`group mx-auto block max-w-2xl rounded-2xl border p-5 shadow-sm ring-1 transition hover:shadow-md ${VARIANT_CLASS[variant]}`}
    >
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{sectionLabel}</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{situation}</p>
      <p className="mt-3 flex items-center gap-2 text-base font-bold text-slate-900">
        <span className="min-w-0 flex-1">{actionLabel}</span>
        <ArrowRight
          className="h-4 w-4 shrink-0 text-slate-500 transition group-hover:translate-x-0.5 group-hover:text-slate-800"
          aria-hidden
        />
      </p>
    </Link>
  );
}
