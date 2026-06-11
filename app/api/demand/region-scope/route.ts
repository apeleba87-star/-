import { NextRequest, NextResponse } from "next/server";
import { DEMAND_MAX_REGION_COMPARE } from "@/lib/demand/regions";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { getCachedDemandRegionScopeData } from "@/lib/demand/region-scope-data";
import type { DemandRegionScopeResponse } from "@/lib/demand/region-scope-data";
import { filterRegionScopePayload } from "@/lib/demand/demand-data-redact";
import { grantDemandRegionScopeAccess } from "@/lib/demand/demand-usage-access";
import { isDemandAdmin } from "@/lib/demand/access";
import { demandRegionSelectionKey, getDemandCity, getDemandDistrictRef } from "@/lib/demand/regions";
import { insertDemandRegionViewEvent } from "@/lib/demand/region-view-events";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

function isValidSelection(sel: unknown): sel is DemandRegionSelection {
  if (!sel || typeof sel !== "object") return false;
  const s = sel as DemandRegionSelection;
  if (s.scope === "national") return true;
  if (s.scope === "city" && typeof s.cityId === "string" && getDemandCity(s.cityId)) {
    return true;
  }
  if (
    s.scope === "district" &&
    typeof s.cityId === "string" &&
    typeof s.guSlug === "string" &&
    getDemandDistrictRef(s.cityId, s.guSlug)
  ) {
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { selections?: unknown; shareTeaser?: boolean };
    const raw = Array.isArray(body?.selections) ? body.selections : [];
    if (raw.length === 0 || raw.length > DEMAND_MAX_REGION_COMPARE) {
      return NextResponse.json({ error: "Invalid selections" }, { status: 400 });
    }
    const selections = raw.filter(isValidSelection);
    if (selections.length !== raw.length) {
      return NextResponse.json({ error: "Invalid region" }, { status: 400 });
    }

    const shareTeaser = body?.shareTeaser === true;

    const isAdmin = await isDemandAdmin();
    const grant = await grantDemandRegionScopeAccess(selections, isAdmin, { shareTeaser });
    const fullPayload = await getCachedDemandRegionScopeData(selections);
    const payload = filterRegionScopePayload(fullPayload, grant.grantedRegionKeys);

    const responseBody: DemandRegionScopeResponse = {
      ...payload,
      access: grant.access,
      quotaBlockedKeys: grant.quotaBlockedKeys,
    };

    try {
      const authSupabase = await createServerSupabase();
      const {
        data: { user },
      } = await authSupabase.auth.getUser();
      const service = createServiceSupabase();
      for (const sel of selections) {
        const key = demandRegionSelectionKey(sel);
        if (key === "national") continue;
        void insertDemandRegionViewEvent(service, {
          region_key: key,
          source: shareTeaser ? "share" : "region_scope",
          user_id: user?.id ?? null,
        });
      }
    } catch {
      // 조회 기록 실패해도 응답은 반환
    }

    return NextResponse.json(responseBody);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
