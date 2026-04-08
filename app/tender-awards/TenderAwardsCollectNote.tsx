import {
  describeScsbidLookbackDuration,
  getScsbidAwardDefaultLookbackMinutes,
} from "@/lib/g2b/scsbid-ingest-window";

/** 낙찰 원천이 슬라이딩 구간으로 수집된다는 안내(서버 전용). */
export default function TenderAwardsCollectNote() {
  const minutes = getScsbidAwardDefaultLookbackMinutes();
  const durationLabel = describeScsbidLookbackDuration(minutes);
  return (
    <p className="mt-3 max-w-2xl text-sm text-slate-500">
      원천은 수집 실행 시점(KST) 기준으로 나라장터 낙찰정보 API에{" "}
      <strong>개찰일시 조회 구간</strong>을 넣어 가져옵니다. 기본 창은 {durationLabel} 분량이며,{" "}
      <code className="rounded bg-slate-100 px-1 text-xs">SCSBID_AWARD_CRON_LOOKBACK_MINUTES</code>
      로 바꿀 수 있습니다(상한 14일). 아래 목록은 여러 번 수집이 쌓인 요약 전체입니다. 개찰일시·낙찰자·예정·추정가는
      API·연결된 공고에 값이 있을 때만 채워집니다.
    </p>
  );
}
