export type MagamKakaoShareOutcome = "opened" | "copied" | "failed";

/** 카카오톡 앱으로 공유 시도 — 실패 시 클립보드 복사 */
export async function shareToKakaoTalk(text: string): Promise<MagamKakaoShareOutcome> {
  const encoded = encodeURIComponent(text);
  const targets = [
    `kakaotalk://send?text=${encoded}`,
    `kakaolink://send?text=${encoded}`,
  ];

  for (const url of targets) {
    try {
      window.location.href = url;
      return "opened";
    } catch {
      continue;
    }
  }

  try {
    await navigator.clipboard.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

export function magamKakaoShareToast(outcome: MagamKakaoShareOutcome): string {
  switch (outcome) {
    case "opened":
      return "카카오톡에서 공유할 채팅방을 선택하세요.";
    case "copied":
      return "PC에서는 카카오톡 앱이 없어요. 내용이 복사됐으니 카톡에 붙여넣으세요.";
    default:
      return "카카오톡을 열 수 없습니다. 링크 복사 후 카톡에 붙여넣어 주세요.";
  }
}
