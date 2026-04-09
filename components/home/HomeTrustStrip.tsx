import { HOME_LANDING } from "@/lib/copy/home-landing";

type Props = {
  tenderCount: number;
  tenderTodayCount: number;
  newsCount: number;
  listingsCount: number;
  jobsOpenCount: number;
  syncedLabel: string;
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200/60 bg-white/80 px-3 py-2.5 shadow-sm sm:px-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-900 sm:text-xl">{value}</p>
    </div>
  );
}

/** 실데이터만 표시 — 부모 카드 안에서 이중 테두리 최소화 */
export default function HomeTrustStrip({
  tenderCount,
  tenderTodayCount,
  newsCount,
  listingsCount,
  jobsOpenCount,
  syncedLabel,
}: Props) {
  return (
    <div className="rounded-2xl border border-zinc-200/50 bg-white/40 p-4 sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="shrink-0 text-center lg:max-w-xs lg:text-left">
          <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-zinc-400">
            {HOME_LANDING.trustEyebrow}
          </p>
          <p className="mt-0.5 text-sm font-semibold text-zinc-800">{HOME_LANDING.trustTitle}</p>
          <p
            className="mt-1 inline-flex items-center justify-center gap-1.5 text-[0.6875rem] text-zinc-500 lg:justify-start"
            title={syncedLabel}
          >
            <span className="h-1 w-1 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            {syncedLabel}
          </p>
        </div>
        <div className="grid min-w-0 flex-1 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5 lg:gap-3">
          <Stat label="접수 중 입찰" value={`${tenderCount.toLocaleString("ko-KR")}건`} />
          <Stat label="오늘 신규" value={`${tenderTodayCount.toLocaleString("ko-KR")}건`} />
          <Stat label="오늘 발행" value={`${newsCount.toLocaleString("ko-KR")}건`} />
          <Stat label="거래 게시" value={`${listingsCount.toLocaleString("ko-KR")}건`} />
          <Stat label="구인 중" value={`${jobsOpenCount.toLocaleString("ko-KR")}건`} />
        </div>
      </div>
    </div>
  );
}
