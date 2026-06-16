/** 첫 화면·탭 전환 후 무거운 작업을 미룸 — 기능은 그대로, 초기 JS·네트워크 경쟁만 줄임 */
export function runWhenIdle(task: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  if ("requestIdleCallback" in window) {
    const id = window.requestIdleCallback(task, { timeout: 2000 });
    return () => window.cancelIdleCallback(id);
  }

  const timer = setTimeout(task, 1);
  return () => clearTimeout(timer);
}
