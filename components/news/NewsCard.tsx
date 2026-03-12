import Link from "next/link";
import { Lock, LockOpen, ArrowRight } from "lucide-react";

export type NewsCardBadge = "free" | "premium" | null;

type Props = {
  href: string;
  title: string;
  excerpt?: string | null;
  date: string;
  badge?: NewsCardBadge;
  categoryTag?: string | null;
};

export default function NewsCard({
  href,
  title,
  excerpt,
  date,
  badge = null,
  categoryTag = null,
}: Props) {
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
    >
      {/* 이미지 영역: 그라데이션 플레이스홀더 + 호버 확대 */}
      <div className="relative h-48 overflow-hidden bg-gradient-to-br from-gray-50 via-teal-50/80 to-emerald-50/80">
        <div
          className="absolute inset-0 bg-gradient-to-br from-teal-400/10 to-emerald-500/10 transition-transform duration-300 group-hover:scale-110"
          aria-hidden
        />
        {/* 좌측 하단: 카테고리 태그 */}
        {categoryTag && (
          <span className="absolute bottom-3 left-3 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm">
            {categoryTag}
          </span>
        )}
        {/* 우측 상단: 무료/프리미엄 배지 */}
        {badge && (
          <span
            className={`absolute right-3 top-3 flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold shadow-sm backdrop-blur-sm ${
              badge === "free"
                ? "bg-emerald-500/90 text-white"
                : "bg-amber-500/90 text-white"
            }`}
          >
            {badge === "free" ? (
              <>
                <LockOpen className="h-3.5 w-3.5" aria-hidden />
                무료
              </>
            ) : (
              <>
                <Lock className="h-3.5 w-3.5" aria-hidden />
                구독
              </>
            )}
          </span>
        )}
      </div>

      {/* 콘텐츠 영역 */}
      <div className="flex flex-1 flex-col p-4">
        <h2 className="line-clamp-2 font-bold text-slate-800 transition-colors duration-300 group-hover:text-teal-700">
          {title}
        </h2>
        {excerpt && (
          <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
            {excerpt}
          </p>
        )}
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
          <time className="text-xs text-slate-500">{date}</time>
          <span className="flex items-center gap-0.5 text-sm font-medium text-teal-600 transition-all duration-300 group-hover:gap-1.5">
            자세히 보기
            <ArrowRight className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>
    </Link>
  );
}
