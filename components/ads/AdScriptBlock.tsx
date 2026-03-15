"use client";

import { useEffect, useRef } from "react";

type Props = { scriptContent: string; className?: string };

/**
 * 구글/쿠팡 등 외부 광고 스크립트를 삽입하고 실행합니다.
 * dangerouslySetInnerHTML로 넣은 <script>는 실행되지 않으므로, DOM에 주입 후 스크립트만 재생성해 실행합니다.
 */
export default function AdScriptBlock({ scriptContent, className = "" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scriptContent?.trim() || !containerRef.current) return;
    const container = containerRef.current;
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent ?? "";
      }
      oldScript.getAttributeNames().forEach((name) => {
        if (name !== "src") newScript.setAttribute(name, oldScript.getAttribute(name) ?? "");
      });
      container.appendChild(newScript);
      oldScript.remove();
    });
  }, [scriptContent]);

  if (!scriptContent?.trim()) return null;

  return (
    <div
      ref={containerRef}
      className={className}
      aria-label="광고"
      dangerouslySetInnerHTML={{ __html: scriptContent }}
    />
  );
}
