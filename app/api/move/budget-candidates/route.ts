import { NextResponse } from "next/server";
import { getMoveBudgetCandidates } from "@/lib/move/budget-candidates";
import type { MoveDealType, MoveHousingType } from "@/lib/move/budget-types";
import { createServiceSupabase } from "@/lib/supabase-server";

type BudgetCandidatesRequest = {
  dealTypes?: MoveDealType[];
  housingTypes?: MoveHousingType[];
  regionKeys?: string[];
  budgetMin?: number;
  budgetMax?: number;
  monthlyMin?: number;
  monthlyMax?: number;
  lookbackMonths?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as BudgetCandidatesRequest;
    const candidates = await getMoveBudgetCandidates(createServiceSupabase(), {
      monthsBack: body.lookbackMonths,
      dealTypes: body.dealTypes,
      housingTypes: body.housingTypes,
      regionKeys: body.regionKeys,
      budgetMin: body.budgetMin,
      budgetMax: body.budgetMax,
      monthlyMin: body.monthlyMin,
      monthlyMax: body.monthlyMax,
    });

    return NextResponse.json({ ok: true, candidates });
  } catch {
    return NextResponse.json({ ok: false, candidates: [] }, { status: 500 });
  }
}
