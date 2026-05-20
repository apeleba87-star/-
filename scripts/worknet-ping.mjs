/**
 * 워크넷 API 키만 검증 (DB 불필요)
 *   node scripts/worknet-ping.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function loadKey(name) {
  for (const f of [".env.local", ".env"]) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.trim().match(new RegExp(`^${name}\\s*=\\s*(.*)$`));
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (v) return v;
    }
  }
  return "";
}

const authKey = loadKey("WORKNET_API_KEY");
if (!authKey) {
  console.error("WORKNET_API_KEY 없음 (.env.local 확인)");
  process.exit(1);
}

const url = new URL(
  "https://www.work24.go.kr/cm/openApi/call/wk/callOpenApiSvcInfo210L01.do"
);
url.searchParams.set("authKey", authKey);
url.searchParams.set("callTp", "L");
url.searchParams.set("returnType", "XML");
url.searchParams.set("startPage", "1");
url.searchParams.set("display", "5");
url.searchParams.set("keyword", "청소");
url.searchParams.set("regDate", "W-2");

const res = await fetch(url.toString());
const text = await res.text();
const totalM = text.match(/<total>\s*(\d+)\s*<\/total>/i);
const wantedCount = (text.match(/<wanted>/gi) ?? []).length;
const errM = text.match(/<message>\s*([^<]+)\s*<\/message>/i);

console.log("HTTP", res.status);
console.log("total:", totalM?.[1] ?? "?");
console.log("wanted in page:", wantedCount);
if (errM) console.log("message:", errM[1].trim());
if (wantedCount > 0) {
  console.log("OK — 채용정보 API 키가 동작합니다.");
} else {
  console.log("응답 일부:", text.slice(0, 400));
  process.exit(1);
}
