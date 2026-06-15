import { serveMagamPwa } from "@/lib/magam/serve-pwa";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(_req: Request, context: RouteContext) {
  const { path: segments } = await context.params;
  const response = await serveMagamPwa(segments);
  if (!response) {
    return new Response("Not found", { status: 404 });
  }
  return response;
}
