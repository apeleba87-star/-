#!/usr/bin/env node
import fs from "fs";

const env = {};
for (const line of fs.readFileSync(".env.local", "utf8").split("\n")) {
  const i = line.indexOf("=");
  if (i < 0) continue;
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const tradeKey = env.MOLIT_RTMS_TRADE_SERVICE_KEY || env.MOLIT_RTMS_SERVICE_KEY;
const rentKey = env.MOLIT_RTMS_RENT_SERVICE_KEY || env.MOLIT_RTMS_SERVICE_KEY;

async function count(endpoint, key, lawd, dealYmd) {
  const params = new URLSearchParams({
    serviceKey: key,
    LAWD_CD: lawd,
    DEAL_YMD: dealYmd,
    pageNo: "1",
    numOfRows: "1000",
  });
  const res = await fetch(`${endpoint}?${params}`);
  const text = await res.text();
  if (!text.trim().startsWith("<")) return -1;
  return Number(text.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? 0);
}

const tradeEp = "https://apis.data.go.kr/1613000/RTMSDataSvcAptTrade/getRTMSDataSvcAptTrade";
const rentEp = "https://apis.data.go.kr/1613000/RTMSDataSvcAptRent/getRTMSDataSvcAptRent";
const dealYmd = "202505";

const cases = [
  ["전주 구45111", "45111"],
  ["전주 52111", "52111"],
  ["군산 구45130", "45130"],
  ["군산 52130", "52130"],
  ["충북 철원43710", "43710"],
  ["경기 부천41190", "41190"],
  ["강원 명주51840", "51840"],
  ["강won 울진51050", "51050"],
  ["경북 울진47930", "47930"],
];

for (const [label, lawd] of cases) {
  const sale = await count(tradeEp, tradeKey, lawd, dealYmd);
  const rent = await count(rentEp, rentKey, lawd, dealYmd);
  console.log(label, { sale, rent });
}
