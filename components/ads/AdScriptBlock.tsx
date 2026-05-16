"use client";

import { useEffect, useRef } from "react";

type Props = { scriptContent: string; className?: string };

function loadScriptElement(container: HTMLElement, oldScript: HTMLScriptElement): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    for (const name of oldScript.getAttributeNames()) {
      if (name !== "src") {
        script.setAttribute(name, oldScript.getAttribute(name) ?? "");
      }
    }
    if (oldScript.src) {
      script.src = oldScript.src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      container.appendChild(script);
    } else {
      script.textContent = oldScript.textContent ?? "";
      container.appendChild(script);
      resolve();
    }
  });
}

/**
 * 구글/쿠팡 등 외부 광고 스크립트를 삽입하고 실행합니다.
 * 쿠팡 파트너스(g.js + PartnersCoupang.G)처럼 외부 스크립트 로드 후 인라인이 실행되어야 하는 경우 순서를 보장합니다.
 */
export default function AdScriptBlock({ scriptContent, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !scriptContent?.trim()) return;

    const temp = document.createElement("div");
    temp.innerHTML = scriptContent;
    const scriptEls = Array.from(temp.querySelectorAll("script"));

    let cancelled = false;
    container.innerHTML = "";

    void (async () => {
      for (const oldScript of scriptEls) {
        if (cancelled) return;
        await loadScriptElement(container, oldScript);
      }
    })();

    return () => {
      cancelled = true;
      container.innerHTML = "";
    };
  }, [scriptContent]);

  if (!scriptContent?.trim()) return null;

  return (
    <div
      ref={containerRef}
      className={`min-h-[140px] w-full max-w-full overflow-x-auto ${className}`}
      aria-label="광고"
    />
  );
}
