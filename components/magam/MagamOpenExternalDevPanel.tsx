"use client";

import { useCallback, useEffect, useState } from "react";

import { magamOutlineBtnClass } from "@/components/magam/ui/MagamUi";
import { magamTapClass } from "@/components/magam/ui/MagamTouchNav";
import { detectInAppBrowser, isAndroidUserAgent, isIosUserAgent } from "@/lib/kakao/in-app-browser";
import {
  describeOpenExternalPlan,
  openInExternalBrowser,
  type OpenExternalBrowserResult,
} from "@/lib/kakao/open-external-browser";
import { cn } from "@/lib/utils";

type DevPanelEnv = {
  url: string;
  ua: string;
  inApp: { isInAppBrowser: boolean; browserName: string | null };
  platform: string;
  plan: ReturnType<typeof describeOpenExternalPlan>;
};

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function readDevPanelEnv(): DevPanelEnv {
  const ua = navigator.userAgent;
  const url = window.location.href;
  const inApp = detectInAppBrowser(ua);
  const platform = isIosUserAgent(ua) ? "iOS" : isAndroidUserAgent(ua) ? "Android" : "기타";

  return {
    url,
    ua,
    inApp,
    platform,
    plan: describeOpenExternalPlan(url, ua),
  };
}

export default function MagamOpenExternalDevPanel() {
  const [env, setEnv] = useState<DevPanelEnv | null>(null);
  const [result, setResult] = useState<OpenExternalBrowserResult | null>(null);
  const [copyNote, setCopyNote] = useState<string | null>(null);

  useEffect(() => {
    setEnv(readDevPanelEnv());
  }, []);

  const handleOpen = useCallback(() => {
    const next = openInExternalBrowser();
    setResult(next);
    setCopyNote(null);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (!env) return;
    const ok = await copyText(env.url);
    setCopyNote(ok ? "현재 URL을 복사했습니다." : "URL 복사에 실패했습니다.");
  }, [env]);

  return (
    <section className="rounded-[18px] border border-dashed border-[#D6E4FF] bg-[#EEF3FF] p-4">
      <p className="text-[13px] font-semibold text-[#2563EB]">개발 테스트 · 외부 브라우저</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[#5B6472]">
        카톡 인앱에서 Safari/Chrome이 열리는지 확인용입니다. 배포 검증 후 제거하거나 env로 숨깁니다.
      </p>

      <dl className="mt-3 space-y-1.5 text-[11px] leading-relaxed text-[#5B6472]">
        <div>
          <dt className="font-semibold text-[#141824]">플랫폼</dt>
          <dd>{env?.platform ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#141824]">인앱 감지</dt>
          <dd>
            {!env
              ? "—"
              : env.inApp.isInAppBrowser
                ? `예 (${env.inApp.browserName ?? "unknown"})`
                : "아니오 (일반 브라우저)"}
          </dd>
        </div>
        <div>
          <dt className="font-semibold text-[#141824]">예정 방식</dt>
          <dd className="break-all">{env?.plan.method ?? "—"}</dd>
        </div>
        <div>
          <dt className="font-semibold text-[#141824]">User-Agent</dt>
          <dd className="break-all">{env?.ua || "—"}</dd>
        </div>
      </dl>

      <div className="mt-3 space-y-2">
        <button
          type="button"
          onClick={handleOpen}
          className={cn(magamTapClass, magamOutlineBtnClass, "!border-[#2563EB] !text-[#2563EB]")}
        >
          Safari/Chrome에서 열기 (테스트)
        </button>
        <button type="button" onClick={() => void handleCopyUrl()} className={magamOutlineBtnClass}>
          현재 URL 복사
        </button>
      </div>

      {result ? (
        <p
          className={cn(
            "mt-3 rounded-[10px] px-3 py-2 text-[12px] leading-relaxed",
            result.ok ? "bg-[#ECFDF5] text-[#059669]" : "bg-[#FEF2F2] text-[#DC2626]"
          )}
        >
          {result.ok ? "시도함" : "실패"} · {result.method}
          <br />
          {result.detail}
        </p>
      ) : null}

      {copyNote ? <p className="mt-2 text-center text-[12px] text-[#5B6472]">{copyNote}</p> : null}
    </section>
  );
}
