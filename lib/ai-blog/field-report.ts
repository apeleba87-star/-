import "server-only";

import { cache } from "react";
import sharp from "sharp";
import { createServiceSupabase } from "@/lib/supabase-server";
import { FIELD_PHOTO_BUCKET } from "@/lib/ai-blog/field-photos";

/** 고객 링크용. 긴 변 480, 전후가 구분되는 화질만 남긴다. */
const REPORT_EDGE = 480;
const REPORT_QUALITY = 45;

const TOKEN = /^[A-Za-z0-9]{16,64}$/;
const SIGN_SECONDS = 60 * 60 * 6;

export type FieldReportPlace = {
  label: string;
  beforeUrl: string | null;
  afterUrl: string | null;
};

export type FieldReport = {
  space: string;
  manager: string;
  service: string;
  period: string;
  issuedOn: string;
  status: "청소 진행중" | "청소 완료";
  places: FieldReportPlace[];
};

type ProjectRow = {
  company_id: string;
  service_type: string | null;
  region_sigungu: string | null;
  region_dong: string | null;
  property_type: string | null;
  area_pyeong: number | string | null;
  work_date: string | null;
  created_at: string | null;
  deleted_at: string | null;
};

type PairRow = {
  label: string | null;
  before_media_id: string | null;
  after_media_id: string | null;
  sort_order: number | null;
};

type MediaRow = {
  id: string;
  preview_path: string | null;
  storage_path: string | null;
};

export const loadFieldReport = cache(async (token: string): Promise<FieldReport | null> => {
  if (!TOKEN.test(token)) return null;
  const supabase = createServiceSupabase();
  const db = supabase.schema("cleanidex");

  const { data: link } = await db
    .from("field_report_links")
    .select("project_id")
    .eq("token", token)
    .maybeSingle();
  if (!link?.project_id) return null;

  const { data: project } = await db
    .from("projects")
    .select(
      "company_id, service_type, region_sigungu, region_dong, property_type, area_pyeong, work_date, created_at, deleted_at",
    )
    .eq("id", link.project_id)
    .maybeSingle();
  const row = project as ProjectRow | null;
  if (!row || row.deleted_at) return null;

  const { data: profile } = await db
    .from("business_profiles")
    .select("owner_name, business_name")
    .eq("company_id", row.company_id)
    .maybeSingle();
  const manager = textOf(profile?.owner_name) || textOf(profile?.business_name);

  const { data: pairRows } = await db
    .from("media_pairs")
    .select("label, before_media_id, after_media_id, sort_order")
    .eq("project_id", link.project_id)
    .order("sort_order", { ascending: true });
  const pairs = (pairRows ?? []) as PairRow[];
  const mediaIds = [
    ...new Set(
      pairs.flatMap((pair) => [pair.before_media_id, pair.after_media_id]).filter((id): id is string => Boolean(id)),
    ),
  ];

  const media = new Map<string, MediaRow>();
  if (mediaIds.length) {
    const { data: mediaRows } = await db
      .from("project_media")
      .select("id, preview_path, storage_path")
      .in("id", mediaIds);
    for (const item of (mediaRows ?? []) as MediaRow[]) media.set(item.id, item);
  }

  const reportFolder = `${row.company_id}/ai-blog/${link.project_id}/report`;
  const { data: reportFiles } = await supabase.storage.from(FIELD_PHOTO_BUCKET).list(reportFolder, { limit: 200 });
  const ready = new Set((reportFiles ?? []).map((file) => file.name));

  const places: FieldReportPlace[] = [];
  for (const pair of pairs) {
    const beforeUrl = await reportPhotoUrl(supabase, row.company_id, link.project_id, pair.before_media_id, media, ready);
    const afterUrl = await reportPhotoUrl(supabase, row.company_id, link.project_id, pair.after_media_id, media, ready);
    if (!beforeUrl && !afterUrl) continue;
    places.push({ label: textOf(pair.label) || "장소", beforeUrl, afterUrl });
  }

  const done = places.length > 0 && places.every((place) => place.beforeUrl && place.afterUrl);
  return {
    space: reportSpace(row),
    manager,
    service: textOf(row.service_type) || "청소",
    period: reportDate(row.work_date || row.created_at),
    issuedOn: reportDate(new Date().toISOString()),
    status: done ? "청소 완료" : "청소 진행중",
    places,
  };
});

async function reportPhotoUrl(
  supabase: ReturnType<typeof createServiceSupabase>,
  companyId: string,
  projectId: string,
  mediaId: string | null,
  media: Map<string, MediaRow>,
  ready: Set<string>,
): Promise<string | null> {
  if (!mediaId) return null;
  const row = media.get(mediaId);
  const sourcePath = row?.preview_path || row?.storage_path || null;
  if (!sourcePath) return null;
  const name = `${mediaId}.jpg`;
  const reportPath = `${companyId}/ai-blog/${projectId}/report/${name}`;
  if (!ready.has(name)) {
    const made = await makeReportJpeg(supabase, sourcePath, reportPath);
    if (!made) return signPath(supabase, sourcePath);
    ready.add(name);
  }
  return signPath(supabase, reportPath);
}

async function makeReportJpeg(
  supabase: ReturnType<typeof createServiceSupabase>,
  sourcePath: string,
  reportPath: string,
): Promise<boolean> {
  const downloaded = await supabase.storage.from(FIELD_PHOTO_BUCKET).download(sourcePath);
  if (downloaded.error || !downloaded.data) return false;
  try {
    const input = Buffer.from(await downloaded.data.arrayBuffer());
    const small = await sharp(input)
      .rotate()
      .resize({ width: REPORT_EDGE, height: REPORT_EDGE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: REPORT_QUALITY, mozjpeg: true })
      .toBuffer();
    const uploaded = await supabase.storage.from(FIELD_PHOTO_BUCKET).upload(reportPath, small, {
      contentType: "image/jpeg",
      upsert: true,
    });
    return !uploaded.error;
  } catch {
    return false;
  }
}

async function signPath(
  supabase: ReturnType<typeof createServiceSupabase>,
  path: string,
): Promise<string | null> {
  const signed = await supabase.storage.from(FIELD_PHOTO_BUCKET).createSignedUrl(path, SIGN_SECONDS);
  return signed.data?.signedUrl ?? null;
}

function reportSpace(row: ProjectRow): string {
  const place = [row.region_sigungu, row.region_dong].map(textOf).filter(Boolean).join(" ");
  const pyeong = pyeongLabel(row.area_pyeong);
  const size = [textOf(row.property_type), pyeong].filter(Boolean).join(" ");
  return [place, size].filter(Boolean).join(" ") || "현장";
}

function pyeongLabel(value: number | string | null): string {
  if (value == null || value === "") return "";
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return "";
  return `${Number.isInteger(number) ? number : number}평`;
}

function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function reportDate(value: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value.replaceAll("-", ".");
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(date)
    .replaceAll("-", ".");
}
