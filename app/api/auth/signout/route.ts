import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  await supabase.auth.signOut();
  const origin = req.nextUrl.origin;
  return NextResponse.redirect(`${origin}/`, 302);
}
