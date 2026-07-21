import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { eduBlogPath, eduIntentLabel } from "@/lib/edu-blog/constants";
import type { EduBlogPost } from "@/lib/edu-blog/queries";

type Props = {
  nextPost: EduBlogPost | null;
  relatedPosts: EduBlogPost[];
};

export default function EduBlogNextRelated({ nextPost, relatedPosts }: Props) {
  if (!nextPost && relatedPosts.length === 0) return null;

  return (
    <section className="mt-10 space-y-6" aria-labelledby="edu-blog-next-heading">
      <h2 id="edu-blog-next-heading" className="text-lg font-black text-slate-900">
        다음 글
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {nextPost ? (
          <li>
            <Link
              href={eduBlogPath(nextPost.slug)}
              className="group flex min-h-[44px] flex-col gap-1 rounded-2xl border border-teal-200 bg-teal-50/50 p-4 shadow-sm transition hover:border-teal-300 hover:shadow-md"
            >
              <span className="text-xs font-bold text-teal-700">다음</span>
              <span className="flex items-start justify-between gap-2">
                <span className="font-bold text-slate-900 group-hover:text-teal-800">
                  {nextPost.title}
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" aria-hidden />
              </span>
              {eduIntentLabel(nextPost.edu_intent) ? (
                <span className="text-xs text-slate-500">{eduIntentLabel(nextPost.edu_intent)}</span>
              ) : null}
            </Link>
          </li>
        ) : null}
        {relatedPosts.map((post) => (
          <li key={post.id}>
            <Link
              href={eduBlogPath(post.slug)}
              className="group flex min-h-[44px] flex-col gap-1 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-200 hover:shadow-md"
            >
              <span className="text-xs font-bold text-slate-500">관련</span>
              <span className="flex items-start justify-between gap-2">
                <span className="font-bold text-slate-900 group-hover:text-teal-800">
                  {post.title}
                </span>
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 group-hover:text-teal-600" aria-hidden />
              </span>
              {eduIntentLabel(post.edu_intent) ? (
                <span className="text-xs text-slate-500">{eduIntentLabel(post.edu_intent)}</span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
