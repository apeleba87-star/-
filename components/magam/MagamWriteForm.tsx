"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createMagamListing,
  type MagamWriteBootstrap,
} from "@/app/magam/actions";
import MagamRegionPicker from "@/components/magam/MagamRegionPicker";
import {
  MagamRadarNationalBanner,
  MagamRadarRegionalBanner,
} from "@/components/magam/MagamRadarAdBanner";
import {
  MagamChoiceChip,
  MagamComposeSection,
  MagamErrorBanner,
  MagamFieldLabel,
  MagamPreviewCard,
  MagamSubLabel,
  magamInputClass,
  magamPrimaryBtnClass,
} from "@/components/magam/ui/MagamUi";
import {
  MAGAM_AC_TYPE_LABEL,
  MAGAM_SYNC_CONSENT_DETAILS,
  MAGAM_SYNC_CONSENT_TITLE,
  MAGAM_TERMS_CONSENT_HINT,
  MAGAM_TERMS_CONSENT_REQUIRED,
  MAGAM_TIME_SLOT_LABEL,
  MAGAM_WORK_KIND_LABEL,
} from "@/lib/magam/copy";
import {
  buildMagamPreviewLine,
  parseMagamPriceManInput,
} from "@/lib/magam/listing-draft";
import { formatMagamPhoneInput, normalizeMagamPhone } from "@/lib/magam/phone";
import { MAGAM_DEFAULT_CITY_ID, magamDefaultDistrictSlug } from "@/lib/magam/regions";
import { magamRegionalAdCandidateKeys } from "@/lib/magam/region-ad-keys";
import { magamLegalHref } from "@/lib/magam/surface";

const WORK_KINDS = ["move_in_new", "move_out", "ac", "other"] as const;
const AC_TYPES = ["wall", "stand", "two_in_one", "one_two_way", "four_way", "other"] as const;
const SUBCONTRACT_SLOTS = ["morning", "afternoon", "same_day", "flexible"] as const;
const HIRING_SLOTS = ["morning", "afternoon", "same_day"] as const;

type Props = { bootstrap: MagamWriteBootstrap };

export default function MagamWriteForm({ bootstrap }: Props) {
  const router = useRouter();
  const [listingType, setListingType] = useState<"subcontract" | "hiring">("subcontract");
  const [cityId, setCityId] = useState(MAGAM_DEFAULT_CITY_ID);
  const [districtSlug, setDistrictSlug] = useState(magamDefaultDistrictSlug(MAGAM_DEFAULT_CITY_ID));
  const [scheduleDate, setScheduleDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("");
  const [workKind, setWorkKind] = useState("");
  const [pyeong, setPyeong] = useState("");
  const [acTypes, setAcTypes] = useState<string[]>([]);
  const [otherDetail, setOtherDetail] = useState("");
  const [workDescription, setWorkDescription] = useState("");
  const [priceMan, setPriceMan] = useState("");
  const [specialNotes, setSpecialNotes] = useState("");
  const [contactPhone, setContactPhone] = useState(
    bootstrap.contactPhone ? formatMagamPhoneInput(bootstrap.contactPhone) : ""
  );
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [disclosed, setDisclosed] = useState(bootstrap.alreadyConsented);
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const preview = useMemo(() => {
    if (listingType === "hiring" && !workDescription.trim()) return null;
    if (listingType === "subcontract" && !workKind) return null;
    return buildMagamPreviewLine({
      listingType,
      cityId,
      districtSlug,
      workKind: listingType === "hiring" ? null : workKind,
      workDescription: listingType === "hiring" ? workDescription : null,
      scheduleDate: scheduleDate || null,
      timeSlot: timeSlot || null,
      pyeong: pyeong ? Number.parseInt(pyeong, 10) : null,
      acTypes,
      otherDetail,
      specialNotes,
      priceAmount: parseMagamPriceManInput(priceMan),
      priceUnit: "man",
    });
  }, [
    listingType, cityId, districtSlug, workKind, workDescription, scheduleDate, timeSlot,
    pyeong, acTypes, otherDetail, specialNotes, priceMan,
  ]);

  function validate(): string | null {
    if (listingType === "hiring") {
      if (workDescription.trim().length < 2) return "작업내용을 2자 이상 입력해 주세요.";
    } else {
      if (!workKind) return "작업 종류를 선택해 주세요.";
      if ((workKind === "move_in_new" || workKind === "move_out") && (!pyeong || Number(pyeong) <= 0)) {
        return "평형을 입력해 주세요.";
      }
      if (workKind === "ac" && acTypes.length === 0) return "에어컨 종류를 하나 이상 선택해 주세요.";
      if (workKind === "other" && otherDetail.trim().length < 4) {
        return "어떤 청소인지 4자 이상 입력해 주세요.";
      }
    }
    if (normalizeMagamPhone(contactPhone).length < 10) return "연락처를 입력해 주세요.";
    if (!termsAccepted) return MAGAM_TERMS_CONSENT_REQUIRED;
    if (!disclosed) return "「모집 안내 노출 동의」에 체크해야 글을 올릴 수 있습니다.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await createMagamListing({
      listingType,
      cityId,
      districtSlug,
      workKind: listingType === "hiring" ? null : workKind,
      workDescription: listingType === "hiring" ? workDescription.trim() : null,
      scheduleDate: scheduleDate || null,
      timeSlot: timeSlot || null,
      pyeong: pyeong ? Number.parseInt(pyeong, 10) : null,
      acTypes,
      otherDetail: otherDetail.trim() || null,
      specialNotes: specialNotes.trim() || null,
      priceAmount: parseMagamPriceManInput(priceMan),
      priceUnit: "man",
      contactPhone,
      linkedServiceDisclosed: disclosed,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.push(`/magam/listing/${result.data!.id}?new=1`);
  }

  const timeSlots = listingType === "hiring" ? HIRING_SLOTS : SUBCONTRACT_SLOTS;

  return (
    <form onSubmit={handleSubmit}>
      <MagamRadarNationalBanner pagePath="magam:compose" className="mb-4" />
      <MagamComposeSection step="1" title="도급 / 구인">
        <div className="flex flex-wrap gap-2">
          {(["subcontract", "hiring"] as const).map((type) => (
            <MagamChoiceChip
              key={type}
              selected={listingType === type}
              disabled={loading}
              onClick={() => {
                setListingType(type);
                if (type === "hiring") {
                  setWorkKind("");
                  setAcTypes([]);
                  setPyeong("");
                  setOtherDetail("");
                  if (timeSlot === "flexible") setTimeSlot("");
                } else {
                  setWorkDescription("");
                }
              }}
            >
              {type === "subcontract" ? "도급" : "구인"}
            </MagamChoiceChip>
          ))}
        </div>
      </MagamComposeSection>

      <MagamComposeSection step="2" title="언제">
        <MagamFieldLabel htmlFor="schedule-date">일정 (선택)</MagamFieldLabel>
        <input
          id="schedule-date"
          type="date"
          className={magamInputClass}
          disabled={loading}
          value={scheduleDate}
          onChange={(e) => setScheduleDate(e.target.value)}
        />
        <div className="mt-4">
          <MagamSubLabel>시간대 (선택)</MagamSubLabel>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {timeSlots.map((slot) => (
              <MagamChoiceChip
                key={slot}
                selected={timeSlot === slot}
                disabled={loading}
                onClick={() => setTimeSlot(timeSlot === slot ? "" : slot)}
              >
                {MAGAM_TIME_SLOT_LABEL[slot]}
              </MagamChoiceChip>
            ))}
          </div>
        </div>
      </MagamComposeSection>

      <MagamComposeSection step="3" title="어디">
        <MagamRegionPicker
          cityId={cityId}
          districtSlug={districtSlug}
          disabled={loading}
          onCityChange={setCityId}
          onDistrictChange={setDistrictSlug}
        />
      </MagamComposeSection>

      <MagamRadarRegionalBanner
        regionKeys={magamRegionalAdCandidateKeys(cityId, districtSlug)}
        pagePath="magam:compose"
        className="mb-4"
      />

      <MagamComposeSection step="4" title={listingType === "hiring" ? "작업내용" : "어떤 일"}>
        {listingType === "hiring" ? (
          <textarea
            className={`${magamInputClass} min-h-[88px]`}
            disabled={loading}
            placeholder="예) 입주청소, 후드청소, 준공청소"
            value={workDescription}
            onChange={(e) => setWorkDescription(e.target.value)}
          />
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              {WORK_KINDS.map((kind) => (
                <MagamChoiceChip
                  key={kind}
                  selected={workKind === kind}
                  disabled={loading}
                  onClick={() => {
                    setWorkKind(kind);
                    if (kind !== "ac") setAcTypes([]);
                    if (kind !== "move_in_new" && kind !== "move_out") setPyeong("");
                    if (kind !== "other") setOtherDetail("");
                  }}
                >
                  {MAGAM_WORK_KIND_LABEL[kind]}
                </MagamChoiceChip>
              ))}
            </div>
            {(workKind === "move_in_new" || workKind === "move_out") && (
              <div className="mt-4">
                <MagamFieldLabel htmlFor="pyeong">평형</MagamFieldLabel>
                <input
                  id="pyeong"
                  type="number"
                  min={1}
                  className={magamInputClass}
                  disabled={loading}
                  value={pyeong}
                  onChange={(e) => setPyeong(e.target.value)}
                />
              </div>
            )}
            {workKind === "ac" && (
              <div className="mt-4 flex flex-wrap gap-2">
                {AC_TYPES.map((t) => (
                  <MagamChoiceChip
                    key={t}
                    selected={acTypes.includes(t)}
                    disabled={loading}
                    onClick={() =>
                      setAcTypes((prev) =>
                        prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
                      )
                    }
                  >
                    {MAGAM_AC_TYPE_LABEL[t]}
                  </MagamChoiceChip>
                ))}
              </div>
            )}
            {workKind === "other" && (
              <input
                className={`${magamInputClass} mt-4`}
                disabled={loading}
                placeholder="어떤 청소인지 적어 주세요"
                value={otherDetail}
                onChange={(e) => setOtherDetail(e.target.value)}
              />
            )}
          </>
        )}
      </MagamComposeSection>

      <MagamComposeSection step="5" title={listingType === "hiring" ? "일당" : "얼마"}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            className={`${magamInputClass} max-w-[140px]`}
            disabled={loading}
            placeholder={listingType === "hiring" ? "13" : "50"}
            value={priceMan}
            onChange={(e) => setPriceMan(e.target.value)}
          />
          <span className="text-sm text-[#5B6472]">만원 (선택)</span>
        </div>
      </MagamComposeSection>

      <MagamComposeSection step="6" title="특이사항">
        <textarea
          className={`${magamInputClass} min-h-[72px]`}
          disabled={loading}
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
        />
      </MagamComposeSection>

      <MagamComposeSection step="7" title="연락처">
        <input
          type="tel"
          className={magamInputClass}
          disabled={loading}
          placeholder="010-0000-0000"
          value={contactPhone}
          onChange={(e) => setContactPhone(formatMagamPhoneInput(e.target.value))}
        />
      </MagamComposeSection>

      {preview ? <MagamPreviewCard text={preview} /> : null}

      <MagamSectionCardLike>
        <label className="flex cursor-pointer gap-3">
          <input
            type="checkbox"
            className="mt-1 accent-[#2563EB]"
            checked={termsAccepted}
            disabled={loading}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span className="text-sm text-[#141824]">
            <Link href={magamLegalHref("/terms")} className="font-semibold text-[#2563EB] underline">
              이용약관
            </Link>
            에 동의합니다
            <span className="mt-1 block text-xs text-[#8B93A1]">{MAGAM_TERMS_CONSENT_HINT}</span>
          </span>
        </label>
      </MagamSectionCardLike>

      {bootstrap.alreadyConsented ? (
        <p className="mb-3 rounded-[14px] border border-[#D6E4FF] bg-[#EEF3FF] px-4 py-3 text-sm text-[#141824]">
          모집 안내 노출에 동의한 상태입니다.
        </p>
      ) : (
        <MagamSectionCardLike>
          <label className="flex cursor-pointer gap-3">
            <input
              type="checkbox"
              className="mt-1 accent-[#2563EB]"
              checked={disclosed}
              disabled={loading}
              onChange={(e) => setDisclosed(e.target.checked)}
            />
            <span className="text-sm font-semibold text-[#141824]">{MAGAM_SYNC_CONSENT_TITLE}</span>
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
        </MagamSectionCardLike>
      )}

      {error ? <MagamErrorBanner message={error} /> : null}

      <button type="submit" disabled={loading} className={magamPrimaryBtnClass}>
        {loading ? "등록 중…" : "등록하고 링크 받기"}
      </button>
    </form>
  );
}

function MagamSectionCardLike({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-3 rounded-[18px] border border-[#E3E6EC] bg-white p-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
      {children}
    </div>
  );
}
