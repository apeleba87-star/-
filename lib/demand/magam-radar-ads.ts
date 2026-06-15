import {
  getRadarNationalAdBanner,
  getRadarRegionalAdBanner,
} from "@/lib/demand/radar-ads";
import { getMagamRadarAdSettings } from "@/lib/demand/magam-radar-ad-settings";
import type { RadarAdBannerPayload } from "@/lib/demand/radar-ads-shared";

export async function getMagamRadarNationalAdBanner(): Promise<RadarAdBannerPayload | null> {
  const settings = await getMagamRadarAdSettings();
  if (!settings.nationalEnabled) return null;
  return getRadarNationalAdBanner();
}

export async function getMagamRadarRegionalAdBanner(
  regionKey: string
): Promise<RadarAdBannerPayload | null> {
  const settings = await getMagamRadarAdSettings();
  if (!settings.regionalEnabled) return null;
  return getRadarRegionalAdBanner(regionKey);
}
