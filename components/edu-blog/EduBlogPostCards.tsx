import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { eduBlogPath, eduIntentLabel } from "@/lib/edu-blog/constants";
import type { EduBlogPost } from "@/lib/edu-blog/queries";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shortExcerpt(excerpt: string | null, max = 72): string | null {
  if (!excerpt) return null;
  const oneLine = excerpt.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max).trim()}…`;
}

export default function EduBlogPostCards({
  posts,
  categoryLabelById,
}: {
  posts: EduBlogPost[];
  categoryLabelById?: Map<string, string>;
}) {
  const useGrid = posts.length >= 2;
  return (
    <ul
      className={
        useGrid ? "mt-8 grid gap-4 sm:grid-cols-2" : "mx-auto mt-8 max-w-2xl space-y-4"
      }
    >
      {posts.map((post) => {
        const intent = eduIntentLabel(post.edu_intent);
        const excerpt = shortExcerpt(post.excerpt);
        const categoryLabel =
          post.edu_category_id && categoryLabelById
            ? categoryLabelById.get(post.edu_category_id)
            : null;
        return (
          <li key={post.id}>
            <Link
              href={eduBlogPath(post.slug)}
              className="group flex h-full flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md sm:p-6"
            >
              {categoryLabel || intent ? (
                <span className="flex flex-wrap gap-1.5">
                  {categoryLabel ? (
                    <span className="inline-flex w-fit rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-bold text-teal-800 ring-1 ring-teal-100">
                      {categoryLabel}
                    </span>
                  ) : null}
                  {intent ? (
                    <span className="inline-flex w-fit rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-bold text-violet-800 ring-1 ring-violet-100">
                      {intent}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <span className="mt-3 block text-xl font-black leading-snug tracking-tight text-slate-950 group-hover:text-teal-800 sm:text-2xl">
                {post.title}
              </span>
              {excerpt ? (
                <span className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600">
                  {excerpt}
                </span>
              ) : null}
              <span className="mt-auto flex items-center justify-between gap-3 pt-5 text-sm">
                <time dateTime={post.published_at} className="font-medium text-slate-500">
                  {formatDate(post.published_at)}
                </time>
                <span className="inline-flex items-center gap-1 font-bold text-teal-800">
                  읽어보기
                  <ArrowRight
                    className="h-4 w-4 transition group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
