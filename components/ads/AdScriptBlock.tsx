"use client";

import { useEffect, useRef, useState } from "react";
import {
  coupangAdContainerId,
  isCoupangPartnersScript,
  mountCoupangPartnersScript,
  type CoupangReparentHandle,
} from "@/lib/ads/coupang-script-container";

type Props = { scriptContent: string; className?: string; slotKey?: string };

function loadGenericScriptElement(parent: HTMLElement, oldScript: HTMLScriptElement): Promise<void> {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    for (const name of oldScript.getAttributeNames()) {
      if (name !== "src") {
        script.setAttribute(name, oldScript.getAttribute(name) ?? "");
      }
    }
    if (oldScript.src) {
      script.src = oldScript.src;
      script.async = oldScript.async;
      script.onload = () => resolve();
      script.onerror = () => resolve();
      parent.appendChild(script);
    } else {
      script.textContent = oldScript.textContent ?? "";
      parent.appendChild(script);
      resolve();
    }
  });
}

/**
 * 구글/쿠팡 등 외부 광고 스크립트를 삽입하고 실행합니다.
 */
export default function AdScriptBlock({ scriptContent, className = "", slotKey }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const mountId = slotKey ? coupangAdContainerId(slotKey) : undefined;
  const [loadFailed, setLoadFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    const host = hostRef.current;
    if (!scriptContent?.trim()) return;

    let cancelled = false;
    let reparentHandle: CoupangReparentHandle | null = null;
    let failTimer: number | undefined;

    if (mountId && mount && isCoupangPartnersScript(scriptContent)) {
      setLoadFailed(false);

      void (async () => {
        const el = document.getElementById(mountId);
        if (!el || cancelled) return;

        reparentHandle = await mountCoupangPartnersScript(scriptContent, mountId, el);

        failTimer = window.setTimeout(() => {
          if (cancelled) return;
          const hasContent = Boolean(
            el.querySelector("iframe, a[href*='coupang'], img[src*='coupang']")
          );
          if (!hasContent) setLoadFailed(true);
        }, 10000);
      })();

      return () => {
        cancelled = true;
        if (failTimer) window.clearTimeout(failTimer);
        reparentHandle?.disconnect();
        document
          .querySelectorAll(`script[data-coupang-inline="${mountId}"]`)
          .forEach((s) => s.remove());
        if (mount.childElementCount === 0) mount.innerHTML = "";
      };
    }

    if (!host) return;

    const temp = document.createElement("div");
    temp.innerHTML = scriptContent.trim();
    const scriptEls = Array.from(temp.querySelectorAll("script"));

    host.innerHTML = "";

    void (async () => {
      for (const oldScript of scriptEls) {
        if (cancelled) return;
        await loadGenericScriptElement(host, oldScript);
      }
    })();

    return () => {
      cancelled = true;
      host.innerHTML = "";
    };
  }, [scriptContent, mountId]);

  if (!scriptContent?.trim()) return null;

  const isCoupang = isCoupangPartnersScript(scriptContent);

  return (
    <div
      className={`w-full max-w-full ${className}`}
      data-ad-script-host={slotKey ?? undefined}
      aria-label="광고"
    >
      {isCoupang && mountId ? (
        <>
          <div
            ref={mountRef}
            id={mountId}
            className="coupang-partners-slot-root relative min-h-[140px] w-full overflow-visible [&_iframe]:!block [&_iframe]:max-w-full"
          />
          {loadFailed ? (
            <p className="mt-2 text-center text-xs text-slate-400">
              광고를 불러오지 못했습니다. 광고 차단 확장 프로그램을 끄거나, 배포된 HTTPS 주소에서 다시
              확인해 주세요.
            </p>
          ) : null}
        </>
      ) : null}
      {!isCoupang ? <div ref={hostRef} className="min-h-[90px] w-full" /> : null}
    </div>
  );
}
