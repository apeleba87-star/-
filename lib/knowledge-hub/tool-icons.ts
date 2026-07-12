import type { LucideIcon } from "lucide-react";
import {
  Brush,
  Circle,
  Droplets,
  Eraser,
  Paintbrush,
  Shirt,
  SprayCan,
  Square,
  Wind,
} from "lucide-react";

/** 문서 도구명 → 아이콘 (매칭 실패 시 null → 텍스트만) */
export function toolIconFor(label: string): LucideIcon | null {
  const t = label.toLowerCase();
  if (/분무|폼건|거품|스프레이|직분사/.test(t)) return SprayCan;
  if (/걸레|밀대|사각맙|대걸레/.test(t)) return Square;
  if (/천|극세사|헝겊|물수건|마른\s*걸레/.test(t)) return Shirt;
  if (/패드|수세미|울스텐|스펀지/.test(t)) return Circle;
  if (/솔|변기솔/.test(t)) return Brush;
  if (/붓|브러시|브러쉬/.test(t)) return Paintbrush;
  if (/스크래퍼|스크레퍼/.test(t)) return Eraser;
  if (/스퀴지|고무\s*밀대/.test(t)) return Wind;
  if (/물|헹굼|고압/.test(t)) return Droplets;
  return null;
}

/** 작업 단계: 짧은 단계명만 배지로, 본문이 주 정보 */
export function parseWorkStep(step: string): { stage: string | null; body: string } {
  const t = step.trim();
  const colon = t.match(/^([^:]{2,10})\s*[:：]\s*(.+)$/);
  if (colon) {
    const stage = colon[1].trim();
    const body = colon[2].trim();
    // 단계명이 본문만큼 길면 분리 이득 없음 → 통째로
    if (stage.length <= 8 && body.length > stage.length) {
      return { stage, body };
    }
  }
  return { stage: null, body: t };
}

/** @deprecated parseWorkStep 사용 */
export function shortenStepTitle(step: string): { title: string; detail: string | null } {
  const { stage, body } = parseWorkStep(step);
  return stage ? { title: stage, detail: body } : { title: body, detail: null };
}

export function isRinseStep(step: string): boolean {
  return /헹구|헹굼|린스/.test(step);
}
