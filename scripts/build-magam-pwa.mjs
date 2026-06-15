#!/usr/bin/env node
/**
 * 마감링크 Flutter 웹 → Next.js public/magam/app (PWA 배포용)
 *
 * 사용: node scripts/build-magam-pwa.mjs
 * 필요: Flutter SDK (PATH), magam_app/.env
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const magamDir = path.join(root, "magam_app");
const outDir = path.join(root, "public", "magam", "app");
const buildDir = path.join(magamDir, "build", "web");

function ensureMagamEnvFile() {
  const target = path.join(magamDir, ".env");
  if (existsSync(target)) return;

  const sources = [path.join(root, ".env.local"), path.join(root, ".env")];
  for (const source of sources) {
    if (!existsSync(source)) continue;
    const lines = readFileSync(source, "utf8").split(/\r?\n/);
    const picked = lines.filter((line) =>
      /^(NEXT_PUBLIC_SUPABASE_URL|NEXT_PUBLIC_SUPABASE_ANON_KEY|SUPABASE_URL|SUPABASE_ANON_KEY|MAGAM_SHARE_BASE_URL)=/.test(
        line
      )
    );
    if (picked.length === 0) continue;
    writeFileSync(target, `${picked.join("\n")}\n`, "utf8");
    console.log(`✓ magam_app/.env 생성 (${path.basename(source)} 에서 복사)`);
    return;
  }

  console.warn(
    "⚠ magam_app/.env 없음 — 루트 .env.local 에 Supabase 키가 있으면 자동 복사됩니다.\n" +
      "  프로덕션(Vercel)은 서버가 index.html 에 런타임 설정을 주입합니다."
  );
}

ensureMagamEnvFile();

const flutterBin =
  process.env.FLUTTER_ROOT != null
    ? path.join(process.env.FLUTTER_ROOT, "bin", "flutter")
    : "flutter";

const envFile = path.join(magamDir, ".env");
const defineArgs = existsSync(envFile) ? ["--dart-define-from-file=.env"] : [];

const build = spawnSync(
  flutterBin,
  [
    "build",
    "web",
    "--release",
    "--base-href=/magam/app/",
    ...defineArgs,
  ],
  { cwd: magamDir, stdio: "inherit", shell: process.platform === "win32" }
);

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

if (!existsSync(buildDir)) {
  console.error("빌드 출력 없음:", buildDir);
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
cpSync(buildDir, outDir, { recursive: true });

const indexInPublic = path.join(outDir, "index.html");
if (existsSync(indexInPublic)) {
  rmSync(indexInPublic);
  console.log("✓ public/magam/app/index.html 제거 (Next 라우트에서 주입 서빙)");
}

const manifestPath = path.join(outDir, "manifest.json");
if (existsSync(manifestPath)) {
  const manifest = readFileSync(manifestPath, "utf8")
    .replace('"start_url": "."', '"start_url": "/magam/app/"')
    .replace('"scope": "."', '"scope": "/magam/app/"');
  writeFileSync(manifestPath, manifest, "utf8");
}

console.log("\n✓ PWA 복사 완료 → public/magam/app");
console.log("  로컬: npm run dev 후 http://localhost:3001/magam/app/");
console.log("  배포: git push → Vercel");
