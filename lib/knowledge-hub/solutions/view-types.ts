import type { SolutionPage, SolutionStarRating } from "@/lib/knowledge-hub/solutions/types";

/** Client-safe view DTOs — keep out of get-solutions (server/supabase). */

export type SolutionViewRecommendation = {
  productId?: string;
  label: string;
  brand?: string;
  phApprox?: string | null;
  tip?: string;
  rating: SolutionStarRating;
  dilution?: string;
  href?: string;
};

/** Flattened, UI-ready content for the simplified detail layout */
export type SolutionViewContent = {
  summary: string;
  contaminantTypeLabel: string;
  difficulty?: SolutionStarRating;
  locations: string[];
  recommendations: SolutionViewRecommendation[];
  methodSteps: string[];
  cautions: string[];
  ifFails: string[];
};

export type AssembledSolution = {
  page: SolutionPage;
  path: string;
  placeLabel: string;
  spaceLabel: string;
  partLabel: string;
  contaminantName: string;
  siblings: SolutionPage[];
  content: SolutionViewContent;
};

/** Catalog / hub card DTO — shared by /solutions and /pollution */
export type SolutionCardData = {
  id: string;
  placeId: string;
  spaceId: string;
  partId: string;
  placeLabel: string;
  spaceLabel: string;
  partLabel: string;
  title: string;
  path: string;
};
