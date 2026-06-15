#!/usr/bin/env node
/**
 * 마감링크 Flutter 웹 → Next.js public/magam/app (PWA 배포용)
 *
 * 사용: node scripts/build-magam-pwa.mjs
 * 필요: Flutter SDK (PATH), magam_app/.env
 */
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const magamDir = path.join(root, "magam_app");
const outDir = path.join(root, "public", "magam", "app");
const buildDir = path.join(magamDir, "build", "web");

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

console.log("\n✓ PWA 복사 완료 → public/magam/app");
console.log("  로컬: npm run dev 후 http://localhost:3001/magam/app/");
console.log("  배포: git push → Vercel");
