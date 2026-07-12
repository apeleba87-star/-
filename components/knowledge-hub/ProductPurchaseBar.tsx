import { ExternalLink } from "lucide-react";

type Props = {
  href: string;
  label: string;
};

/** 제품 상세 하단 고정 구매 CTA */
export default function ProductPurchaseBar({ href, label }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
      <div className="pointer-events-auto w-full max-w-lg">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 text-base font-bold text-white shadow-lg shadow-emerald-900/25 hover:bg-emerald-900"
        >
          {label}
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        </a>
      </div>
    </div>
  );
}
