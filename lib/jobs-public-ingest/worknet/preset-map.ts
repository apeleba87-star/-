import { JOB_TYPE_PRESETS } from "@/lib/jobs/job-type-presets";

export type PresetMatch = { key: string; label: string } | null;

/** 제목·업종·직종 텍스트 → 내부 프리셋 (없으면 null) */
const PRESET_RULES: { key: string; label: string; patterns: RegExp[] }[] = [
  ...JOB_TYPE_PRESETS.map((p) => ({
    key: p.key,
    label: p.label,
    patterns: [new RegExp(p.label.replace(/\s/g, ""), "i"), new RegExp(p.key, "i")],
  })),
  { key: "office", label: "사무실청소", patterns: [/사무실.?청소/, /오피스.?청소/, /사무실청소/] },
  { key: "kindergarten", label: "어린이집·학교", patterns: [/어린이집/, /유치원/, /학교/, /교육시설/] },
  { key: "disinfection", label: "소독·방역", patterns: [/소독/, /방역/, /감염/] },
  { key: "general_cleaning", label: "청소·미화", patterns: [/청소/, /미화원/, /환경미화/, /미화/] },
];

export function matchJobPreset(...texts: (string | null | undefined)[]): PresetMatch {
  const blob = texts.filter(Boolean).join(" ");
  if (!blob.trim()) return null;
  for (const rule of PRESET_RULES) {
    if (rule.patterns.some((re) => re.test(blob))) {
      return { key: rule.key, label: rule.label };
    }
  }
  return null;
}
