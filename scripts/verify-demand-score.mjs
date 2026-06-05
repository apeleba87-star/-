#!/usr/bin/env node
/**
 * V1 지역수요점수 sanity check (tsx 없이 node — ts compile 경유 생략, 수식만)
 */
function weightedNational(moms, handFreeMissing) {
  const w = { p: 0.4, m: 0.3, h: 0.3 };
  if (handFreeMissing) {
    return Math.round((moms.p * w.p + moms.m * w.m) / (w.p + w.m) * 10) / 10;
  }
  return Math.round((moms.p * w.p + moms.m * w.m + moms.h * w.h) * 10) / 10;
}
function rtmsIndex(sale, jeonse) {
  return Math.round((100 + jeonse * 0.7 + sale * 0.3) * 10) / 10;
}
function final(nat, rtms) {
  return Math.round((nat * rtms) / 100 * 10) / 10;
}

const nat = 100 + weightedNational({ p: 20, m: 10, h: 0 }, true);
const gangbuk = final(nat, rtmsIndex(25, 40));
const nowon = final(nat, rtmsIndex(-15, -20));
console.log("전국:", nat);
console.log("강북구:", gangbuk);
console.log("노원구:", nowon);
if (gangbuk <= nowon) {
  console.error("FAIL");
  process.exit(1);
}
console.log("OK");
