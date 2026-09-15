import { createServiceSupabase } from "@/lib/supabase-server";
import { questionPath } from "@/lib/questions/constants";

/** 내 질문에 답변이 달리면 인앱 알림 (본인 답변 제외) */
export async function notifyQuestionAnswered(input: {
  questionAuthorId: string;
  answerAuthorId: string;
  answerId: string;
  questionId: number;
  questionSlug: string;
  questionTitle: string;
  isOfficial: boolean;
}): Promise<void> {
  if (input.questionAuthorId === input.answerAuthorId) return;

  try {
    const service = createServiceSupabase();
    const path = questionPath(input.questionId, input.questionSlug);
    const title = input.isOfficial
      ? "클린아이덱스 공식 답변이 등록되었습니다"
      : "내 질문에 새 답변이 달렸습니다";
    const body = input.questionTitle.trim().slice(0, 120) || "질문 상세에서 답변을 확인하세요.";

    const { error } = await service.from("user_notifications").insert({
      user_id: input.questionAuthorId,
      dedupe_key: `question_answer:${input.answerId}`,
      kind: "question_answer",
      title,
      body,
      link_path: path,
    });

    if (error) {
      console.error("[questions] notify answer", error.message);
    }
  } catch (e) {
    console.error("[questions] notify answer", e);
  }
}
