import DemandGuestLoginCta from "@/components/demand/DemandGuestLoginCta";
import {
  DEMAND_USAGE_QUOTA_MESSAGE,
  type DemandUsageAccess,
} from "@/lib/demand/usage-limits";

type Props = {
  access: DemandUsageAccess;
};

export default function DemandUsageBanner({ access }: Props) {
  if (access.tier === "admin") return null;

  if (access.tier === "guest") {
    return <DemandGuestLoginCta variant="banner" />;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-700">
      <span>
        오늘{" "}
        <strong className="text-slate-900">
          {access.usedCount}/{access.dailyLimit}
        </strong>{" "}
        지역 확인
      </span>
      {access.remaining > 0 ? (
        <span className="text-slate-500"> · 남은 {access.remaining}곳 (KST 0시 초기화)</span>
      ) : (
        <span className="mt-1 block text-amber-800">{DEMAND_USAGE_QUOTA_MESSAGE}</span>
      )}
    </div>
  );
}
