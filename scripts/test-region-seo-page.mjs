#!/usr/bin/env node
import fs from "fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}
for (const [k, v] of Object.entries(env)) {
  if (!process.env[k]) process.env[k] = v;
}

const { getRegionSeoPageData } = await import("../lib/demand/region-seo-data.ts");

try {
  const data = await getRegionSeoPageData("gangwon", "dohaesi-si");
  console.log("ok", data?.pathLabel, data?.row?.jeonseCount, data?.indexable);
} catch (e) {
  console.error("FAIL", e);
  process.exit(1);
}
