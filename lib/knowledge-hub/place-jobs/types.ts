import type { SolutionPlaceId } from "@/lib/knowledge-hub/solutions/types";

export type PlaceJobStatus = "draft" | "published" | "archived";

export type PlaceJobPollutionLink = {
  label: string;
  /** path under /pollution or /solutions/... */
  href: string;
};

/** 장소별 작업 매뉴얼 — 오염 처방이 아닌 순서·동작·주기 */
export type PlaceJob = {
  id: string;
  placeId: SolutionPlaceId | string;
  slug: string;
  title: string;
  /** 한줄 요약 (장소명이 앞에 붙을 수 있음) */
  summary?: string;
  prepare: string[];
  steps: string[];
  /** 걸레질·솔질 등 동작 팁 */
  motions: string[];
  checklist: string[];
  frequency?: string;
  cautions: string[];
  pollutionLinks?: PlaceJobPollutionLink[];
  /** 기존 /services/... 가이드로 연결 */
  relatedServicePath?: string;
  status: PlaceJobStatus;
  sortOrder: number;
};

export type PlaceJobBody = Pick<
  PlaceJob,
  | "summary"
  | "prepare"
  | "steps"
  | "motions"
  | "checklist"
  | "frequency"
  | "cautions"
  | "pollutionLinks"
  | "relatedServicePath"
>;
