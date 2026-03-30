import fs from "fs";
import simplify from "@turf/simplify";

const src = new URL("../lib/maps/skorea-provinces.geojson", import.meta.url);
const out = new URL("../lib/maps/skorea-provinces-simple.json", import.meta.url);
const geo = JSON.parse(fs.readFileSync(src, "utf8"));

for (const f of geo.features) {
  const s = simplify(f, { tolerance: 0.012, highQuality: false });
  f.geometry = s.geometry;
}

fs.writeFileSync(out, JSON.stringify(geo));
console.log("written", out.pathname, "bytes", fs.statSync(out).size);
