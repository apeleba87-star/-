"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calculator,
  Building2,
  Layers,
  Plus,
  Trash2,
  Share2,
  Copy,
  X,
  Loader2,
} from "lucide-react";
import type { EstimateConfig } from "@/lib/estimate-calc";
import {
  SQM_PER_PYEONG,
  DAILY_UNLOCK_LIMIT,
  calcOffice,
  calcStairs,
  calcLabor,
  calcOfficeComparison,
  calcStairsComparison,
  formatWon,
  JUDGE_LABELS,
  JUDGE_TITLES,
  JUDGE_TYPES,
  JUDGE_STYLES,
  type OfficeInput,
  type StairsInput,
  type LaborInput,
  type VerdictType,
} from "@/lib/estimate-calc";

const KAKAO_CHAT_URL = process.env.NEXT_PUBLIC_KAKAO_CHAT_URL || "#";
const SHARE_TITLE = "내 단가, 평균보다 낮으면 계속 손해입니다";
const SHARE_TEXT = [
  "👉 내 단가, 평균보다 낮으면 계속 손해입니다",
  "",
  "업계 평균 대비 내 위치 확인",
  "",
  "👇 지금 확인",
].join("\n");
const STORAGE_KEY = "cleaning-estimate-daily-unlocks";

function getDailyUnlocks(): { date: string; count: number } {
  if (typeof window === "undefined") return { date: "", count: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : { date: "", count: 0 };
    const today = new Date().toISOString().slice(0, 10);
    if (parsed.date !== today) return { date: today, count: 0 };
    return { date: today, count: Number(parsed.count) || 0 };
  } catch {
    return { date: new Date().toISOString().slice(0, 10), count: 0 };
  }
}

function incrementDailyUnlocks(): void {
  const cur = getDailyUnlocks();
  const today = new Date().toISOString().slice(0, 10);
  const next = cur.date === today ? cur.count + 1 : 1;
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ date: today, count: next }));
}

function isMobileContext(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const w = window.innerWidth;
  const sw = typeof screen !== "undefined" ? screen.width : 1024;
  if (w <= 768 || sw <= 768 || sw <= 480) return true;
  if ("ontouchstart" in window && sw <= 1024) return true;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|KakaoTalk|KAKAO|Samsung|Mobile/i.test(ua);
}

function fromKakao(): boolean {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent.toLowerCase();
  const ref = (document.referrer || "").toLowerCase();
  return /kakao|daum|kakaotalk/.test(ua) || /kakao|daum|kakaotalk/.test(ref);
}

type TabMode = "area" | "labor";
type AreaSub = "office" | "stairs";

export default function CleaningEstimateCalculator({ config }: { config: EstimateConfig }) {
  const [tab, setTab] = useState<TabMode>("area");
  const [areaSub, setAreaSub] = useState<AreaSub>("office");

  // Office
  const [areaUnit, setAreaUnit] = useState<"pyeong" | "sqm">("pyeong");
  const [areaValue, setAreaValue] = useState("");
  const [wonPerPyeong, setWonPerPyeong] = useState("");
  const [visitsPerWeek, setVisitsPerWeek] = useState(1);
  const [discountRate, setDiscountRate] = useState(0);
  const [restroomCount, setRestroomCount] = useState(0);
  const [restroomWon, setRestroomWon] = useState("");
  const [recycle, setRecycle] = useState(false);
  const [recycleWon, setRecycleWon] = useState("");
  const [elevator, setElevator] = useState(false);
  const [elevatorWon, setElevatorWon] = useState("");
  const [officeExtras, setOfficeExtras] = useState<{ name: string; monthlyWon: number }[]>([]);

  // Stairs
  const [floors, setFloors] = useState(4);
  const [stairsVisits, setStairsVisits] = useState(1);
  const [stairsDiscount, setStairsDiscount] = useState(0);
  const [stairsRestroomCount, setStairsRestroomCount] = useState(0);
  const [stairsRestroomWon, setStairsRestroomWon] = useState("");
  const [stairsElevator, setStairsElevator] = useState(false);
  const [stairsElevatorWon, setStairsElevatorWon] = useState("");
  const [stairsParking, setStairsParking] = useState(false);
  const [stairsParkingWon, setStairsParkingWon] = useState("");
  const [stairsWindow, setStairsWindow] = useState(false);
  const [stairsWindowWon, setStairsWindowWon] = useState("");
  const [stairsRecycle, setStairsRecycle] = useState(false);
  const [stairsRecycleWon, setStairsRecycleWon] = useState("");
  const [stairsExtras, setStairsExtras] = useState<{ name: string; monthlyWon: number }[]>([]);

  // Labor
  const [fullTimeHourly, setFullTimeHourly] = useState("");
  const [fullTimeCount, setFullTimeCount] = useState(0);
  const [partTimeHourly, setPartTimeHourly] = useState("");
  const [partTimeCount, setPartTimeCount] = useState(0);
  const [workHours, setWorkHours] = useState(0);
  const [workMinutes, setWorkMinutes] = useState(0);
  const [laborVisitsPerWeek, setLaborVisitsPerWeek] = useState(1);
  const [marginRate, setMarginRate] = useState(0);

  // Modals & share
  const [showLoading, setShowLoading] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [hasSharedForAnalysis, setHasSharedForAnalysis] = useState(false);
  const [firstAnalysisDone, setFirstAnalysisDone] = useState(false);
  const [kakaoSharePending, setKakaoSharePending] = useState(false);
  const [shareCancelled, setShareCancelled] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const [copyToast, setCopyToast] = useState(false);

  const pyeongFromInput =
    areaUnit === "sqm" ? (Number(areaValue) || 0) / SQM_PER_PYEONG : Number(areaValue) || 0;

  const officeInput: OfficeInput = {
    pyeong: pyeongFromInput,
    wonPerPyeong: Number(wonPerPyeong) || 0,
    visitsPerWeek,
    discountRate,
    restroomCount,
    restroomWon: Number(restroomWon) || 0,
    recycle,
    recycleWon: Number(recycleWon) || 0,
    elevator,
    elevatorWon: Number(elevatorWon) || 0,
    extraItems: officeExtras,
  };

  const stairsInput: StairsInput = {
    floors,
    visitsPerWeek: stairsVisits,
    discountRate: stairsDiscount,
    restroomCount: stairsRestroomCount,
    restroomWon: Number(stairsRestroomWon) || 0,
    elevator: stairsElevator,
    elevatorWon: Number(stairsElevatorWon) || 0,
    parking: stairsParking,
    parkingWon: Number(stairsParkingWon) || 0,
    window: stairsWindow,
    windowWon: Number(stairsWindowWon) || 0,
    recycle: stairsRecycle,
    recycleWon: Number(stairsRecycleWon) || 0,
    extraItems: stairsExtras,
  };

  const laborInput: LaborInput = {
    fullTimeHourly: Number(fullTimeHourly) || 0,
    fullTimeCount,
    partTimeHourly: Number(partTimeHourly) || 0,
    partTimeCount,
    workHours,
    workMinutes,
    visitsPerWeek: laborVisitsPerWeek,
    marginRate,
  };

  const officeResult = useMemo(() => calcOffice(officeInput, config), [officeInput, config]);
  const stairsResult = useMemo(() => calcStairs(stairsInput, config), [stairsInput, config]);
  const laborResult = useMemo(() => calcLabor(laborInput), [laborInput]);

  const areaMonthlyTotal = areaSub === "office" ? officeResult.monthlyTotal : stairsResult.monthlyTotal;
  const areaBreakdown = areaSub === "office" ? officeResult.breakdown : stairsResult.breakdown;

  const officeComparison = useMemo(
    () =>
      pyeongFromInput > 0 && officeResult.monthlyVisits
        ? calcOfficeComparison(
            officeResult.monthlyTotal,
            officeResult.monthlyVisits,
            pyeongFromInput,
            officeInput.visitsPerWeek,
            config
          )
        : null,
    [officeResult.monthlyTotal, officeResult.monthlyVisits, pyeongFromInput, officeInput.visitsPerWeek, config]
  );

  const isMobile = isMobileContext();
  const hasNativeShare = typeof navigator !== "undefined" && !!navigator.share;
  const hasKakaoShare = fromKakao() && typeof window !== "undefined" && !!(window as unknown as { Kakao?: { Share?: { sendDefault?: unknown } } }).Kakao?.Share?.sendDefault;
  const canUseShare = isMobile && (hasNativeShare || hasKakaoShare);
  const canUseCopyFallback = isMobile && !hasNativeShare && !hasKakaoShare;

  const stairsOptionsSum =
    (stairsRestroomCount * (Number(stairsRestroomWon) || config.stairs_restroom_unit)) +
    (stairsElevator ? (Number(stairsElevatorWon) || config.stairs_elevator_monthly) : 0) +
    (stairsParking ? (Number(stairsParkingWon) || config.stairs_parking_monthly) : 0) +
    (stairsWindow ? (Number(stairsWindowWon) || config.stairs_window_monthly) : 0) +
    (stairsRecycle ? (Number(stairsRecycleWon) || config.stairs_recycle_monthly) : 0);

  const stairsComparison = useMemo(
    () =>
      calcStairsComparison(
        stairsResult.monthlyTotal,
        floors,
        stairsVisits,
        stairsOptionsSum,
        config
      ),
    [stairsResult.monthlyTotal, floors, stairsVisits, stairsOptionsSum, config]
  );

  const dailyUnlocks = getDailyUnlocks();
  const overDailyLimit = dailyUnlocks.count >= DAILY_UNLOCK_LIMIT;

  function doUnlockAfterShare() {
    const cur = getDailyUnlocks();
    if (cur.count >= DAILY_UNLOCK_LIMIT) {
      setDailyLimitReached(true);
      return;
    }
    incrementDailyUnlocks();
    setHasSharedForAnalysis(true);
    setKakaoSharePending(false);
    setShareCancelled(false);
  }

  function handleAnalyze() {
    setShowLoading(true);
    setShowAnalysis(false);
    setShareCancelled(false);
    setDailyLimitReached(false);
    const delay = firstAnalysisDone ? 1000 : 3000;
    setTimeout(() => {
      setFirstAnalysisDone(true);
      setShowLoading(false);
      setShowAnalysis(true);
    }, delay);
  }

  function handleKakaoShareConfirm() {
    setKakaoSharePending(false);
    doUnlockAfterShare();
  }

  function handleShareAndUnlock() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const shareTitle = SHARE_TITLE;
    const shareText = SHARE_TEXT;
    const shareMessage = `${SHARE_TEXT}\n${url}`;

    if (canUseShare && hasNativeShare) {
      navigator
        .share({ title: shareTitle, text: shareText, url })
        .then(() => doUnlockAfterShare())
        .catch(() => setShareCancelled(true));
      return;
    }
    if (canUseShare && !hasNativeShare && fromKakao() && hasKakaoShare) {
      const Kakao = (window as unknown as { Kakao?: { Share: { sendDefault: (opts: { objectType: string; text: string; link: { mobileWebUrl: string; webUrl: string } }) => void } } }).Kakao;
      if (Kakao?.Share?.sendDefault) {
        Kakao.Share.sendDefault({ objectType: "text", text: shareMessage, link: { mobileWebUrl: url, webUrl: url } });
        setKakaoSharePending(true);
      }
      return;
    }
    if (canUseCopyFallback) {
      navigator.clipboard
        ?.writeText(shareText + "\n" + url)
        .then(() => {
          setCopyToast(true);
          setTimeout(() => setCopyToast(false), 2000);
          doUnlockAfterShare();
        })
        .catch(() => setShareCancelled(true));
    }
  }

  function handleCopyAndUnlock() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    navigator.clipboard
      ?.writeText(SHARE_TEXT + "\n" + url)
      .then(() => {
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2000);
        doUnlockAfterShare();
      })
      .catch(() => setShareCancelled(true));
  }

  function closeModal() {
    setShowAnalysis(false);
    setKakaoSharePending(false);
    setShareCancelled(false);
  }

  function goToAreaTab() {
    setTab("area");
    closeModal();
  }

  const verdictColors: Record<VerdictType, string> = {
    low: "bg-red-100 border-red-300 text-red-800",
    slightlyLow: "bg-orange-100 border-orange-300 text-orange-800",
    avg: "bg-green-100 border-green-300 text-green-800",
    slightlyHigh: "bg-blue-100 border-blue-300 text-blue-800",
    high: "bg-purple-100 border-purple-300 text-purple-800",
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 text-sm">
        <span className="rounded bg-slate-200 px-2 py-1 font-medium text-slate-700">1단계 견적 정보 입력</span>
        <span className="rounded bg-slate-200 px-2 py-1 font-medium text-slate-700">2단계 견적 비교</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* 좌측: 입력 폼 */}
        <div className="space-y-6">
          <div className="flex gap-2 border-b border-slate-200 pb-2">
            <button
              type="button"
              onClick={() => setTab("area")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "area" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              면적 기준
            </button>
            <button
              type="button"
              onClick={() => setTab("labor")}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${tab === "labor" ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-700"}`}
            >
              인건비 기준
            </button>
          </div>

          {tab === "area" && (
            <>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAreaSub("office")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${areaSub === "office" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}
                >
                  <Building2 className="h-4 w-4" /> 정기 청소
                </button>
                <button
                  type="button"
                  onClick={() => setAreaSub("stairs")}
                  className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm ${areaSub === "stairs" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-600"}`}
                >
                  <Layers className="h-4 w-4" /> 계단 청소
                </button>
              </div>

              {areaSub === "office" && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white/60 p-4 backdrop-blur-sm">
                  <label className="block">
                    <span className="label">면적 (단위 선택 + 숫자, 1평 = 3.3㎡)</span>
                    <div className="flex gap-2">
                      <select value={areaUnit} onChange={(e) => setAreaUnit(e.target.value as "pyeong" | "sqm")} className="input w-24">
                        <option value="pyeong">평</option>
                        <option value="sqm">㎡</option>
                      </select>
                      <input type="number" value={areaValue} onChange={(e) => setAreaValue(e.target.value)} className="input flex-1" min={0} step={areaUnit === "sqm" ? 0.1 : 0.1} placeholder={areaUnit === "pyeong" ? "평수" : "㎡"} />
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">평당 금액 (원)</span>
                    <input type="number" value={wonPerPyeong} onChange={(e) => setWonPerPyeong(e.target.value)} className="input" min={0} />
                  </label>
                  <label className="block">
                    <span className="label">방문 빈도 (주)</span>
                    <select value={visitsPerWeek} onChange={(e) => setVisitsPerWeek(Number(e.target.value))} className="input">
                      {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                        <option key={n} value={n}>주 {n}회</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">할인률 (%)</span>
                    <div className="flex gap-2">
                      <input type="range" min={0} max={50} value={discountRate} onChange={(e) => setDiscountRate(Number(e.target.value))} className="flex-1" />
                      <span>{discountRate}%</span>
                    </div>
                    <div className="mt-1 flex gap-2">
                      {[10, 20, 30].map((n) => (
                        <button key={n} type="button" onClick={() => setDiscountRate(n)} className="rounded border border-slate-300 px-2 py-1 text-xs hover:bg-slate-50">
                          {n}%
                        </button>
                      ))}
                    </div>
                  </label>
                  <label className="block">
                    <span className="label">화장실 칸수 / 월 단가 (원)</span>
                    <div className="flex gap-2">
                      <input type="number" min={0} value={restroomCount} onChange={(e) => setRestroomCount(Number(e.target.value) || 0)} className="input w-24" />
                      <input type="number" min={0} value={restroomWon} onChange={(e) => setRestroomWon(e.target.value)} className="input flex-1" placeholder="미입력 시 기본값" />
                    </div>
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={recycle} onChange={(e) => setRecycle(e.target.checked)} />
                    <span className="label mb-0">분리수거</span>
                    <input type="number" min={0} value={recycleWon} onChange={(e) => setRecycleWon(e.target.value)} className="input w-28" placeholder="월 금액" />
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={elevator} onChange={(e) => setElevator(e.target.checked)} />
                    <span className="label mb-0">엘리베이터</span>
                    <input type="number" min={0} value={elevatorWon} onChange={(e) => setElevatorWon(e.target.value)} className="input w-28" placeholder="월 금액" />
                  </label>
                  <div>
                    <span className="label">사용자 추가 항목</span>
                    {officeExtras.map((item, i) => (
                      <div key={i} className="mt-1 flex gap-2">
                        <input value={item.name} onChange={(e) => setOfficeExtras((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="input flex-1" placeholder="품목명" />
                        <input type="number" value={item.monthlyWon || ""} onChange={(e) => setOfficeExtras((prev) => prev.map((x, j) => (j === i ? { ...x, monthlyWon: Number(e.target.value) || 0 } : x)))} className="input w-28" placeholder="월 금액" />
                        <button type="button" onClick={() => setOfficeExtras((prev) => prev.filter((_, j) => j !== i))} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setOfficeExtras((prev) => [...prev, { name: "", monthlyWon: 0 }])} className="mt-2 flex items-center gap-1 text-sm text-blue-600">
                      <Plus className="h-4 w-4" /> 추가
                    </button>
                  </div>
                </div>
              )}

              {areaSub === "stairs" && (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white/60 p-4 backdrop-blur-sm">
                  <label className="block">
                    <span className="label">층수</span>
                    <input type="number" min={1} value={floors} onChange={(e) => setFloors(Number(e.target.value) || 4)} className="input w-24" />
                  </label>
                  <label className="block">
                    <span className="label">방문 빈도 (주)</span>
                    <select value={stairsVisits} onChange={(e) => setStairsVisits(Number(e.target.value))} className="input">
                      {[1, 2, 3].map((n) => (
                        <option key={n} value={n}>주 {n}회</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="label">할인률 (%)</span>
                    <input type="range" min={0} max={50} value={stairsDiscount} onChange={(e) => setStairsDiscount(Number(e.target.value))} className="w-full" />
                    <span>{stairsDiscount}%</span>
                  </label>
                  <label className="block">
                    <span className="label">화장실 개수 / 월 단가</span>
                    <div className="flex gap-2">
                      <input type="number" min={0} value={stairsRestroomCount} onChange={(e) => setStairsRestroomCount(Number(e.target.value) || 0)} className="input w-24" />
                      <input type="number" min={0} value={stairsRestroomWon} onChange={(e) => setStairsRestroomWon(e.target.value)} className="input flex-1" />
                    </div>
                  </label>
                  {[
                    { check: stairsElevator, setCheck: setStairsElevator, won: stairsElevatorWon, setWon: setStairsElevatorWon, label: "엘리베이터" },
                    { check: stairsParking, setCheck: setStairsParking, won: stairsParkingWon, setWon: setStairsParkingWon, label: "외부 주차장" },
                    { check: stairsWindow, setCheck: setStairsWindow, won: stairsWindowWon, setWon: setStairsWindowWon, label: "창틀 먼지" },
                    { check: stairsRecycle, setCheck: setStairsRecycle, won: stairsRecycleWon, setWon: setStairsRecycleWon, label: "분리수거" },
                  ].map(({ check, setCheck, won, setWon, label }) => (
                    <label key={label} className="flex items-center gap-2">
                      <input type="checkbox" checked={check} onChange={(e) => setCheck(e.target.checked)} />
                      <span className="label mb-0">{label}</span>
                      <input type="number" min={0} value={won} onChange={(e) => setWon(e.target.value)} className="input w-28" />
                    </label>
                  ))}
                  <div>
                    <span className="label">사용자 추가 항목</span>
                    {stairsExtras.map((item, i) => (
                      <div key={i} className="mt-1 flex gap-2">
                        <input value={item.name} onChange={(e) => setStairsExtras((prev) => prev.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="input flex-1" placeholder="품목명" />
                        <input type="number" value={item.monthlyWon || ""} onChange={(e) => setStairsExtras((prev) => prev.map((x, j) => (j === i ? { ...x, monthlyWon: Number(e.target.value) || 0 } : x)))} className="input w-28" />
                        <button type="button" onClick={() => setStairsExtras((prev) => prev.filter((_, j) => j !== i))} className="text-red-600"><Trash2 className="h-4 w-4" /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setStairsExtras((prev) => [...prev, { name: "", monthlyWon: 0 }])} className="mt-2 flex items-center gap-1 text-sm text-blue-600">
                      <Plus className="h-4 w-4" /> 추가
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

          {tab === "labor" && (
            <div className="space-y-4 rounded-xl border border-slate-200 bg-white/60 p-4 backdrop-blur-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="label">정직원 시급 (원)</span>
                  <input type="number" min={0} value={fullTimeHourly} onChange={(e) => setFullTimeHourly(e.target.value)} className="input" />
                </label>
                <label className="block">
                  <span className="label">정직원 인원 (0~6)</span>
                  <input type="number" min={0} max={6} value={fullTimeCount} onChange={(e) => setFullTimeCount(Number(e.target.value) || 0)} className="input" />
                </label>
                <label className="block">
                  <span className="label">알바 시급 (원)</span>
                  <input type="number" min={0} value={partTimeHourly} onChange={(e) => setPartTimeHourly(e.target.value)} className="input" />
                </label>
                <label className="block">
                  <span className="label">알바 인원 (0~6)</span>
                  <input type="number" min={0} max={6} value={partTimeCount} onChange={(e) => setPartTimeCount(Number(e.target.value) || 0)} className="input" />
                </label>
              </div>
              <label className="block">
                <span className="label">작업 시간 (1회)</span>
                <div className="flex gap-2">
                  <input type="number" min={0} max={12} value={workHours} onChange={(e) => setWorkHours(Number(e.target.value) || 0)} className="input w-20" placeholder="시간" />
                  <input type="number" min={0} max={59} value={workMinutes} onChange={(e) => setWorkMinutes(Number(e.target.value) || 0)} className="input w-20" placeholder="분" />
                  {[10, 30, 60].map((m) => (
                    <button key={m} type="button" onClick={() => setWorkMinutes((prev) => prev + m)} className="rounded border px-2 py-1 text-xs">+{m}분</button>
                  ))}
                </div>
              </label>
              <label className="block">
                <span className="label">주 방문 횟수</span>
                <select value={laborVisitsPerWeek} onChange={(e) => setLaborVisitsPerWeek(Number(e.target.value))} className="input">
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <option key={n} value={n}>{n}회</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className="label">마진율 (%)</span>
                <input type="range" min={0} max={50} value={marginRate} onChange={(e) => setMarginRate(Number(e.target.value))} className="w-full" />
                <span>{marginRate}%</span>
                <div className="mt-1 flex gap-2">
                  {[10, 20, 30].map((n) => (
                    <button key={n} type="button" onClick={() => setMarginRate(n)} className="rounded border border-slate-300 px-2 py-1 text-xs">{n}%</button>
                  ))}
                </div>
              </label>
            </div>
          )}
        </div>

        {/* 우측: 스티키 패널 */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-white/30 bg-white/70 p-5 shadow-lg backdrop-blur-xl">
            <h3 className="mb-3 flex items-center gap-2 font-bold text-slate-800">
              <Calculator className="h-5 w-5" /> 실시간 견적
            </h3>
            {tab === "area" && (
              <>
                <p className="text-2xl font-bold text-slate-900">{formatWon(areaMonthlyTotal)}</p>
                <p className="mt-1 text-xs text-slate-500">부가세 10% 포함 시 약 {formatWon(areaMonthlyTotal * 1.1)}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {areaBreakdown.map((b, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{b.label}</span>
                      <span>{b.amount >= 0 ? formatWon(b.amount) : `- ${formatWon(-b.amount)}`}</span>
                    </li>
                  ))}
                </ul>
                {areaSub === "office" && officeComparison && (
                  <div className="mt-3 rounded-lg bg-slate-100 p-2 text-xs">
                    <p>업계 평균 회당 평당: 약 {formatWon(officeComparison.avgUnit)}</p>
                    <p>견적 비교: 면적 기준 {formatWon(areaMonthlyTotal)} / 업계 참고 {formatWon(officeComparison.avgAmount)}</p>
                  </div>
                )}
                {areaSub === "stairs" && stairsComparison && (
                  <div className="mt-3 rounded-lg bg-slate-100 p-2 text-xs">
                    <p>업계 참고 월액: 약 {formatWon(stairsComparison.avgAmount)}</p>
                  </div>
                )}
              </>
            )}
            {tab === "labor" && (
              <>
                <p className="text-2xl font-bold text-slate-900">{formatWon(laborResult.recommendedTotal)}</p>
                <p className="mt-1 text-xs text-slate-500">부가세 10% 포함 시 약 {formatWon(laborResult.recommendedTotal * 1.1)}</p>
                <ul className="mt-3 space-y-1 text-sm text-slate-600">
                  {laborResult.breakdown.map((b, i) => (
                    <li key={i} className="flex justify-between">
                      <span>{b.label}</span>
                      <span>{formatWon(b.amount)}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-amber-700">인건비 기준보다 낮은 견적은 마진이 줄어들 수 있습니다.</p>
              </>
            )}
            <p className="mt-3 text-xs text-slate-400">※ 본 견적은 참고용이며, 실제 계약 금액과 다를 수 있습니다.</p>
            <button
              type="button"
              onClick={handleAnalyze}
              className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white hover:bg-slate-700"
            >
              내 견적 분석하기
            </button>
          </div>
        </div>
      </div>

      {/* 로딩 모달 */}
      <AnimatePresence>
        {showLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-2xl bg-white p-8 shadow-xl"
            >
              <h3 className="text-lg font-bold text-slate-900">내 견적 분석 중</h3>
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>① 입력값 확인</p>
                <p>② 업계 기준 매칭</p>
                <p>③ 운영 난이도 반영</p>
              </div>
              <div className="mt-6 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 복사 토스트 */}
      {copyToast && (
        <div className="fixed bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-slate-800 px-4 py-2 text-sm text-white shadow-lg">
          링크가 복사되었어요. 업계 평균 단가와 상세 단가를 확인하세요.
        </div>
      )}

      {/* 분석 모달 */}
      <AnimatePresence>
        {showAnalysis && !showLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-slate-900">업계 평균 단가 · 내 견적</h3>
                <button type="button" onClick={closeModal} className="rounded p-1 hover:bg-slate-100">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* D. 입력 없음 */}
              {tab === "area" && pyeongFromInput <= 0 && areaSub === "office" && (
                <div className="mt-4">
                  <p className="text-slate-600">면적(평수), 방문 빈도 등 견적 정보를 입력한 후 분석해 주세요.</p>
                  <button type="button" onClick={closeModal} className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white">확인</button>
                </div>
              )}
              {tab === "labor" && !fullTimeHourly && !partTimeHourly && (
                <div className="mt-4">
                  <p className="text-slate-600">시급, 인원, 작업 시간 등 견적 정보를 입력한 후 분석해 주세요.</p>
                  <button type="button" onClick={closeModal} className="mt-4 w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white">확인</button>
                </div>
              )}

              {/* C. 인건비 기준 */}
              {tab === "labor" && (fullTimeHourly || partTimeHourly) && (
                <div className="mt-4 space-y-4">
                  {!hasSharedForAnalysis && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                      <p className="font-medium">업계 평균 대비 분석은 면적 기준 견적에서만 제공됩니다.</p>
                      <p className="mt-1">면적 기준 탭에서 견적을 입력하시면 업계 단가와 비교 분석을 확인할 수 있어요.</p>
                      <button type="button" onClick={goToAreaTab} className="mt-3 w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white">면적 기준으로 이동</button>
                    </div>
                  )}
                  <p className="font-medium">예상 견적: {formatWon(laborResult.recommendedTotal)} (부가세 10% 포함 약 {formatWon(laborResult.recommendedTotal * 1.1)})</p>
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
                    <p className="mb-2 font-medium">상세 내역</p>
                    <ul className="space-y-1 text-slate-600">
                      {laborResult.breakdown.map((b, i) => (
                        <li key={i} className="flex justify-between">
                          <span>{b.label}</span>
                          <span>{formatWon(b.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  {hasSharedForAnalysis && (
                    <button type="button" onClick={closeModal} className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white">확인</button>
                  )}
                </div>
              )}

              {/* A. 면적 기준 — 공유 전 */}
              {tab === "area" && (pyeongFromInput > 0 || areaSub === "stairs") && !hasSharedForAnalysis && (
                <div className="mt-4 space-y-4">
                  {kakaoSharePending && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                      <p className="font-medium text-blue-900">카카오톡으로 공유를 완료하셨나요?</p>
                      <p className="mt-1 text-sm text-blue-800">아래 버튼을 누르면 업계 평균 단가와 상세 견적을 확인할 수 있어요.</p>
                      <button type="button" onClick={handleKakaoShareConfirm} className="mt-3 w-full rounded-xl bg-blue-600 py-3 text-sm font-medium text-white">공유했어요, 결과 보기</button>
                    </div>
                  )}
                  {!kakaoSharePending && areaSub === "office" && officeComparison?.isExtreme && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                      <p className="font-medium">입력하신 단가가 일반 시장 범위와 많이 다릅니다. 평당 금액·옵션 금액을 다시 확인해 주세요.</p>
                      <p className="mt-1 text-sm">조건을 수정한 뒤 다시 분석해 보세요.</p>
                      <button type="button" onClick={closeModal} className="mt-3 w-full rounded-xl bg-amber-600 py-3 text-sm font-medium text-white">다시 시도하기</button>
                    </div>
                  )}
                  {!kakaoSharePending && !(areaSub === "office" && officeComparison?.isExtreme) && (dailyLimitReached || overDailyLimit) && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800">
                      <p className="font-medium">오늘 횟수를 모두 사용했습니다.</p>
                      <p className="mt-1 text-sm">내일 다시 시도해 주세요. (일일 5회 제한)</p>
                      <button type="button" onClick={closeModal} className="mt-3 w-full rounded-xl bg-amber-600 py-3 text-sm font-medium text-white">확인</button>
                    </div>
                  )}
                  {!kakaoSharePending && !dailyLimitReached && shareCancelled && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-blue-800">
                      <p>공유를 완료하면 결과를 확인할 수 있어요.</p>
                      <p className="mt-1 text-sm">다시 공유하기 버튼을 눌러 주세요.</p>
                    </div>
                  )}
                  {!kakaoSharePending && !canUseShare && !canUseCopyFallback && !(areaSub === "office" && officeComparison?.isExtreme) && !dailyLimitReached && (
                    <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 text-slate-700">
                      <p>업계 평균 단가는 모바일에서만 확인할 수 있어요.</p>
                      <p className="mt-1 text-sm">모바일 기기로 접속한 뒤 공유하기를 눌러 주세요.</p>
                      <button type="button" disabled className="mt-3 w-full cursor-not-allowed rounded-xl bg-slate-400 py-3 text-sm font-medium text-white">모바일에서 사용해 주세요</button>
                    </div>
                  )}
                  {!kakaoSharePending && !dailyLimitReached && !overDailyLimit && !shareCancelled && (canUseShare || canUseCopyFallback) && (areaSub !== "office" || !officeComparison?.isExtreme) && (
                    <>
                      {areaSub === "office" && officeComparison && (
                        <div className={`rounded-xl border-2 p-4 ${JUDGE_STYLES[officeComparison.verdict].bg} ${JUDGE_STYLES[officeComparison.verdict].border}`}>
                          {(() => {
                            const j = JUDGE_TYPES[officeComparison.verdict];
                            return (
                              <>
                                <p className="text-2xl">{j.emoji} {j.title}</p>
                                <p className={`mt-1 text-sm font-medium ${JUDGE_STYLES[officeComparison.verdict].text}`}>{j.tagline}</p>
                                {j.tagline2 && <p className="mt-0.5 text-sm opacity-90">{j.tagline2}</p>}
                                <div className="mt-4 space-y-3">
                                  {j.blocks.map((block, bi) => (
                                    <div key={bi} className={`rounded-lg border-l-4 py-2 pl-3 ${JUDGE_STYLES[officeComparison.verdict].borderL} ${bi % 2 === 0 ? "bg-white/60" : "bg-slate-100/60"}`}>
                                      <p className="font-medium text-slate-800">{block.title}</p>
                                      {block.items && <ul className="mt-1 list-inside list-disc text-sm text-slate-600">{block.items.map((item, ii) => <li key={ii}>{item}</li>)}</ul>}
                                      {block.body && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{block.body}</p>}
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {areaSub === "stairs" && stairsComparison && (
                        <div className={`rounded-xl border-2 p-4 ${JUDGE_STYLES[stairsComparison.verdict].bg} ${JUDGE_STYLES[stairsComparison.verdict].border}`}>
                          {(() => {
                            const j = JUDGE_TYPES[stairsComparison.verdict];
                            return (
                              <>
                                <p className="text-2xl">{j.emoji} {j.title}</p>
                                <p className={`mt-1 text-sm font-medium ${JUDGE_STYLES[stairsComparison.verdict].text}`}>{j.tagline}</p>
                                {j.tagline2 && <p className="mt-0.5 text-sm opacity-90">{j.tagline2}</p>}
                                <div className="mt-4 space-y-3">
                                  {j.blocks.map((block, bi) => (
                                    <div key={bi} className={`rounded-lg border-l-4 py-2 pl-3 ${JUDGE_STYLES[stairsComparison.verdict].borderL}`}>
                                      <p className="font-medium text-slate-800">{block.title}</p>
                                      {block.items && <ul className="mt-1 list-inside list-disc text-sm text-slate-600">{block.items.map((item, ii) => <li key={ii}>{item}</li>)}</ul>}
                                      {block.body && <p className="mt-1 whitespace-pre-line text-sm text-slate-600">{block.body}</p>}
                                    </div>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      <p className="text-sm text-slate-600">공유하면 업계 평균 단가와 상세 단가를 확인할 수 있어요.</p>
                      {fromKakao() && hasKakaoShare && hasNativeShare && (
                        <p className="text-xs text-slate-500">카카오톡으로 공유하거나 더보기에서 다른 앱으로 공유할 수 있어요.</p>
                      )}
                      {canUseShare && (
                        <button type="button" onClick={handleShareAndUnlock} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 text-white hover:bg-blue-700">
                          <Share2 className="h-4 w-4" /> 공유하고 업계 평균 단가 보기
                        </button>
                      )}
                      {canUseCopyFallback && (
                        <button type="button" onClick={handleCopyAndUnlock} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 py-2 text-sm text-slate-700">
                          <Copy className="h-4 w-4" /> 링크 복사 후 결과 보기
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* B. 면적 기준 — 공유 후 */}
              {tab === "area" && hasSharedForAnalysis && (areaSub === "office" ? officeComparison : stairsComparison) && (
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="mb-2 font-medium text-slate-800">내 견적 상세 내역</p>
                    {areaSub === "office" && (
                      <>
                        <p className="text-xl font-bold text-slate-900">{formatWon(officeResult.monthlyTotal)}</p>
                        <p className="text-sm text-slate-600">부가세 10% 포함 {formatWon(officeResult.monthlyTotal * 1.1)}</p>
                        <ul className="mt-3 space-y-1 text-sm">
                          {officeResult.breakdown.map((b, i) => (
                            <li key={i} className={`flex justify-between ${b.amount < 0 ? "bg-blue-100/50 -mx-2 px-2 py-0.5 rounded" : ""}`}>
                              <span>{b.label}</span>
                              <span>{b.amount >= 0 ? formatWon(b.amount) : `- ${formatWon(-b.amount)}`}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {areaSub === "stairs" && (
                      <>
                        <p className="text-xl font-bold text-slate-900">{formatWon(stairsResult.monthlyTotal)}</p>
                        <p className="text-sm text-slate-600">부가세 10% 포함 {formatWon(stairsResult.monthlyTotal * 1.1)}</p>
                        <ul className="mt-3 space-y-1 text-sm">
                          {stairsResult.breakdown.map((b, i) => (
                            <li key={i} className={`flex justify-between ${b.amount < 0 ? "bg-blue-100/50 -mx-2 px-2 py-0.5 rounded" : ""}`}>
                              <span>{b.label}</span>
                              <span>{b.amount >= 0 ? formatWon(b.amount) : `- ${formatWon(-b.amount)}`}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                  {areaSub === "office" && officeComparison && (
                    <div className={`rounded-xl border-2 p-4 ${JUDGE_STYLES[officeComparison.verdict].bg} ${JUDGE_STYLES[officeComparison.verdict].border}`}>
                      <p className="mb-2 font-medium">업계 평균 단가</p>
                      <p className="text-center text-lg font-bold text-slate-900">
                        {formatWon(officeComparison.avgAmount * 0.95)} ~ {formatWon(officeComparison.avgAmount * 1.05)}
                      </p>
                      <p className="mt-1 text-center text-sm text-slate-600">부가세 10% 포함 {formatWon(officeComparison.avgAmount * 0.95 * 1.1)} ~ {formatWon(officeComparison.avgAmount * 1.05 * 1.1)}</p>
                      <p className={`mt-2 rounded p-2 text-sm ${verdictColors[officeComparison.verdict]}`}>{JUDGE_LABELS[officeComparison.verdict]}</p>
                    </div>
                  )}
                  {areaSub === "stairs" && stairsComparison && (
                    <div className={`rounded-xl border-2 p-4 ${JUDGE_STYLES[stairsComparison.verdict].bg} ${JUDGE_STYLES[stairsComparison.verdict].border}`}>
                      <p className="mb-2 font-medium">업계 평균 단가</p>
                      <p className="text-center text-lg font-bold text-slate-900">
                        {formatWon(stairsComparison.avgAmount * 0.95)} ~ {formatWon(stairsComparison.avgAmount * 1.05)}
                      </p>
                      <p className="mt-1 text-center text-sm text-slate-600">부가세 10% 포함 {formatWon(stairsComparison.avgAmount * 0.95 * 1.1)} ~ {formatWon(stairsComparison.avgAmount * 1.05 * 1.1)}</p>
                      <p className={`mt-2 rounded p-2 text-sm ${verdictColors[stairsComparison.verdict]}`}>{JUDGE_LABELS[stairsComparison.verdict]}</p>
                    </div>
                  )}
                  <button type="button" onClick={closeModal} className="w-full rounded-xl bg-slate-800 py-3 text-sm font-medium text-white">확인</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 모바일 하단 바 */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-end border-t border-slate-200 bg-white/95 p-3 backdrop-blur md:hidden">
        <div className="min-w-0 text-right text-sm">
          <p className="font-medium text-slate-800">
            {tab === "area" ? formatWon(areaMonthlyTotal) : formatWon(laborResult.recommendedTotal)}
          </p>
          <p className="text-xs text-slate-500">
            {tab === "area" ? "면적" : "인건비"} 기준
          </p>
        </div>
      </div>
      <div className="h-20 md:hidden" aria-hidden />
    </div>
  );
}
