import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  PLACE_JOBS_CACHE_TAG,
  archivePlaceJob,
  upsertPlaceJob,
} from "@/lib/knowledge-hub/place-jobs/store";
import type { PlaceJob, PlaceJobPollutionLink } from "@/lib/knowledge-hub/place-jobs/types";
import { getPlaceJobPath } from "@/lib/knowledge-hub/place-jobs/shared";

function asList(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.trim().length > 0).map((s) => s.trim());
}

function asLinks(v: unknown): PlaceJobPollutionLink[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: PlaceJobPollutionLink[] = [];
  for (const item of v) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const label = typeof o.label === "string" ? o.label.trim() : "";
    const href = typeof o.href === "string" ? o.href.trim() : "";
    if (label && href) out.push({ label, href });
  }
  return out.length ? out : undefined;
}

async function requireEditor() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: NextResponse.json({ ok: false, error: "로그인이 필요합니다." }, { status: 401 }) };
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "editor") {
    return { error: NextResponse.json({ ok: false, error: "권한이 없습니다." }, { status: 403 }) };
  }
  return { user };
}

function parseJob(body: Record<string, unknown>): { ok: true; job: PlaceJob } | { ok: false; error: string } {
  const placeId = typeof body.placeId === "string" ? body.placeId.trim() : "";
  const slugRaw = typeof body.slug === "string" ? body.slug.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!placeId || !title) return { ok: false, error: "장소·제목은 필수입니다." };
  const slug = (slugRaw || title)
    .toLowerCase()
    .replace(/[^a-z0-9가-힣-_]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "") || "job";
  const id =
    typeof body.id === "string" && body.id.trim()
      ? body.id.trim()
      : `${placeId}__${slug}`;
  const status =
    body.status === "published" ? "published" : body.status === "archived" ? "archived" : "draft";

  return {
    ok: true,
    job: {
      id,
      placeId,
      slug,
      title,
      summary: typeof body.summary === "string" && body.summary.trim() ? body.summary.trim() : undefined,
      prepare: asList(body.prepare),
      steps: asList(body.steps),
      motions: asList(body.motions),
      checklist: asList(body.checklist),
      frequency:
        typeof body.frequency === "string" && body.frequency.trim() ? body.frequency.trim() : undefined,
      cautions: asList(body.cautions),
      pollutionLinks: asLinks(body.pollutionLinks),
      relatedServicePath:
        typeof body.relatedServicePath === "string" && body.relatedServicePath.trim()
          ? body.relatedServicePath.trim()
          : undefined,
      status,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    },
  };
}

export async function PUT(req: Request) {
  try {
    const auth = await requireEditor();
    if ("error" in auth && auth.error) return auth.error;
    const { user } = auth as { user: { id: string } };

    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseJob(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const { job } = parsed;
    const result = await upsertPlaceJob(job, user.id);
    if (!result.ok) return NextResponse.json(result, { status: 400 });

    revalidateTag(PLACE_JOBS_CACHE_TAG, { expire: 0 });
    revalidatePath("/places");
    revalidatePath(getPlaceJobPath(job));

    return NextResponse.json({ ok: true, id: job.id, path: getPlaceJobPath(job) });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireEditor();
    if ("error" in auth && auth.error) return auth.error;
    const { user } = auth as { user: { id: string } };

    const body = (await req.json()) as Record<string, unknown>;
    const parsed = parseJob(body);
    if (!parsed.ok) {
      return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
    }
    const job = { ...parsed.job, status: "archived" as const };
    const result = await archivePlaceJob(job, user.id);
    if (!result.ok) return NextResponse.json(result, { status: 400 });

    revalidateTag(PLACE_JOBS_CACHE_TAG, { expire: 0 });
    revalidatePath("/places");
    revalidatePath(getPlaceJobPath(job));

    return NextResponse.json({ ok: true, id: job.id });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "서버 오류" },
      { status: 500 }
    );
  }
}
