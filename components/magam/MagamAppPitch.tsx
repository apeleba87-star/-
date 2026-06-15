import { MAGAM_APP_HIGHLIGHTS, MAGAM_APP_TAGLINE } from "@/lib/magam/brand";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  textAlign?: "start" | "center";
  dense?: boolean;
  /** 태그라인만 표시 (불릿 숨김) */
  taglineOnly?: boolean;
  headlineClassName?: string;
  bulletClassName?: string;
};

/** Flutter MagamAppPitch 와 동일 */
export default function MagamAppPitch({
  className = "",
  textAlign = "start",
  dense = false,
  taglineOnly = false,
  headlineClassName,
  bulletClassName,
}: Props) {
  const align = textAlign === "center" ? "text-center items-center" : "text-left items-start";
  const headline =
    headlineClassName ??
    (dense
      ? "text-[13px] text-[#5B6472]"
      : "text-[15px] font-semibold text-[#2563EB]");
  const bullet = bulletClassName ?? "text-[13px] text-[#5B6472]";

  return (
    <div className={cn("flex flex-col", align, className)}>
      <p className={headline}>{MAGAM_APP_TAGLINE}</p>
      {!taglineOnly ? (
        <ul className={cn("mt-2 space-y-1", bullet)}>
          {MAGAM_APP_HIGHLIGHTS.map((line) => (
            <li key={line}>· {line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
