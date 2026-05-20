import { WORKNET_INFO_SVC } from "./constants";

/** 워크넷 웹 상세 (고용24 필수 링크 형식) */
export function worknetWebDetailUrl(wantedAuthNo: string): string {
  const no = encodeURIComponent(wantedAuthNo.trim());
  return `https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=${no}&infoTypeCd=${WORKNET_INFO_SVC}&infoTypeGroup=tb_workinfoworknet`;
}

/** 워크넷 모바일 상세 */
export function worknetMobileDetailUrl(wantedAuthNo: string): string {
  const no = encodeURIComponent(wantedAuthNo.trim());
  return `https://m.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=${no}&infoTypeCd=${WORKNET_INFO_SVC}&infoTypeGroup=tb_workinfoworknet`;
}
