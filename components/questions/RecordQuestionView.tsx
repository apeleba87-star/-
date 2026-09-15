"use client";

import { useEffect, useRef } from "react";
import { recordQuestionViewAction } from "@/app/questions/actions";

const VIEWER_KEY_STORAGE = "qidex_q_viewer";

function getOrCreateViewerKey(): string {
  try {
    const existing = sessionStorage.getItem(VIEWER_KEY_STORAGE);
    if (existing && existing.length >= 8) return existing.slice(0, 80);
    const key = `a:${crypto.randomUUID()}`;
    sessionStorage.setItem(VIEWER_KEY_STORAGE, key);
    return key;
  } catch {
    return `a:${Date.now().toString(36)}`;
  }
}

/** 상세 진입 시 1회 조회수 증가 (Strict Mode 중복 방지 + 세션 키) */
export default function RecordQuestionView({ questionId }: { questionId: number }) {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void recordQuestionViewAction(questionId, getOrCreateViewerKey());
  }, [questionId]);

  return null;
}
