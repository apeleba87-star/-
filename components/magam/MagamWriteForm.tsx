"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  createMagamListing,
  type MagamWriteBootstrap,
} from "@/app/magam/actions";
import MagamRegionPicker from "@/components/magam/MagamRegionPicker";
import MagamScheduleDateField from "@/components/magam/MagamScheduleDateField";
import MagamWriteCoachmarks from "@/components/magam/onboarding/MagamWriteCoachmarks";
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
  MAGAM_HIRING_PHONE_HELPER,
  MAGAM_HIRING_SPECIAL_NOTES_HINT,
  MAGAM_HIRING_WORK_HELPER,
  MAGAM_HIRING_WORK_HINT,
  MAGAM_OTHER_WORK_HINT,
  MAGAM_SUBCONTRACT_PHONE_HELPER,
  MAGAM_SUBCONTRACT_SPECIAL_NOTES_HINT,
  MAGAM_SYNC_CONSENT_DETAILS,
  MAGAM_SYNC_CONSENT_TITLE,
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
import { pushMagamRecentRegion } from "@/lib/magam/recent-regions";

const WORK_KINDS = ["move_in_new", "move_out", "ac", "other"] as const;
const AC_TYPES = ["wall", "stand", "two_in_one", "one_two_way", "four_way", "other"] as const;
const SUBCONTRACT_SLOTS = ["morning", "afternoon", "same_day", "flexible"] as const;
const HIRING_SLOTS = ["morning", "afternoon", "same_day"] as const;

function localDateIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function clearHiringQuickDates(iso: string): string {
  const today = localDateIso(new Date());
  const tomorrow = localDateIso(new Date(Date.now() + 86400000));
  return iso === today || iso === tomorrow ? "" : iso;
}

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
        return "기타 청소 내용을 4자 이상 입력해 주세요.";
      }
    }
    if (normalizeMagamPhone(contactPhone).length < 10) return "연락처를 입력해 주세요.";
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
    pushMagamRecentRegion(cityId, districtSlug);
    router.push(`/magam/listing/${result.data!.id}?new=1`);
  }

  const timeSlots = listingType === "hiring" ? HIRING_SLOTS : SUBCONTRACT_SLOTS;

  return (
    <form onSubmit={handleSubmit}>
      <MagamWriteCoachmarks />
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
                  setScheduleDate((prev) => clearHiringQuickDates(prev));
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
        <div>
          <MagamScheduleDateField
            value={scheduleDate}
            onChange={setScheduleDate}
            disabled={loading}
            showTodayTomorrow={listingType !== "hiring"}
          />
        </div>
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
          <div>
            <textarea
              className={`${magamInputClass} min-h-[88px]`}
              disabled={loading}
              placeholder={MAGAM_HIRING_WORK_HINT}
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
            />
            <p className="mt-1.5 text-[13px] text-[#5B6472]">{MAGAM_HIRING_WORK_HELPER}</p>
          </div>
        ) : (
          <>
            <MagamSubLabel>작업 종류</MagamSubLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {WORK_KINDS.map((kind) => (
                <MagamChoiceChip
                  key={kind}
                  selected={workKind === kind}
                  disabled={loading}
                  onClick={() => {
                    if (kind === "other" && workKind === "other") {
                      setWorkKind("");
                      setOtherDetail("");
                      return;
                    }
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
                <MagamFieldLabel htmlFor="pyeong">평형(공급면적)</MagamFieldLabel>
                <div className="mt-2 flex items-center gap-2">
                  <input
                    id="pyeong"
                    type="number"
                    min={1}
                    inputMode="numeric"
                    className={`${magamInputClass} max-w-[140px]`}
                    disabled={loading}
                    value={pyeong}
                    onChange={(e) => setPyeong(e.target.value.replace(/\D/g, ""))}
                  />
                  <span className="text-sm font-medium text-[#5B6472]">평</span>
                </div>
              </div>
            )}
            {workKind === "ac" && (
              <div className="mt-4">
                <MagamSubLabel>에어컨 종류 (복수 선택)</MagamSubLabel>
                <div className="mt-2.5 flex flex-wrap gap-2">
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
              </div>
            )}
            {workKind === "other" && (
              <div className="mt-4">
                <input
                  id="other-detail"
                  className={magamInputClass}
                  disabled={loading}
                  placeholder={MAGAM_OTHER_WORK_HINT}
                  value={otherDetail}
                  onChange={(e) => setOtherDetail(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </>
        )}
      </MagamComposeSection>

      <MagamComposeSection step="5" title={listingType === "hiring" ? "일당" : "얼마"}>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={1}
            inputMode="numeric"
            className={`${magamInputClass} max-w-[140px]`}
            disabled={loading}
            placeholder="13"
            value={priceMan}
            onChange={(e) => setPriceMan(e.target.value.replace(/\D/g, ""))}
          />
          <span className="text-sm font-medium text-[#5B6472]">만원</span>
        </div>
      </MagamComposeSection>

      <MagamComposeSection step="6" title="특이사항">
        <MagamSubLabel>특이사항 (선택)</MagamSubLabel>
        <textarea
          className={`${magamInputClass} mt-2 min-h-[88px]`}
          disabled={loading}
          placeholder={
            listingType === "hiring"
              ? MAGAM_HIRING_SPECIAL_NOTES_HINT
              : MAGAM_SUBCONTRACT_SPECIAL_NOTES_HINT
          }
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
        <p className="mt-1.5 text-[13px] text-[#5B6472]">
          {listingType === "hiring" ? MAGAM_HIRING_PHONE_HELPER : MAGAM_SUBCONTRACT_PHONE_HELPER}
        </p>
      </MagamComposeSection>

      {preview ? <MagamPreviewCard text={preview} /> : null}

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
