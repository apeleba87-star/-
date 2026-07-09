import type { KnowledgeRecipe } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { ALL_CATALOG_PATHS } from "@/lib/knowledge-hub/catalog";

type Rule = {
  pattern: RegExp;
  suffixes?: string[];
  paths?: string[];
};

const RULES: Rule[] = [
  { pattern: /화장실|변기|욕실|샤워/, suffixes: ["/restroom", "/bathroom", "/shower"] },
  { pattern: /유리|창문|샷시|거울/, suffixes: ["/glass", "/windows", "/mirror-glass", "/interior", "/limescale"] },
  { pattern: /바닥|데코|마루|에폭시/, suffixes: ["/floor"] },
  { pattern: /주방|싱크|기름/, suffixes: ["/kitchen", "/oil-grease"] },
  { pattern: /계단|난간/, suffixes: ["/handrail", "/tread", "/stairwell"] },
  { pattern: /공장|창고|산업|분진/, paths: ["/services/factory-regular/overview", "/services/factory-regular/floor", "/services/factory-regular/oil-grease"] },
  { pattern: /헬스|운동|락커/, paths: ["/services/gym-regular/overview", "/services/gym-regular/floor", "/services/gym-regular/equipment"] },
  { pattern: /병원|클리닉|소독/, paths: ["/services/hospital-regular/overview", "/services/disinfection/overview"] },
  { pattern: /학교|학원|교실/, paths: ["/services/school-regular/overview", "/services/school-regular/classroom"] },
  { pattern: /입주/, paths: ["/services/move-in/overview"] },
  { pattern: /퇴거|이사/, paths: ["/services/move-out/overview"] },
  { pattern: /준공|리모델|공사|백시멘트|시멘트/, paths: ["/services/renovation/overview", "/services/renovation/cement", "/services/move-in/dust"] },
  { pattern: /외벽|베란다/, paths: ["/services/exterior-one-time/overview", "/services/move-in/balcony"] },
  { pattern: /곰팡이/, paths: ["/guides/mold-tile", "/guides/mold-silicone"] },
  { pattern: /물때|석회|요석/, paths: ["/guides/water-glass", "/guides/water-faucet"] },
  { pattern: /스테인|싱크/, paths: ["/guides/oil-stainless"] },
];

const SERVICE_PREFIXES = [
  "/services/office-regular",
  "/services/commercial-regular",
  "/services/stairs-regular",
  "/services/move-in",
  "/services/factory-regular",
  "/services/gym-regular",
  "/services/hospital-regular",
  "/services/school-regular",
  "/services/building-regular",
  "/services/apartment-common",
  "/services/move-out",
  "/services/renovation",
  "/services/window-one-time",
  "/services/exterior-one-time",
  "/services/disinfection",
];

function pathsFromSuffixes(suffixes: string[]): string[] {
  const found: string[] = [];
  for (const prefix of SERVICE_PREFIXES) {
    for (const suffix of suffixes) {
      const full = `${prefix}${suffix}`;
      if (ALL_CATALOG_PATHS.includes(full)) found.push(full);
    }
  }
  return found;
}

function resolveRule(rule: Rule): string[] {
  const fromSuffix = rule.suffixes ? pathsFromSuffixes(rule.suffixes) : [];
  const explicit = (rule.paths ?? []).filter((p) => ALL_CATALOG_PATHS.includes(p));
  return [...fromSuffix, ...explicit];
}

export function enrichedGuidePathsForRecipe(recipe: KnowledgeRecipe): string[] {
  const base = recipe.guidePaths ?? [];
  const hay = `${recipe.field} ${recipe.summary} ${recipe.slug}`;
  const inferred: string[] = [];
  for (const rule of RULES) {
    if (rule.pattern.test(hay)) inferred.push(...resolveRule(rule));
  }
  return [...new Set([...base, ...inferred])].filter((p) => ALL_CATALOG_PATHS.includes(p));
}

export function recipeMatchesGuidePath(recipe: KnowledgeRecipe, path: string): boolean {
  return enrichedGuidePathsForRecipe(recipe).includes(path);
}
