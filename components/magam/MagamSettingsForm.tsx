"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  saveMagamContactPhone,
  setMagamSyncConsent,
  type MagamSettingsBootstrap,
} from "@/app/magam/actions";
import MagamAppPitch from "@/components/magam/MagamAppPitch";
import MagamOpenExternalDevPanel from "@/components/magam/MagamOpenExternalDevPanel";
import MagamPwaInstallSection from "@/components/magam/MagamPwaInstallSection";
import {
  MagamErrorBanner,
  MagamSectionCard,
  magamInputClass,
  magamOutlineBtnClass,
  magamPrimaryBtnClass,
} from "@/components/magam/ui/MagamUi";
import { MAGAM_APP_NAME } from "@/lib/magam/brand";
import {
  MAGAM_HIRING_PHONE_HELPER,
  MAGAM_SYNC_CONSENT_DETAILS,
  MAGAM_SYNC_CONSENT_TITLE,
} from "@/lib/magam/copy";
import { formatMagamPhoneInput } from "@/lib/magam/phone";
import { MAGAM_DEFAULT_AUTH_NEXT } from "@/lib/magam/auth-cookie";
import { showMagamDevTools } from "@/lib/magam/dev-tools";
import { magamLegalHref } from "@/lib/magam/surface";
import { magamKakaoFeedbackUrl } from "@/lib/magam/support";
import { createClient } from "@/lib/supabase";

type Props = { bootstrap: MagamSettingsBootstrap };

export default function MagamSettingsForm({ bootstrap }: Props) {
  const router = useRouter();
  const [phone, setPhone] = useState(
    bootstrap.contactPhone ? formatMagamPhoneInput(bootstrap.contactPhone) : ""
  );
  const [consentGranted, setConsentGranted] = useState(bootstrap.consentGranted);
  const [savingPhone, setSavingPhone] = useState(false);
  const [consentBusy, setConsentBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConsentDetails, setShowConsentDetails] = useState(false);

  async function handleSavePhone() {
    setSavingPhone(true);
    setError(null);
    const result = await saveMagamContactPhone(phone);
    setSavingPhone(false);
    if (!result.ok) setError(result.error);
  }

  async function handleConsentChange(granted: boolean) {
    if (!granted && consentGranted) {
      const ok = window.confirm(
        "철회하면 새 글 등록 시 다시 동의해야 합니다. 기존에 노출된 공고는 서비스 정책에 따라 유지될 수 있습니다."
      );
      if (!ok) return;
    }
    setConsentBusy(true);
    const result = await setMagamSyncConsent(granted);
    setConsentBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setConsentGranted(granted);
    router.refresh();
  }

  async function handleSignOut() {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/login?from=magam&next=${encodeURIComponent(MAGAM_DEFAULT_AUTH_NEXT)}`;
  }

  return (
    <div className="space-y-3">
      {error ? <MagamErrorBanner message={error} /> : null}

      <MagamSectionCard>
        <p className="text-[15px] font-semibold text-[#141824]">계정</p>
        <p className="mt-2 text-[15px] text-[#141824]">{bootstrap.email ?? "로그인됨"}</p>
        <MagamAppPitch dense className="mt-2" />
      </MagamSectionCard>

      <MagamSectionCard>
        <p className="text-[15px] font-semibold text-[#141824]">기본 연락처</p>
        <p className="mt-1 text-[13px] text-[#5B6472]">{MAGAM_HIRING_PHONE_HELPER}</p>
        <input
          type="tel"
          className={`${magamInputClass} mt-3`}
          value={phone}
          onChange={(e) => setPhone(formatMagamPhoneInput(e.target.value))}
          placeholder="010-0000-0000"
        />
        <button
          type="button"
          onClick={handleSavePhone}
          disabled={savingPhone}
          className={`${magamPrimaryBtnClass} mt-3`}
        >
          {savingPhone ? "저장 중…" : "연락처 저장"}
        </button>
      </MagamSectionCard>

      <MagamSectionCard>
        {consentGranted ? (
          <p className="text-sm text-[#141824]">모집 안내 노출에 동의한 상태입니다.</p>
        ) : (
          <>
            <label className="flex cursor-pointer gap-3">
              <input
                type="checkbox"
                className="mt-1 accent-[#2563EB]"
                checked={consentGranted}
                disabled={consentBusy}
                onChange={(e) => handleConsentChange(e.target.checked)}
              />
              <span className="text-sm font-semibold">{MAGAM_SYNC_CONSENT_TITLE}</span>
            </label>
            <button
              type="button"
              className="mt-2 text-xs font-semibold text-[#2563EB]"
              onClick={() => setShowConsentDetails((v) => !v)}
            >
              {showConsentDetails ? "접기" : "내용 보기"}
            </button>
            {showConsentDetails ? (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-[#5B6472]">
                {MAGAM_SYNC_CONSENT_DETAILS.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        {consentGranted ? (
          <button
            type="button"
            className="mt-3 text-sm font-semibold text-[#2563EB]"
            disabled={consentBusy}
            onClick={() => handleConsentChange(false)}
          >
            동의 철회
          </button>
        ) : null}
      </MagamSectionCard>

      <MagamSectionCard>
        <p className="text-[15px] font-semibold text-[#141824]">도움말</p>
        <div className="mt-2 divide-y divide-[#E3E6EC]">
          <MagamPwaInstallSection />
          <a
            href={magamKakaoFeedbackUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex py-3 text-[15px] text-[#141824]"
          >
            버그/건의 하기 <span className="ml-auto text-[#8B93A1]">↗</span>
          </a>
          <Link href={magamLegalHref("/terms")} className="flex py-3 text-[15px] text-[#141824]">
            이용약관 <span className="ml-auto text-[#8B93A1]">↗</span>
          </Link>
          <Link href={magamLegalHref("/privacy")} className="flex py-3 text-[15px] text-[#141824]">
            개인정보 처리방침 <span className="ml-auto text-[#8B93A1]">↗</span>
          </Link>
          <Link href="/magam/support" className="flex py-3 text-[15px] text-[#141824]">
            고객지원 <span className="ml-auto text-[#8B93A1]">↗</span>
          </Link>
        </div>
      </MagamSectionCard>

      {showMagamDevTools() ? <MagamOpenExternalDevPanel /> : null}

      <button
        type="button"
        onClick={handleSignOut}
        className={`${magamOutlineBtnClass} !text-[#DC2626]`}
      >
        로그아웃
      </button>

      <p className="pt-4 text-center text-[13px] text-[#8B93A1]">{MAGAM_APP_NAME}</p>
    </div>
  );
}
