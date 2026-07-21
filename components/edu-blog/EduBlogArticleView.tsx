import Link from "next/link";
import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { BookOpen } from "lucide-react";
import EduBlogNextRelated from "@/components/edu-blog/EduBlogNextRelated";
import EduBlogProducts from "@/components/edu-blog/EduBlogProducts";
import { eduIntentLabel } from "@/lib/edu-blog/constants";
import type { EduBlogPost } from "@/lib/edu-blog/queries";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";

type Props = {
  post: EduBlogPost;
  nextPost: EduBlogPost | null;
  relatedPosts: EduBlogPost[];
  products: KnowledgeProduct[];
};

const markdownComponents: Components = {
  h1: ({ children }) => (
    <h2 className="mt-10 scroll-mt-24 border-b border-slate-100 pb-3 text-2xl font-black tracking-tight text-slate-950 first:mt-0 sm:text-3xl">
      {children}
    </h2>
  ),
  h2: ({ children }) => (
    <h2 className="mt-10 scroll-mt-24 border-b border-slate-100 pb-3 text-2xl font-black tracking-tight text-slate-950 first:mt-0 sm:text-3xl">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-8 scroll-mt-24 text-xl font-black tracking-tight text-slate-900 first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="mt-4 text-base leading-8 text-slate-700 first:mt-0">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="mt-4 space-y-2.5 [&_li]:rounded-2xl [&_li]:border [&_li]:border-slate-100 [&_li]:bg-slate-50/90 [&_li]:px-4 [&_li]:py-3">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="mt-4 list-decimal space-y-3 pl-6 marker:font-black marker:text-teal-700 [&_li]:pl-1">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-base leading-7 text-slate-700">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-6 rounded-2xl border border-teal-200 bg-teal-50/80 px-5 py-4 text-base font-medium leading-8 text-teal-950 [&_p]:mt-0">
      {children}
    </blockquote>
  ),
  strong: ({ children }) => (
    <strong className="font-extrabold text-slate-950">{children}</strong>
  ),
  a: ({ href, children }) => (
    <a
      href={href}
      className="font-bold text-teal-700 underline decoration-teal-200 underline-offset-2 hover:text-teal-900"
    >
      {children}
    </a>
  ),
  hr: () => <hr className="my-10 border-slate-200" />,
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function EduBlogArticleView({
  post,
  nextPost,
  relatedPosts,
  products,
}: Props) {
  const intent = eduIntentLabel(post.edu_intent);

  return (
    <article className="mx-auto max-w-3xl rounded-[2rem] border border-slate-200/80 bg-white p-5 shadow-sm sm:p-8 lg:p-10">
      <header className="border-b border-slate-100 pb-7">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800 ring-1 ring-teal-100 transition hover:bg-teal-100"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden />
            청소지식
          </Link>
          {intent ? (
            <span className="inline-flex rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-800 ring-1 ring-violet-100">
              {intent}
            </span>
          ) : null}
        </div>

        <h1 className="mt-4 text-3xl font-black leading-tight tracking-tight text-slate-950 sm:text-4xl">
          {post.title}
        </h1>

        <time
          dateTime={post.published_at}
          className="mt-3 block text-sm font-medium text-slate-500"
        >
          {formatDate(post.published_at)}
        </time>

        {post.excerpt ? (
          <p className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4 text-base leading-8 text-slate-700 sm:px-5">
            {post.excerpt}
          </p>
        ) : null}
      </header>

      <div className="edu-blog-body mt-2">
        {post.body ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {post.body}
          </ReactMarkdown>
        ) : (
          <p className="mt-6 text-slate-500">본문이 없습니다.</p>
        )}
      </div>

      <EduBlogNextRelated nextPost={nextPost} relatedPosts={relatedPosts} />
      <EduBlogProducts products={products} />
    </article>
  );
}
