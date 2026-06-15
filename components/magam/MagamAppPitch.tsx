import { MAGAM_APP_HIGHLIGHTS, MAGAM_APP_TAGLINE } from "@/lib/magam/brand";

type Props = {
  className?: string;
  headlineClassName?: string;
  bulletClassName?: string;
};

/** 마감링크 헤드라인 + 3줄 설명 */
export default function MagamAppPitch({
  className = "",
  headlineClassName = "text-sm leading-relaxed text-slate-600",
  bulletClassName = "text-sm text-slate-600",
}: Props) {
  return (
    <div className={className}>
      <p className={headlineClassName}>{MAGAM_APP_TAGLINE}</p>
      <ul className={`mt-2 space-y-1 ${bulletClassName}`}>
        {MAGAM_APP_HIGHLIGHTS.map((line) => (
          <li key={line} className="flex gap-2">
            <span aria-hidden className="text-slate-400">
              ·
            </span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
