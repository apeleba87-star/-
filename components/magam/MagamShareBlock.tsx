"use client";

import { useCallback, useEffect, useState } from "react";

import MagamReferralCopyButton from "@/components/magam/MagamReferralCopyButton";
import { magamOutlineBtnClass } from "@/components/magam/ui/MagamUi";
import {
  MAGAM_GROUP_CHAT_COPY_LABEL,
  MAGAM_GROUP_CHAT_COPY_LOADING,
  MAGAM_KAKAO_SHARE_INCLUDE_PHONE,
  MAGAM_KAKAO_SHARE_INCLUDE_PHONE_HINT,
  MAGAM_NAVER_CAFE_COPY_DONE,
  MAGAM_NAVER_CAFE_COPY_LABEL,
  MAGAM_SHARE_LISTING_SECTION,
  MAGAM_SHARE_REFERRAL_HINT,
  MAGAM_SHARE_REFERRAL_SECTION,
} from "@/lib/magam/copy";
import { magamKakaoShareToast, shareToKakaoTalk } from "@/lib/magam/kakao-share";
import { buildMagamNaverCafeMessage, buildMagamShareMessage } from "@/lib/magam/share-format";
import {
  loadMagamShareIncludePhone,
  saveMagamShareIncludePhone,
} from "@/lib/magam/share-prefs";
import type { MagamListingRow } from "@/lib/magam/types";

type Props = {
  listing: MagamListingRow;
  shareUrl: string;
  highlightShare?: boolean;
};

function ShareSectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2.5">
      <h3 className="text-[15px] font-bold tracking-[-0.2px] text-[#141824]">{title}</h3>
      {hint ? <p className="mt-0.5 text-[13px] leading-relaxed text-[#5B6472]">{hint}</p> : null}
    </div>
  );
}

export default function MagamShareBlock({
  listing,
  shareUrl,
  highlightShare,
}: Props) {
  const isOpen = listing.status === "open";
  const [includePhone, setIncludePhone] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    setIncludePhone(loadMagamShareIncludePhone());
  }, []);

  useEffect(() => {
    if (highlightShare) {
      void navigator.clipboard.writeText(shareUrl).catch(() => {});
    }
  }, [highlightShare, shareUrl]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  const onIncludePhoneChange = (value: boolean) => {
    setIncludePhone(value);
    saveMagamShareIncludePhone(value);
  };

  const handleGroupChatCopy = async () => {
    setCopyLoading(true);
    const text = buildMagamShareMessage(listing, shareUrl, includePhone);
    const { outcome } = await shareToKakaoTalk(text);
    setCopyLoading(false);
    notify(magamKakaoShareToast(outcome));
    if (outcome === "failed") {
      window.prompt("아래 내용을 복사해 카톡에 붙여넣으세요.", text);
    }
  };

  const handleNaverCafe = async () => {
    const text = buildMagamNaverCafeMessage(listing, shareUrl, includePhone);
    try {
      await navigator.clipboard.writeText(text);
      notify(MAGAM_NAVER_CAFE_COPY_DONE);
    } catch {
      window.prompt("아래 내용을 복사해 카페에 붙여넣으세요.", text);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setLinkCopied(true);
      notify(
        highlightShare
          ? "링크가 복사됐어요. 카톡에 붙여넣으세요."
          : `링크 복사: ${shareUrl}`
      );
      window.setTimeout(() => setLinkCopied(false), 3000);
    } catch {
      notify("링크 복사에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      <section>
        <ShareSectionHeader title={MAGAM_SHARE_LISTING_SECTION} />
        <div className="space-y-2.5">
          {isOpen ? (
            <label className="flex cursor-pointer gap-3 rounded-[14px] border-2 border-[#141824] bg-white p-3">
              <input
                type="checkbox"
                className="mt-1 accent-[#2563EB]"
                checked={includePhone}
                disabled={copyLoading}
                onChange={(e) => onIncludePhoneChange(e.target.checked)}
              />
              <span>
                <span className="block text-sm font-semibold text-[#141824]">
                  {MAGAM_KAKAO_SHARE_INCLUDE_PHONE}
                </span>
                <span className="mt-0.5 block text-[13px] text-[#5B6472]">
                  {MAGAM_KAKAO_SHARE_INCLUDE_PHONE_HINT}
                </span>
              </span>
            </label>
          ) : null}

          <button
            type="button"
            onClick={handleGroupChatCopy}
            disabled={copyLoading}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#FEE500] text-base font-bold text-[#191919] disabled:opacity-50"
          >
            {copyLoading ? MAGAM_GROUP_CHAT_COPY_LOADING : MAGAM_GROUP_CHAT_COPY_LABEL}
          </button>

          <button
            type="button"
            onClick={handleNaverCafe}
            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[14px] bg-[#03C75A] text-base font-bold text-white"
          >
            {MAGAM_NAVER_CAFE_COPY_LABEL}
          </button>

          <button type="button" onClick={handleCopyLink} className={magamOutlineBtnClass}>
            {linkCopied
              ? "복사됐어요"
              : highlightShare
                ? "공유 링크 복사"
                : "링크 복사"}
          </button>
        </div>
      </section>

      <section className="rounded-[14px] border border-[#E3E6EC] bg-white p-3.5">
        <ShareSectionHeader
          title={MAGAM_SHARE_REFERRAL_SECTION}
          hint={MAGAM_SHARE_REFERRAL_HINT}
        />
        <MagamReferralCopyButton
          variant={isOpen ? "intro" : "afterClose"}
          onNotify={notify}
          showToast={false}
        />
      </section>

      {toast ? (
        <p className="rounded-[10px] bg-[#141824] px-3 py-2 text-center text-xs text-white">{toast}</p>
      ) : null}
    </div>
  );
}
