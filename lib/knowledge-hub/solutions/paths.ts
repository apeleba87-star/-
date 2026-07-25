import type { SolutionPage } from "@/lib/knowledge-hub/solutions/types";

/** Client-safe path helper — do not import get-solutions from client components. */
export function getSolutionPath(page: Pick<SolutionPage, "placeId" | "spaceId" | "partId" | "slug">): string {
  return `/solutions/${page.placeId}/${page.spaceId}/${page.partId}/${page.slug}`;
}
