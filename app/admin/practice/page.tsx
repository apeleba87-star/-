import Link from "next/link";
import PracticePostDeleteButton from "@/components/practice-blog/PracticePostDeleteButton";
import { PRACTICE_HUB, practiceBlogPath } from "@/lib/practice-blog/constants";
import { listAdminPracticePosts } from "@/lib/practice-blog/queries";

export default async function AdminPracticePage() {
  const posts = await listAdminPracticePosts();

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">청소업 실무</h1>
          <p className="mt-1 text-sm text-slate-600">
            칸(메뉴)을 만든 뒤 글을 쓰고, 발행하면 /practice에 공개됩니다.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={PRACTICE_HUB.adminCategoriesHref} className="btn-secondary">
            칸(메뉴) 관리
          </Link>
          <Link href="/admin/practice/new" className="btn-primary">
            새 글
          </Link>
        </div>
      </div>

      <div className="mb-6 rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-3 text-sm leading-6 text-slate-700">
        <p className="font-semibold text-slate-900">관리 방법</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>
            <strong>칸 추가·수정·삭제·숨기기</strong>는 「칸(메뉴) 관리」에서 합니다. 입주청소·에어컨·마케팅처럼
            과정 묶음입니다.
          </li>
          <li>
            <strong>글 추가</strong>는 「새 글」, <strong>수정</strong>은 목록의 수정, <strong>삭제</strong>는 목록
            또는 수정 화면에서 합니다.
          </li>
          <li>발행할 때는 칸을 반드시 고릅니다. 초안은 칸 없이 저장할 수 있습니다.</li>
          <li>
            저장 오류 시 Supabase에{" "}
            <code className="rounded bg-white px-1">203_practice_blog.sql</code> 적용 여부를 확인하세요.
          </li>
        </ul>
      </div>

      {posts.length === 0 ? (
        <p className="text-slate-500">아직 글이 없습니다. 칸을 만든 뒤 새 글을 작성하세요.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white">
          {posts.map((post) => {
            const scheduledMs = post.published_at
              ? new Date(post.published_at).getTime()
              : null;
            const isScheduled = scheduledMs != null && scheduledMs > Date.now();
            const isLive = scheduledMs != null && scheduledMs <= Date.now();
            const scheduledLabel = isScheduled
              ? new Date(post.published_at as string).toLocaleString("ko-KR", {
                  timeZone: "Asia/Seoul",
                  dateStyle: "medium",
                  timeStyle: "short",
                })
              : null;
            return (
              <li
                key={post.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{post.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {post.slug ?? "(슬러그 없음)"}
                    {post.category_name ? ` · ${post.category_name}` : " · 칸 없음"}
                    {" · "}
                    {isScheduled ? (
                      <span className="text-violet-700">예약 · {scheduledLabel}</span>
                    ) : isLive ? (
                      <span className="text-teal-700">발행</span>
                    ) : (
                      <span className="text-amber-700">초안</span>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {post.slug && isLive ? (
                    <Link
                      href={practiceBlogPath(post.slug)}
                      className="rounded bg-slate-100 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-200"
                      target="_blank"
                    >
                      보기
                    </Link>
                  ) : null}
                  <Link
                    href={`/admin/practice/${post.id}/edit`}
                    className="rounded bg-teal-600 px-3 py-1.5 text-sm text-white hover:bg-teal-700"
                  >
                    수정
                  </Link>
                  <PracticePostDeleteButton postId={post.id} title={post.title} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
