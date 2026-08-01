/**
 * Export Flutter MVP JSON bundle from built knowledge DB.
 * Usage: npx tsx scripts/export-cleanidex-app-bundle.ts
 */
import fs from "fs";
import path from "path";
import { buildAppMvpBundle } from "../lib/cleanidex-app/mvp-bundle";

const ROOT = process.cwd();
const outDirs = [
  path.join(ROOT, "exports"),
  path.join(ROOT, "cleanidex_app", "assets", "data"),
];

const bundle = buildAppMvpBundle();
const json = JSON.stringify(bundle, null, 2);

for (const dir of outDirs) {
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, "mvp_bundle.json");
  fs.writeFileSync(file, json, "utf8");
  console.log(
    `Wrote ${file} (${bundle.products.length} products, ${bundle.contaminants.length} contaminants, ${bundle.recipes.length} recipes)`
  );
}
