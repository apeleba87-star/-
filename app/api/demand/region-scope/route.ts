import { NextRequest, NextResponse } from "next/server";
import { DEMAND_MAX_REGION_COMPARE } from "@/lib/demand/regions";
import type { DemandRegionSelection } from "@/lib/demand/regions";
import { getCachedDemandRegionScopeData } from "@/lib/demand/region-scope-data";
import type { DemandRegionScopeResponse } from "@/lib/demand/region-scope-data";
import { filterRegionScopePayload } from "@/lib/demand/demand-data-redact";
import { grantDemandRegionScopeAccess } from "@/lib/demand/demand-usage-access";
import { isDemandAdmin } from "@/lib/demand/access";
import { getDemandCity, getDemandDistrictRef } from "@/lib/demand/regions";

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
    const body = (await req.json()) as { selections?: unknown };
    const raw = Array.isArray(body?.selections) ? body.selections : [];
    if (raw.length === 0 || raw.length > DEMAND_MAX_REGION_COMPARE) {
      return NextResponse.json({ error: "Invalid selections" }, { status: 400 });
    }
    const selections = raw.filter(isValidSelection);
    if (selections.length !== raw.length) {
      return NextResponse.json({ error: "Invalid region" }, { status: 400 });
    }

    const isAdmin = await isDemandAdmin();
    const grant = await grantDemandRegionScopeAccess(selections, isAdmin);
    const fullPayload = await getCachedDemandRegionScopeData(selections);
    const payload = filterRegionScopePayload(fullPayload, grant.grantedRegionKeys);

    const responseBody: DemandRegionScopeResponse = {
      ...payload,
      access: grant.access,
      quotaBlockedKeys: grant.quotaBlockedKeys,
    };
    return NextResponse.json(responseBody);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
