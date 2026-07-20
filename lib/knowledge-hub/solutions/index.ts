export type {
  ContaminantMasterExt,
  MaterialContaminantMaster,
  SolutionDetailBody,
  SolutionPage,
  SolutionRecommendProduct,
  SolutionsDb,
  SolutionStarRating,
} from "@/lib/knowledge-hub/solutions/types";
export {
  SOLUTION_PARTS,
  SOLUTION_PLACES,
  SOLUTION_SPACES,
  PRIMARY_PLACE_ORDER,
  PLACE_SPACE_ORDER,
  HOME_BATH_SPACE_IDS,
  HOME_UTILITY_SPACE_IDS,
  HOME_SPACE_ORDER,
  HOME_SPACE_LABELS,
  KITCHEN_PART_ORDER,
  SPACE_PART_LABELS,
  getPartLabel,
  getPlaceLabel,
  getSpaceLabel,
  spaceIdsForUiSelection,
} from "@/lib/knowledge-hub/solutions/taxonomy";
export {
  assembleSolution,
  getContaminantMaster,
  getMergedContaminantMaster,
  getMergedSolutionPage,
  getSolutionPath,
  getSolutionsDb,
  listMergedSolutionPages,
  listSolutionCardData,
  listSolutionPages,
  listSolutionsByContaminant,
  SOLUTIONS_FINDER_SUBTITLE,
  toSolutionCardData,
} from "@/lib/knowledge-hub/solutions/get-solutions";
export type {
  AssembledSolution,
  SolutionCardData,
  SolutionViewContent,
  SolutionViewRecommendation,
} from "@/lib/knowledge-hub/solutions/get-solutions";
export { buildSolutionJsonLd } from "@/lib/knowledge-hub/solutions/solution-jsonld";
