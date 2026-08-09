"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowDown } from "lucide-react";

type Props = {
  /** 스크롤로 이동할 하단 섹션 id ("다음 글" 목록) */
  targetId?: string;
  /** 버튼 상단 소제목 */
  label?: string;
  /** 이동 대상 글 제목 (버튼에 함께 노출) */
  title?: string;
};

/**
 * 글을 어느 정도 읽어 내려가면 등장하는 "다음 글 보기" 스티키 버튼.
 * 다른 글로 바로 이동하지 않고, 같은 페이지 하단 "다음 글" 목록으로 부드럽게 스크롤한다.
 * 목록이 화면에 들어오면 자동으로 숨긴다. 모바일·PC 공통 하단 중앙 배치.
 */
export default function EduBlogStickyNext({
  targetId = "edu-blog-next-section",
  label = "다음 글 보기",
  title,
}: Props) {
  const [visible, setVisible] = useState(false);
  const targetInView = useRef(false);
  const scrolledEnough = useRef(false);

  useEffect(() => {
    const update = () => setVisible(scrolledEnough.current && !targetInView.current);

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const doc = document.documentElement;
        const scrolled = window.scrollY;
        const max = doc.scrollHeight - window.innerHeight;
        const ratio = max > 0 ? scrolled / max : 0;
        // 한 화면 이상 내렸고 15% 이상 읽었을 때 등장
        scrolledEnough.current = scrolled > 400 && ratio > 0.15;
        update();
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    let observer: IntersectionObserver | null = null;
    const target = document.getElementById(targetId);
    if (target) {
      observer = new IntersectionObserver(
        (entries) => {
          targetInView.current = entries.some((e) => e.isIntersecting);
          update();
        },
        { rootMargin: "0px 0px -10% 0px" }
      );
      observer.observe(target);
    }

    return () => {
      window.removeEventListener("scroll", onScroll);
      observer?.disconnect();
    };
  }, [targetId]);

  const scrollToTarget = () => {
    document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const shortTitle = title && title.length > 18 ? `${title.slice(0, 18)}…` : title;

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 flex justify-center px-3 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-[120%] opacity-0"
      }`}
    >
      <button
        type="button"
        onClick={scrollToTarget}
        tabIndex={visible ? 0 : -1}
        className="flex min-h-[60px] w-full max-w-lg items-center justify-between gap-3 rounded-2xl bg-gradient-to-r from-teal-600 to-emerald-600 px-5 py-3 text-left text-white shadow-lg shadow-emerald-900/25 ring-1 ring-white/20 transition hover:from-teal-500 hover:to-emerald-500"
      >
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="text-xs font-bold uppercase tracking-wide text-teal-50/90">{label}</span>
          {shortTitle ? (
            <span className="truncate text-lg font-extrabold sm:text-xl">{shortTitle}</span>
          ) : null}
        </span>
        <ArrowDown className="h-5 w-5 shrink-0" aria-hidden />
      </button>
    </div>
  );
}
