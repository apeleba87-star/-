"use client";

import { useEffect, useState } from "react";
import { ExternalLink } from "lucide-react";

type Props = {
  href: string;
  label: string;
};

/** 제품 상세 하단 구매 CTA — 아래로 스크롤 시 잠시 숨겨 본문 가림 완화 */
export default function ProductPurchaseBar({ href, label }: Props) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        const goingDown = y > lastY + 4;
        const goingUp = y < lastY - 4;
        if (goingDown && y > 96) setHidden(true);
        else if (goingUp || y < 48) setHidden(false);
        lastY = y;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 transition-transform duration-200 ${
        hidden ? "translate-y-[110%]" : "translate-y-0"
      }`}
    >
      <div className="pointer-events-auto w-full max-w-lg">
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl bg-emerald-800 px-5 text-base font-bold text-white shadow-lg shadow-emerald-900/20 hover:bg-emerald-900"
        >
          {label}
          <ExternalLink className="h-4 w-4 shrink-0" aria-hidden />
        </a>
      </div>
    </div>
  );
}
