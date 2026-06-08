import { getKstTodayString } from "@/lib/jobs/kst-date";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";
import {
  DEMAND_DAILY_REGION_VIEW_LIMIT,
  type DemandAccessTier,
  type DemandUsageAccess,
} from "@/lib/demand/usage-limits";
import { demandRegionSelectionKey, type DemandRegionSelection } from "@/lib/demand/regions";

function buildAccess(
  tier: DemandAccessTier,
  unlockedRegionKeys: string[]
): DemandUsageAccess {
  if (tier === "admin") {
    return {
      tier,
      dailyLimit: DEMAND_DAILY_REGION_VIEW_LIMIT,
      usedCount: unlockedRegionKeys.length,
      remaining: DEMAND_DAILY_REGION_VIEW_LIMIT,
      unlockedRegionKeys,
      canViewData: true,
    };
  }
  if (tier === "guest") {
    return {
      tier,
      dailyLimit: DEMAND_DAILY_REGION_VIEW_LIMIT,
      usedCount: 0,
      remaining: 0,
      unlockedRegionKeys: [],
      canViewData: false,
    };
  }
  const usedCount = unlockedRegionKeys.length;
  const remaining = Math.max(0, DEMAND_DAILY_REGION_VIEW_LIMIT - usedCount);
  return {
    tier,
    dailyLimit: DEMAND_DAILY_REGION_VIEW_LIMIT,
    usedCount,
    remaining,
    unlockedRegionKeys,
    canViewData: true,
  };
}

async function listUnlockedRegionKeys(userId: string, dateKst: string): Promise<string[]> {
  try {
    const supabase = createServiceSupabase();
    const { data, error } = await supabase
      .from("demand_region_daily_views")
      .select("region_key")
      .eq("user_id", userId)
      .eq("date_kst", dateKst)
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((r) => r.region_key as string);
  } catch {
    return [];
  }
}

/** 허브 SSR·API — 현재 사용자 입주레이더 열람 권한 */
export async function getDemandUsageAccess(isAdmin: boolean): Promise<DemandUsageAccess> {
  if (isAdmin) {
    return buildAccess("admin", []);
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return buildAccess("guest", []);
  }

  const dateKst = getKstTodayString();
  const unlocked = await listUnlockedRegionKeys(user.id, dateKst);
  return buildAccess("member", unlocked);
}

export type RegionScopeGrantResult = {
  access: DemandUsageAccess;
  /** 이번 요청에서 full 데이터를 받을 region_key */
  grantedRegionKeys: string[];
  quotaBlockedKeys: string[];
};

/**
 * 지역 scope API — 신규 region_key는 remaining > 0 일 때만 unlock.
 * admin은 전부 grant.
 */
export async function grantDemandRegionScopeAccess(
  selections: DemandRegionSelection[],
  isAdmin: boolean,
  options?: { shareTeaser?: boolean }
): Promise<RegionScopeGrantResult> {
  const keys = selections.map((s) => demandRegionSelectionKey(s));

  if (isAdmin) {
    return {
      access: buildAccess("admin", keys),
      grantedRegionKeys: keys,
      quotaBlockedKeys: [],
    };
  }

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (options?.shareTeaser && selections.length === 1) {
      return {
        access: buildAccess("guest", []),
        grantedRegionKeys: keys,
        quotaBlockedKeys: [],
      };
    }
    return {
      access: buildAccess("guest", []),
      grantedRegionKeys: [],
      quotaBlockedKeys: keys,
    };
  }

  const dateKst = getKstTodayString();
  let unlocked = await listUnlockedRegionKeys(user.id, dateKst);
  const granted: string[] = [];
  const blocked: string[] = [];

  for (const key of keys) {
    if (unlocked.includes(key)) {
      granted.push(key);
      continue;
    }
    if (unlocked.length >= DEMAND_DAILY_REGION_VIEW_LIMIT) {
      blocked.push(key);
      continue;
    }
    try {
      const service = createServiceSupabase();
      const { error } = await service.from("demand_region_daily_views").insert({
        user_id: user.id,
        date_kst: dateKst,
        region_key: key,
      });
      if (error) {
        if (error.code === "23505") {
          unlocked = await listUnlockedRegionKeys(user.id, dateKst);
          if (unlocked.includes(key)) granted.push(key);
          else blocked.push(key);
        } else {
          blocked.push(key);
        }
      } else {
        unlocked.push(key);
        granted.push(key);
      }
    } catch {
      blocked.push(key);
    }
  }

  return {
    access: buildAccess("member", unlocked),
    grantedRegionKeys: granted,
    quotaBlockedKeys: blocked,
  };
}
