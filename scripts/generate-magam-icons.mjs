#!/usr/bin/env node
/**
 * 마감링크 앱 아이콘 생성 (PWA·Flutter·웹 UI 공통)
 *
 * 사용: node scripts/generate-magam-icons.mjs [source.png]
 * 기본 소스: magam_app/assets/icon/app_icon.png
 */
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const defaultSource = path.join(root, "magam_app", "assets", "icon", "app_icon.png");
const source = process.argv[2] ? path.resolve(process.argv[2]) : defaultSource;

if (!existsSync(source)) {
  console.error(`소스 이미지 없음: ${source}`);
  process.exit(1);
}

const targets = [
  { out: path.join(root, "public", "magam", "app", "icons", "Icon-192.png"), size: 192, maskable: false },
  { out: path.join(root, "public", "magam", "app", "icons", "Icon-512.png"), size: 512, maskable: false },
  {
    out: path.join(root, "public", "magam", "app", "icons", "Icon-maskable-192.png"),
    size: 192,
    maskable: true,
  },
  {
    out: path.join(root, "public", "magam", "app", "icons", "Icon-maskable-512.png"),
    size: 512,
    maskable: true,
  },
  { out: path.join(root, "magam_app", "assets", "icon", "app_icon.png"), size: 1024, maskable: false },
  {
    out: path.join(root, "public", "magam", "app", "assets", "assets", "icon", "app_icon.png"),
    size: 512,
    maskable: false,
  },
  { out: path.join(root, "public", "magam", "app", "favicon.png"), size: 192, maskable: false },
];

async function renderIcon(size, maskable) {
  if (!maskable) {
    return sharp(source).resize(size, size, { fit: "cover" }).png().toBuffer();
  }

  const inner = Math.round(size * 0.8);
  const inset = Math.round((size - inner) / 2);
  const resized = await sharp(source).resize(inner, inner, { fit: "cover" }).png().toBuffer();

  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 26, g: 35, b: 78, alpha: 1 },
    },
  })
    .composite([{ input: resized, left: inset, top: inset }])
    .png()
    .toBuffer();
}

for (const { out, size, maskable } of targets) {
  if (path.resolve(out) === path.resolve(source)) {
    console.log(`↷ ${path.relative(root, out)} (소스 유지)`);
    continue;
  }
  const buf = await renderIcon(size, maskable);
  await sharp(buf).toFile(out);
  console.log(`✓ ${path.relative(root, out)} (${size}${maskable ? ", maskable" : ""})`);
}

console.log("마감링크 아이콘 생성 완료");
