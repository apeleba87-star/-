import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

const PWA_ROOT = path.join(process.cwd(), "public", "magam", "app");

const MIME_BY_EXT: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".wasm": "application/wasm",
  ".png": "image/png",
  ".bin": "application/octet-stream",
  ".frag": "text/plain; charset=utf-8",
  ".otf": "font/otf",
  ".ttf": "font/ttf",
};

function resolvePwaFile(segments: string[] | undefined): string | null {
  const rel = (segments ?? []).join("/");
  const normalized = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidate = path.join(PWA_ROOT, normalized);
  const rootWithSep = `${PWA_ROOT}${path.sep}`;

  if (candidate !== PWA_ROOT && !candidate.startsWith(rootWithSep)) {
    return null;
  }

  if (!rel) {
    return path.join(PWA_ROOT, "index.html");
  }

  if (existsSync(candidate) && !candidate.endsWith(path.sep)) {
    return candidate;
  }

  return path.join(PWA_ROOT, "index.html");
}

export async function serveMagamPwa(segments: string[] | undefined): Promise<Response | null> {
  const filePath = resolvePwaFile(segments);
  if (!filePath || !existsSync(filePath)) {
    return null;
  }

  const body = await readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const isHtml = ext === ".html";

  return new Response(body, {
    headers: {
      "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
      "Cache-Control": isHtml ? "no-cache" : "public, max-age=31536000, immutable",
    },
  });
}
