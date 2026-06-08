#!/usr/bin/env node
import fs from "fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const key = env.MOLIT_RTMS_TRADE_SERVICE_KEY || env.MOLIT_RTMS_SERVICE_KEY;

async function total(lawd, ym) {
  const u =
    "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade?" +
    new URLSearchParams({ serviceKey: key, LAWD_CD: lawd, DEAL_YMD: ym, pageNo: "1", numOfRows: "10" });
  const x = await (await fetch(u)).text();
  return Number(x.match(/totalCount>(\d+)/)?.[1] ?? -1);
}

for (const ym of ["202505"]) {
  console.log("동해 OLD 42170", ym, await total("42170", ym));
  console.log("동해 NEW 51170", ym, await total("51170", ym));
  console.log("춘천 NEW 51110", ym, await total("51110", ym));
}
