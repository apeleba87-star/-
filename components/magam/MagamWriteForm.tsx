"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import {
  checkMagamDisplayNameAvailable,
  createMagamListing,
  updateMagamListing,
  type MagamWriteBootstrap,
} from "@/app/magam/actions";
import MagamScheduleDateField from "@/components/magam/MagamScheduleDateField";
import MagamTradeComposeFields from "@/components/magam/MagamTradeComposeFields";
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
  MAGAM_HIRING_FULL_TIME_WORK_HELPER,
  MAGAM_HIRING_FULL_TIME_WORK_HINT,
  MAGAM_HIRING_PHONE_HELPER,
  MAGAM_HIRING_SPECIAL_NOTES_HINT,
  MAGAM_HIRING_WORK_HELPER,
  MAGAM_HIRING_WORK_HINT,
  MAGAM_OTHER_WORK_HINT,
  MAGAM_REGULAR_SUBCONTRACT_DETAIL_HINT,
  MAGAM_SUBCONTRACT_PHONE_HELPER,
  MAGAM_SUBCONTRACT_SPECIAL_NOTES_HINT,
  MAGAM_TRADE_PHONE_HELPER,
  MAGAM_TRADE_REGION_DETAIL_REF,
  MAGAM_TRADE_REGION_HELPER,
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
import type { MagamTradeSide } from "@/lib/magam/trade";
import type { MagamListingRow } from "@/lib/magam/types";

const MagamRegionPicker = dynamic(() => import("@/components/magam/MagamRegionPicker"), {
  loading: () => (
    <div
      className="h-28 animate-pulse rounded-[14px] bg-[#F2F3F6]"
      aria-hidden
    />
  ),
});
const MagamWriteCoachmarks = dynamic(
  () => import("@/components/magam/onboarding/MagamWriteCoachmarks"),
  { loading: () => null }
);
const MagamRadarNationalBanner = dynamic(
  () =>
    import("@/components/magam/MagamRadarAdBanner").then((m) => ({
      default: m.MagamRadarNationalBanner,
    })),
  { loading: () => null }
);
const MagamRadarRegionalBanner = dynamic(
  () =>
    import("@/components/magam/MagamRadarAdBanner").then((m) => ({
      default: m.MagamRadarRegionalBanner,
    })),
  { loading: () => null }
);

const WORK_KINDS = ["move_in_new", "move_out", "ac", "other"] as const;
const SUBCONTRACT_KINDS = ["one_time", "regular"] as const;
type SubcontractKind = (typeof SUBCONTRACT_KINDS)[number];
const SUBCONTRACT_KIND_LABEL: Record<SubcontractKind, string> = {
  one_time: "1회성",
  regular: "정기청소",
};
const REGULAR_WORK_KINDS = [
  "office",
  "store",
  "clinic_academy",
  "villa_common",
  "factory_warehouse",
  "other",
] as const;
const AC_TYPES = ["wall", "stand", "two_in_one", "one_two_way", "four_way", "other"] as const;
const SUBCONTRACT_SLOTS = ["morning", "afternoon", "same_day", "flexible"] as const;
const HIRING_SLOTS = ["morning", "afternoon", "same_day"] as const;
const HIRING_EMPLOYMENT_TYPES = ["daily", "full_time"] as const;
type HiringEmploymentType = (typeof HIRING_EMPLOYMENT_TYPES)[number];
const HIRING_EMPLOYMENT_LABEL: Record<HiringEmploymentType, string> = {
  daily: "일당",
  full_time: "정규직",
};

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

type Props = {
  bootstrap: MagamWriteBootstrap;
  initialListing?: MagamListingRow;
};

function manInputFromWon(value?: number | null): string {
  return value != null && value > 0 ? String(Math.floor(value / 10_000)) : "";
}

function parseHiringWorkFromBody(listing?: MagamListingRow): string {
  if (!listing || listing.listing_type !== "hiring") return "";
  let rest = listing.body_text.trim();
  if (rest.startsWith("구인 · ")) rest = rest.slice("구인 · ".length);
  else if (rest.startsWith("구인·")) rest = rest.slice("구인·".length).trim();
  else if (rest.startsWith("일당 구인 · ")) rest = rest.slice("일당 구인 · ".length);
  else if (rest.startsWith("정규직 구인 · ")) rest = rest.slice("정규직 구인 · ".length);

  const segments = rest.split(" · ").map((s) => s.trim()).filter(Boolean);
  const parts: string[] = [];
  for (const seg of segments) {
    if (
      /^일당\s/.test(seg) ||
      /^월급\s/.test(seg) ||
      /^급여\s/.test(seg) ||
      /^\d+만원$/.test(seg) ||
      /^잔\s/.test(seg)
    ) {
      break;
    }
    if (seg === "일당" || seg === "정규직") continue;
    parts.push(seg);
  }
  const parsed = parts.join(" · ");
  const notes = listing.hiring_employment_type === "full_time" ? listing.special_notes?.trim() : "";
  if (!notes) return parsed;
  return parsed ? `${parsed}\n${notes}` : notes;
}

function parseOtherDetailFromBody(listing?: MagamListingRow): string {
  if (!listing || listing.listing_type !== "subcontract" || listing.work_kind !== "other") return "";
  const otherLabel = MAGAM_WORK_KIND_LABEL.other;
  const ignored = new Set([
    "도급",
    "정기청소",
    "면적 상세 설명 참조",
    listing.schedule_text?.trim() ?? "",
    listing.price_text?.trim() ?? "",
    otherLabel,
  ]);
  const segments = listing.body_text.split(" · ").map((s) => s.trim()).filter(Boolean);
  const detail = segments.find((seg) => !ignored.has(seg) && !/^주\s*\d+회$/.test(seg) && !/^\d+평$/.test(seg));
  return detail ?? "";
}

export default function MagamWriteForm({ bootstrap, initialListing }: Props) {
  const router = useRouter();
  const isEdit = Boolean(initialListing);
  const initialCityId = initialListing?.city_id || MAGAM_DEFAULT_CITY_ID;
  const [listingType, setListingType] = useState<"subcontract" | "hiring" | "trade">(
    initialListing?.listing_type ?? "subcontract"
  );
  const [subcontractKind, setSubcontractKind] = useState<SubcontractKind>(
    initialListing?.listing_type === "subcontract" && initialListing.subcontract_kind === "regular"
      ? "regular"
      : "one_time"
  );
  const [cityId, setCityId] = useState(initialCityId);
  const [districtSlug, setDistrictSlug] = useState(
    initialListing?.district_slug || magamDefaultDistrictSlug(initialCityId)
  );
  const [scheduleDate, setScheduleDate] = useState(initialListing?.schedule_date ?? "");
  const [timeSlot, setTimeSlot] = useState(initialListing?.time_slot ?? "");
  const [workKind, setWorkKind] = useState(initialListing?.work_kind ?? "");
  const [pyeong, setPyeong] = useState(
    initialListing?.pyeong != null ? String(initialListing.pyeong) : ""
  );
  const [acTypes, setAcTypes] = useState<string[]>(initialListing?.ac_types ?? []);
  const [otherDetail, setOtherDetail] = useState(parseOtherDetailFromBody(initialListing));
  const [workDescription, setWorkDescription] = useState(parseHiringWorkFromBody(initialListing));
  const [hiringEmploymentType, setHiringEmploymentType] = useState<HiringEmploymentType>(
    initialListing?.hiring_employment_type === "full_time" ? "full_time" : "daily"
  );
  const [priceMan, setPriceMan] = useState(
    initialListing?.listing_type === "trade" ? "" : manInputFromWon(initialListing?.price_amount)
  );
  const [priceNegotiable, setPriceNegotiable] = useState(Boolean(initialListing?.price_negotiable));
  const [tradeSide, setTradeSide] = useState<MagamTradeSide | "">(
    initialListing?.trade_side === "sell" || initialListing?.trade_side === "buy"
      ? initialListing.trade_side
      : ""
  );
  const [tradeClientCount, setTradeClientCount] = useState(
    initialListing?.trade_client_count != null ? String(initialListing.trade_client_count) : ""
  );
  const [tradeTotalRevenueMan, setTradeTotalRevenueMan] = useState(
    manInputFromWon(initialListing?.trade_total_revenue)
  );
  const [salePriceMan, setSalePriceMan] = useState(
    initialListing?.listing_type === "trade" ? manInputFromWon(initialListing?.price_amount) : ""
  );
  const [tradeRegionsInDetail, setTradeRegionsInDetail] = useState(
    Boolean(initialListing?.trade_regions_in_detail)
  );
  const [regularFrequencyCount, setRegularFrequencyCount] = useState(
    initialListing?.regular_frequency_count != null ? String(initialListing.regular_frequency_count) : ""
  );
  const [regularFrequencyNegotiable, setRegularFrequencyNegotiable] = useState(
    Boolean(initialListing?.regular_frequency_negotiable)
  );
  const [regularAreaInDetail, setRegularAreaInDetail] = useState(
    Boolean(initialListing?.regular_area_in_detail)
  );
  const [specialNotes, setSpecialNotes] = useState(initialListing?.special_notes ?? "");
  const [posterName, setPosterName] = useState(
    bootstrap.isOperator
      ? initialListing?.poster_name?.trim() || bootstrap.displayName || ""
      : bootstrap.displayName || initialListing?.poster_name?.trim() || ""
  );
  const [posterNameCheck, setPosterNameCheck] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [checkedPosterName, setCheckedPosterName] = useState("");
  const [contactPhone, setContactPhone] = useState(
    initialListing?.contact_phone
      ? formatMagamPhoneInput(initialListing.contact_phone)
      : bootstrap.contactPhone
        ? formatMagamPhoneInput(bootstrap.contactPhone)
        : ""
  );
  const [disclosed, setDisclosed] = useState(
    Boolean(initialListing?.linked_service_disclosed || bootstrap.alreadyConsented)
  );
  const [showConsentDetails, setShowConsentDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFullTimeHiring = listingType === "hiring" && hiringEmploymentType === "full_time";
  const isRegularSubcontract = listingType === "subcontract" && subcontractKind === "regular";
  const isPosterNameLocked = !bootstrap.isOperator && Boolean(bootstrap.displayNameLockedUntil);
  const posterNameUnlockLabel = bootstrap.displayNameLockedUntil
    ? new Date(bootstrap.displayNameLockedUntil).toLocaleDateString("ko-KR")
    : null;
  const savedPosterName = bootstrap.displayName?.trim() || "";
  const trimmedPosterName = posterName.trim();
  const needsPosterNameCheck =
    !bootstrap.isOperator &&
    !isPosterNameLocked &&
    trimmedPosterName.length > 0 &&
    trimmedPosterName !== savedPosterName;
  const posterNameCheckPassed =
    !needsPosterNameCheck ||
    (posterNameCheck === "available" && checkedPosterName === trimmedPosterName);

  const preview = useMemo(() => {
    if (listingType === "trade") {
      if (!tradeSide) return null;
      return buildMagamPreviewLine({
        listingType,
        cityId,
        districtSlug,
        tradeSide,
        tradeClientCount: tradeClientCount ? Number.parseInt(tradeClientCount, 10) : null,
        tradeTotalRevenue: parseMagamPriceManInput(tradeTotalRevenueMan),
        tradeRegionsInDetail,
        specialNotes,
        priceAmount: priceNegotiable ? null : parseMagamPriceManInput(salePriceMan),
        priceNegotiable,
      });
    }
    if (listingType === "hiring" && !workDescription.trim()) return null;
    if (listingType === "subcontract" && !workKind) return null;
    return buildMagamPreviewLine({
      listingType,
      cityId,
      districtSlug,
      subcontractKind: listingType === "subcontract" ? subcontractKind : undefined,
      workKind: listingType === "hiring" ? null : workKind,
      workDescription: listingType === "hiring" ? workDescription : null,
      hiringEmploymentType: listingType === "hiring" ? hiringEmploymentType : undefined,
      scheduleDate: isFullTimeHiring || isRegularSubcontract ? null : scheduleDate || null,
      timeSlot: isFullTimeHiring || isRegularSubcontract ? null : timeSlot || null,
      pyeong: regularAreaInDetail ? null : pyeong ? Number.parseInt(pyeong, 10) : null,
      acTypes,
      otherDetail,
      specialNotes: isFullTimeHiring ? null : specialNotes,
      regularFrequencyCount: regularFrequencyCount ? Number.parseInt(regularFrequencyCount, 10) : null,
      regularFrequencyNegotiable,
      regularAreaInDetail,
      priceAmount:
        (isFullTimeHiring || isRegularSubcontract) && priceNegotiable
          ? null
          : parseMagamPriceManInput(priceMan),
      priceUnit: "man",
      priceNegotiable: isFullTimeHiring || isRegularSubcontract ? priceNegotiable : false,
    });
  }, [
    listingType, cityId, districtSlug, subcontractKind, workKind, workDescription, scheduleDate, timeSlot,
    pyeong, acTypes, otherDetail, specialNotes, priceMan, priceNegotiable, tradeSide,
    tradeClientCount, tradeTotalRevenueMan, salePriceMan, tradeRegionsInDetail, hiringEmploymentType,
    isFullTimeHiring, isRegularSubcontract, regularFrequencyCount, regularFrequencyNegotiable,
    regularAreaInDetail,
  ]);

  function resetTradeFields() {
    setTradeSide("");
    setTradeClientCount("");
    setTradeTotalRevenueMan("");
    setSalePriceMan("");
    setPriceNegotiable(false);
    setTradeRegionsInDetail(false);
  }

  function validate(): string | null {
    if (listingType === "trade") {
      if (!tradeSide) return "양도·양수를 선택해 주세요.";
      const clientCount = tradeClientCount ? Number.parseInt(tradeClientCount, 10) : 0;
      if (!Number.isFinite(clientCount) || clientCount <= 0) {
        return "거래처 수를 입력해 주세요.";
      }
      if (!parseMagamPriceManInput(tradeTotalRevenueMan)) {
        return "총 매출을 입력해 주세요.";
      }
      if (!priceNegotiable && !parseMagamPriceManInput(salePriceMan)) {
        return "희망 판매가를 입력하거나 협의를 선택해 주세요.";
      }
      if (tradeRegionsInDetail && specialNotes.trim().length < 4) {
        return "「상세 설명 참조」를 체크했으면 상세 설명을 4자 이상 적어 주세요.";
      }
    } else if (listingType === "hiring") {
      if (workDescription.trim().length < 2) {
        return hiringEmploymentType === "full_time"
          ? "상세 설명을 2자 이상 입력해 주세요."
          : "작업내용을 2자 이상 입력해 주세요.";
      }
      if (isFullTimeHiring && !priceNegotiable && !parseMagamPriceManInput(priceMan)) {
        return "월급을 입력하거나 급여 협의를 선택해 주세요.";
      }
    } else {
      if (isRegularSubcontract) {
        const frequency = regularFrequencyCount ? Number.parseInt(regularFrequencyCount, 10) : 0;
        if (!regularFrequencyNegotiable && (!Number.isFinite(frequency) || frequency <= 0)) {
          return "정기 주기를 입력하거나 협의를 선택해 주세요.";
        }
        if (!workKind) return "청소 대상을 선택해 주세요.";
        if (!regularAreaInDetail && (!pyeong || Number(pyeong) <= 0)) {
          return "면적을 입력하거나 상세 설명 참조를 선택해 주세요.";
        }
        if (!priceNegotiable && !parseMagamPriceManInput(priceMan)) {
          return "월 도급금을 입력하거나 협의를 선택해 주세요.";
        }
        if (specialNotes.trim().length < 4) return "상세 설명을 4자 이상 입력해 주세요.";
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
    }
    if (trimmedPosterName.length < 2) return "공고에 표시될 업체명(닉네임)을 입력해 주세요.";
    if (trimmedPosterName.length > 40) return "업체명(닉네임)은 40자 이하로 입력해 주세요.";
    if (!posterNameCheckPassed) return "업체명(닉네임) 중복확인을 해 주세요.";
    if (normalizeMagamPhone(contactPhone).length < 10) return "연락처를 입력해 주세요.";
    if (!disclosed) return "「모집 안내 노출 동의」에 체크해야 글을 올릴 수 있습니다.";
    return null;
  }

  async function handleCheckPosterName() {
    const name = posterName.trim();
    if (name.length < 2) {
      setError("업체명(닉네임)을 2자 이상 입력해 주세요.");
      return;
    }
    if (name.length > 40) {
      setError("업체명(닉네임)은 40자 이하로 입력해 주세요.");
      return;
    }
    setError(null);
    setPosterNameCheck("checking");
    const result = await checkMagamDisplayNameAvailable(name);
    if (!result.ok) {
      setPosterNameCheck("idle");
      setError(result.error);
      return;
    }
    setCheckedPosterName(name);
    setPosterNameCheck(result.data?.available ? "available" : "taken");
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
    const payload =
      listingType === "trade"
        ? {
            listingType,
            cityId,
            districtSlug,
            tradeSide: tradeSide as MagamTradeSide,
            tradeClientCount: Number.parseInt(tradeClientCount, 10),
            tradeTotalRevenue: parseMagamPriceManInput(tradeTotalRevenueMan),
            tradeRegionsInDetail,
            specialNotes: specialNotes.trim() || null,
            priceAmount: priceNegotiable ? null : parseMagamPriceManInput(salePriceMan),
            priceNegotiable,
            posterName: posterName.trim(),
            contactPhone,
            linkedServiceDisclosed: disclosed,
          }
        : {
            listingType,
            cityId,
            districtSlug,
            subcontractKind: listingType === "subcontract" ? subcontractKind : undefined,
            workKind: listingType === "hiring" ? null : workKind,
            workDescription: listingType === "hiring" ? workDescription.trim() : null,
            hiringEmploymentType: listingType === "hiring" ? hiringEmploymentType : undefined,
            scheduleDate: isFullTimeHiring || isRegularSubcontract ? null : scheduleDate || null,
            timeSlot: isFullTimeHiring || isRegularSubcontract ? null : timeSlot || null,
            pyeong: regularAreaInDetail ? null : pyeong ? Number.parseInt(pyeong, 10) : null,
            acTypes: isRegularSubcontract ? [] : acTypes,
            otherDetail: otherDetail.trim() || null,
            specialNotes: isFullTimeHiring ? null : specialNotes.trim() || null,
            regularFrequencyCount: regularFrequencyCount ? Number.parseInt(regularFrequencyCount, 10) : null,
            regularFrequencyNegotiable,
            regularAreaInDetail,
            priceAmount:
              (isFullTimeHiring || isRegularSubcontract) && priceNegotiable
                ? null
                : parseMagamPriceManInput(priceMan),
            priceUnit: "man" as const,
            priceNegotiable: isFullTimeHiring || isRegularSubcontract ? priceNegotiable : false,
            posterName: posterName.trim(),
            contactPhone,
            linkedServiceDisclosed: disclosed,
          };

    const result =
      isEdit && initialListing
        ? await updateMagamListing(initialListing.id, payload)
        : await createMagamListing(payload);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    pushMagamRecentRegion(cityId, districtSlug);
    router.push(`/magam/listing/${result.data!.id}${isEdit ? "" : "?new=1"}`);
  }

  const timeSlots = listingType === "hiring" ? HIRING_SLOTS : SUBCONTRACT_SLOTS;
  const regionStep = listingType === "trade" ? "2" : isRegularSubcontract ? "3" : "3";
  const workStep = listingType === "trade" ? "3" : isRegularSubcontract ? "4" : "4";
  const frequencyStep = "5";
  const priceStep = isRegularSubcontract ? "6" : "5";
  const areaStep = "7";
  const notesStep = isRegularSubcontract ? "8" : "6";
  const contactStep = listingType === "trade" ? "4" : isFullTimeHiring ? "6" : isRegularSubcontract ? "9" : "7";

  return (
    <form onSubmit={handleSubmit}>
      {!isEdit ? <MagamWriteCoachmarks /> : null}
      <MagamRadarNationalBanner pagePath="magam:compose" className="mb-4" />
      <MagamComposeSection step="1" title="도급 / 구인 / 매매">
        <div className="flex flex-wrap gap-2">
          {(["subcontract", "hiring", "trade"] as const).map((type) => (
            <MagamChoiceChip
              key={type}
              selected={listingType === type}
              disabled={loading || isEdit}
              onClick={() => {
                setListingType(type);
                if (type === "hiring") {
                  setWorkKind("");
                  setAcTypes([]);
                  setPyeong("");
                  setOtherDetail("");
                  resetTradeFields();
                  setPriceNegotiable(false);
                  if (timeSlot === "flexible") setTimeSlot("");
                  setScheduleDate((prev) => clearHiringQuickDates(prev));
                } else if (type === "subcontract") {
                  setWorkDescription("");
                  resetTradeFields();
                  setPriceNegotiable(false);
                } else {
                  setWorkKind("");
                  setAcTypes([]);
                  setPyeong("");
                  setOtherDetail("");
                  setWorkDescription("");
                  setScheduleDate("");
                  setTimeSlot("");
                  setSalePriceMan("");
                }
              }}
            >
              {type === "subcontract" ? "도급" : type === "hiring" ? "구인" : "매매"}
            </MagamChoiceChip>
          ))}
        </div>
      </MagamComposeSection>

      {listingType === "subcontract" ? (
        <MagamComposeSection step="2" title="도급 종류">
          <div className="flex flex-wrap gap-2">
            {SUBCONTRACT_KINDS.map((kind) => (
              <MagamChoiceChip
                key={kind}
                selected={subcontractKind === kind}
                disabled={loading}
                onClick={() => {
                  setSubcontractKind(kind);
                  if (kind === "regular") {
                    setScheduleDate("");
                    setTimeSlot("");
                    setAcTypes([]);
                  } else {
                    setRegularFrequencyCount("");
                    setRegularFrequencyNegotiable(false);
                    setRegularAreaInDetail(false);
                    setPriceNegotiable(false);
                  }
                }}
              >
                {SUBCONTRACT_KIND_LABEL[kind]}
              </MagamChoiceChip>
            ))}
          </div>
        </MagamComposeSection>
      ) : null}

      {listingType === "hiring" ? (
        <MagamComposeSection step="2" title="구인 종류">
          <div className="flex flex-wrap gap-2">
            {HIRING_EMPLOYMENT_TYPES.map((type) => (
              <MagamChoiceChip
                key={type}
                selected={hiringEmploymentType === type}
                disabled={loading}
                onClick={() => {
                  setHiringEmploymentType(type);
                  if (type === "full_time") {
                    setScheduleDate("");
                    setTimeSlot("");
                  } else {
                    setPriceNegotiable(false);
                  }
                }}
              >
                {HIRING_EMPLOYMENT_LABEL[type]}
              </MagamChoiceChip>
            ))}
          </div>
        </MagamComposeSection>
      ) : null}

      {listingType !== "trade" && !isFullTimeHiring && !isRegularSubcontract ? (
      <MagamComposeSection step={listingType === "hiring" ? "3" : "3"} title="언제">
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
      ) : null}

      <MagamComposeSection step={regionStep} title="어디">
        <MagamRegionPicker
          cityId={cityId}
          districtSlug={districtSlug}
          disabled={loading}
          onCityChange={setCityId}
          onDistrictChange={setDistrictSlug}
        />
        {listingType === "trade" ? (
          <div className="mt-3 space-y-2">
            <p className="text-[13px] text-[#5B6472]">{MAGAM_TRADE_REGION_HELPER}</p>
            <label className="flex cursor-pointer items-center gap-2.5">
              <input
                type="checkbox"
                className="accent-[#7C3AED]"
                checked={tradeRegionsInDetail}
                disabled={loading}
                onChange={(e) => setTradeRegionsInDetail(e.target.checked)}
              />
              <span className="text-sm font-medium text-[#141824]">
                {MAGAM_TRADE_REGION_DETAIL_REF}
              </span>
            </label>
          </div>
        ) : null}
      </MagamComposeSection>

      <MagamRadarRegionalBanner
        regionKeys={magamRegionalAdCandidateKeys(cityId, districtSlug)}
        pagePath="magam:compose"
        className="mb-4"
      />

      <MagamComposeSection
        step={workStep}
        title={
          listingType === "trade"
            ? "매매 정보"
            : listingType === "hiring"
              ? hiringEmploymentType === "full_time"
                ? "상세 설명"
                : "작업내용"
              : isRegularSubcontract
                ? "청소 대상"
              : "어떤 일"
        }
      >
        {listingType === "trade" ? (
          <MagamTradeComposeFields
            disabled={loading}
            tradeSide={tradeSide}
            onTradeSideChange={setTradeSide}
            tradeClientCount={tradeClientCount}
            onTradeClientCountChange={setTradeClientCount}
            tradeTotalRevenueMan={tradeTotalRevenueMan}
            onTradeTotalRevenueManChange={setTradeTotalRevenueMan}
            salePriceMan={salePriceMan}
            onSalePriceManChange={setSalePriceMan}
            priceNegotiable={priceNegotiable}
            onPriceNegotiableChange={setPriceNegotiable}
            specialNotes={specialNotes}
            onSpecialNotesChange={setSpecialNotes}
          />
        ) : listingType === "hiring" ? (
          <div>
            <textarea
              className={`${magamInputClass} ${
                isFullTimeHiring ? "min-h-[240px]" : "min-h-[88px]"
              }`}
              disabled={loading}
              placeholder={
                hiringEmploymentType === "full_time"
                  ? MAGAM_HIRING_FULL_TIME_WORK_HINT
                  : MAGAM_HIRING_WORK_HINT
              }
              value={workDescription}
              onChange={(e) => setWorkDescription(e.target.value)}
            />
            <p className="mt-1.5 text-[13px] text-[#5B6472]">
              {isFullTimeHiring ? MAGAM_HIRING_FULL_TIME_WORK_HELPER : MAGAM_HIRING_WORK_HELPER}
            </p>
          </div>
        ) : isRegularSubcontract ? (
          <>
            <MagamSubLabel>청소 대상</MagamSubLabel>
            <div className="mt-2.5 flex flex-wrap gap-2">
              {REGULAR_WORK_KINDS.map((kind) => (
                <MagamChoiceChip
                  key={kind}
                  selected={workKind === kind}
                  disabled={loading}
                  onClick={() => {
                    setWorkKind(kind);
                    if (kind !== "other") setOtherDetail("");
                  }}
                >
                  {MAGAM_WORK_KIND_LABEL[kind]}
                </MagamChoiceChip>
              ))}
            </div>
            {workKind === "other" ? (
              <div className="mt-4">
                <input
                  id="regular-other-detail"
                  className={magamInputClass}
                  disabled={loading}
                  placeholder="예) 계단 청소, 공용부 청소"
                  value={otherDetail}
                  onChange={(e) => setOtherDetail(e.target.value)}
                  autoFocus
                />
              </div>
            ) : null}
          </>
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

      {isRegularSubcontract ? (
        <MagamComposeSection step={frequencyStep} title="정기 주기">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[#5B6472]">주</span>
              <input
                type="number"
                min={1}
                inputMode="numeric"
                className={`${magamInputClass} max-w-[100px]`}
                disabled={loading || regularFrequencyNegotiable}
                placeholder="3"
                value={regularFrequencyCount}
                onChange={(e) => setRegularFrequencyCount(e.target.value.replace(/\D/g, ""))}
              />
              <span className="text-sm font-medium text-[#5B6472]">회</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#141824]">
              <input
                type="checkbox"
                className="accent-[#EA580C]"
                checked={regularFrequencyNegotiable}
                disabled={loading}
                onChange={(e) => {
                  setRegularFrequencyNegotiable(e.target.checked);
                  if (e.target.checked) setRegularFrequencyCount("");
                }}
              />
              협의
            </label>
          </div>
        </MagamComposeSection>
      ) : null}

      {listingType !== "trade" ? (
      <MagamComposeSection
        step={priceStep}
        title={
          listingType === "hiring"
            ? hiringEmploymentType === "full_time"
              ? "월급"
              : "일당"
            : isRegularSubcontract
              ? "월 도급금"
            : "얼마"
        }
      >
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              inputMode="numeric"
              className={`${magamInputClass} max-w-[140px]`}
              disabled={loading || ((isFullTimeHiring || isRegularSubcontract) && priceNegotiable)}
              placeholder={
                isFullTimeHiring ? "300" : isRegularSubcontract ? "120" : "13"
              }
              value={priceMan}
              onChange={(e) => setPriceMan(e.target.value.replace(/\D/g, ""))}
            />
            <span className="text-sm font-medium text-[#5B6472]">만원</span>
          </div>
          {isFullTimeHiring || isRegularSubcontract ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#141824]">
              <input
                type="checkbox"
                className="accent-[#EA580C]"
                checked={priceNegotiable}
                disabled={loading}
                onChange={(e) => {
                  setPriceNegotiable(e.target.checked);
                  if (e.target.checked) setPriceMan("");
                }}
              />
              {isRegularSubcontract ? "협의" : "급여 협의"}
            </label>
          ) : null}
        </div>
      </MagamComposeSection>
      ) : null}

      {isRegularSubcontract ? (
        <MagamComposeSection step={areaStep} title="면적">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <input
                id="regular-pyeong"
                type="number"
                min={1}
                inputMode="numeric"
                className={`${magamInputClass} max-w-[140px]`}
                disabled={loading || regularAreaInDetail}
                value={pyeong}
                onChange={(e) => setPyeong(e.target.value.replace(/\D/g, ""))}
              />
              <span className="text-sm font-medium text-[#5B6472]">평</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-[#141824]">
              <input
                type="checkbox"
                className="accent-[#EA580C]"
                checked={regularAreaInDetail}
                disabled={loading}
                onChange={(e) => {
                  setRegularAreaInDetail(e.target.checked);
                  if (e.target.checked) setPyeong("");
                }}
              />
              상세 설명 참조
            </label>
          </div>
        </MagamComposeSection>
      ) : null}

      {listingType !== "trade" && !isFullTimeHiring ? (
      <MagamComposeSection step={notesStep} title={isRegularSubcontract ? "상세 설명" : "특이사항"}>
        <MagamSubLabel>{isRegularSubcontract ? "작업 시간, 요일, 포함 범위, 장비·소모품 조건" : "특이사항 (선택)"}</MagamSubLabel>
        <textarea
          className={`${magamInputClass} mt-2 ${isRegularSubcontract ? "min-h-[180px]" : "min-h-[88px]"}`}
          disabled={loading}
          placeholder={
            isRegularSubcontract
              ? MAGAM_REGULAR_SUBCONTRACT_DETAIL_HINT
              : listingType === "hiring"
              ? MAGAM_HIRING_SPECIAL_NOTES_HINT
              : MAGAM_SUBCONTRACT_SPECIAL_NOTES_HINT
          }
          value={specialNotes}
          onChange={(e) => setSpecialNotes(e.target.value)}
        />
      </MagamComposeSection>
      ) : null}

      <MagamComposeSection step={contactStep} title="연락처">
        <div className="mb-4">
          <MagamFieldLabel htmlFor="posterName">업체명(닉네임)</MagamFieldLabel>
          <div className="mt-2 flex gap-2">
            <input
              id="posterName"
              className={magamInputClass}
              disabled={loading || isPosterNameLocked}
              placeholder="예) 홍길동, 깨끗한청소"
              maxLength={40}
              value={posterName}
              onChange={(e) => {
                setPosterName(e.target.value);
                setPosterNameCheck("idle");
                setCheckedPosterName("");
              }}
            />
            {!bootstrap.isOperator && !isPosterNameLocked ? (
              <button
                type="button"
                className="shrink-0 rounded-[14px] border border-[#CBD5E1] px-3 text-sm font-semibold text-[#141824] disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || posterNameCheck === "checking" || trimmedPosterName.length < 2}
                onClick={handleCheckPosterName}
              >
                {posterNameCheck === "checking" ? "확인 중" : "중복확인"}
              </button>
            ) : null}
          </div>
          <p className="mt-1.5 text-[13px] text-[#5B6472]">
            {bootstrap.isOperator
              ? "운영자 계정은 공고마다 업체명을 바꿔 저장할 수 있습니다."
              : isPosterNameLocked
                ? `공고에 공개되는 이름입니다. 30일에 1번만 바꿀 수 있습니다. 다음 변경 가능일: ${posterNameUnlockLabel}`
                : savedPosterName
                  ? "공고에 공개되는 이름입니다. 변경하려면 중복확인이 필요하고, 변경 후 30일 동안 다시 바꿀 수 없습니다."
                  : "공고에 공개되는 이름입니다. 처음 정한 뒤에는 30일 동안 다시 바꿀 수 없고, 중복확인이 필요합니다."}
          </p>
          {!bootstrap.isOperator && posterNameCheck === "available" && checkedPosterName === trimmedPosterName ? (
            <p className="mt-1.5 text-[13px] font-semibold text-[#047857]">
              사용할 수 있는 업체명(닉네임)입니다.
            </p>
          ) : null}
          {!bootstrap.isOperator && posterNameCheck === "taken" ? (
            <p className="mt-1.5 text-[13px] font-semibold text-[#DC2626]">
              이미 사용 중인 업체명(닉네임)입니다. 다른 이름을 입력해 주세요.
            </p>
          ) : null}
        </div>
        <input
          type="tel"
          className={magamInputClass}
          disabled={loading}
          placeholder="010-0000-0000"
          value={contactPhone}
          onChange={(e) => setContactPhone(formatMagamPhoneInput(e.target.value))}
        />
        <p className="mt-1.5 text-[13px] text-[#5B6472]">
          {listingType === "hiring"
            ? MAGAM_HIRING_PHONE_HELPER
            : listingType === "trade"
              ? MAGAM_TRADE_PHONE_HELPER
              : MAGAM_SUBCONTRACT_PHONE_HELPER}
        </p>
      </MagamComposeSection>

      {preview ? <MagamPreviewCard text={preview} /> : null}

      {!bootstrap.alreadyConsented ? (
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
      ) : null}

      {error ? <MagamErrorBanner message={error} /> : null}

      <button type="submit" disabled={loading} className={magamPrimaryBtnClass}>
        {loading ? (isEdit ? "수정 중…" : "등록 중…") : isEdit ? "수정 완료" : "등록하고 링크 받기"}
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
