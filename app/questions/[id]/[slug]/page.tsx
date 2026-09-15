import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import QuestionDetailView from "@/components/questions/QuestionDetailView";
import { questionPath } from "@/lib/questions/constants";
import { getPublishedQuestionById } from "@/lib/questions/queries";
import { resolveProductCards } from "@/lib/questions/resolve-entities";
import { buildPageMetadata } from "@/lib/seo";
import { createServerSupabase } from "@/lib/supabase-server";

export const revalidate = 60;

type Props = {
  params: Promise<{ id: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const qid = Number(id);
  if (!Number.isFinite(qid)) return { title: "질문", robots: { index: false } };

  const q = await getPublishedQuestionById(qid);
  if (!q) {
    return {
      title: "질문을 찾을 수 없습니다",
      robots: { index: false, follow: false },
    };
  }

  const description =
    q.body.length > 140 ? `${q.body.slice(0, 140)}…` : q.body;

  return buildPageMetadata({
    title: q.title,
    description,
    path: questionPath(q.id, q.slug),
  });
}

export default async function QuestionDetailPage({ params }: Props) {
  const { id, slug } = await params;
  const qid = Number(id);
  if (!Number.isFinite(qid) || qid < 1) notFound();

  const q = await getPublishedQuestionById(qid);
  if (!q) notFound();

  let pathSlug = slug;
  try {
    pathSlug = decodeURIComponent(slug);
  } catch {
    pathSlug = slug;
  }
  if (pathSlug !== q.slug) {
    permanentRedirect(questionPath(q.id, q.slug));
  }

  const productCards = await resolveProductCards(q.links);

  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let canMarkOfficial = false;
  let canAnswer = Boolean(user);
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, questions_suspended_at")
      .eq("id", user.id)
      .maybeSingle();
    canMarkOfficial =
      profile?.role === "admin" || profile?.role === "editor";
    if (profile?.questions_suspended_at) canAnswer = false;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "QAPage",
    mainEntity: {
      "@type": "Question",
      name: q.title,
      text: q.body,
      dateCreated: q.created_at,
      answerCount: q.answer_count,
      acceptedAnswer: q.answers.find((a) => a.is_official)
        ? {
            "@type": "Answer",
            text: q.answers.find((a) => a.is_official)!.body,
            dateCreated: q.answers.find((a) => a.is_official)!.created_at,
          }
        : undefined,
      suggestedAnswer: q.answers
        .filter((a) => !a.is_official)
        .slice(0, 5)
        .map((a) => ({
          "@type": "Answer",
          text: a.body,
          dateCreated: a.created_at,
        })),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <QuestionDetailView
        question={q}
        productCards={productCards}
        canAnswer={canAnswer}
        canMarkOfficial={canMarkOfficial}
        isLoggedIn={Boolean(user)}
      />
    </>
  );
}
