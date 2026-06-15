import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { injectMagamPwaRuntimeConfig } from "@/lib/magam/pwa-runtime-config";

/** 정적 에셋 (JS·wasm·아이콘) — public 에 두되 index.html 은 제외 */
const PWA_ASSETS = path.join(process.cwd(), "public", "magam", "app");

/** SPA shell — Next 라우트에서만 서빙 (Supabase 런타임 주입) */
const PWA_INDEX = path.join(process.cwd(), "magam_app", "web", "index.html");

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

function safeAssetPath(segments: string[] | undefined): string | null {
  const rel = (segments ?? []).join("/");
  const normalized = path.normalize(rel).replace(/^(\.\.(\/|\\|$))+/, "");
  const candidate = path.join(PWA_ASSETS, normalized);
  const rootWithSep = `${PWA_ASSETS}${path.sep}`;

  if (candidate !== PWA_ASSETS && !candidate.startsWith(rootWithSep)) {
    return null;
  }
  if (!rel) return null;
  if (!existsSync(candidate) || candidate.endsWith(path.sep)) return null;
  return candidate;
}

async function serveIndexHtml(): Promise<Response | null> {
  if (!existsSync(PWA_INDEX)) return null;
  const raw = await readFile(PWA_INDEX, "utf8");
  const html = injectMagamPwaRuntimeConfig(raw);
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}

export async function serveMagamPwa(segments: string[] | undefined): Promise<Response | null> {
  const assetPath = safeAssetPath(segments);
  if (assetPath) {
    const raw = await readFile(assetPath);
    const ext = path.extname(assetPath).toLowerCase();
    return new Response(raw, {
      headers: {
        "Content-Type": MIME_BY_EXT[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  }

  return serveIndexHtml();
}
