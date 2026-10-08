"use client";

import { PhotoThumb } from "@/components/ai-blog/PhotoSource";
import { groupBlocks, type PhotoLayout, type ResolvedImage } from "@/components/ai-blog/content-helpers";
import type { ContentBlock, ImageBlock } from "@/lib/ai-blog/types";

/** 네이버 블로그 본문과 비슷한 모양의 미리보기. 실제 네이버 화면과 글꼴·여백은 조금 다를 수 있다. */
export default function NaverPreview({
  title,
  blocks,
  images,
  businessName,
  layout,
  onLayout,
}: {
  title: string;
  blocks: ContentBlock[];
  images: Map<string, ResolvedImage>;
  businessName: string;
  layout: PhotoLayout;
  onLayout: (l: PhotoLayout) => void;
}) {
  const photo = (b: ImageBlock, className: string) => {
    const img = images.get(b.id);
    return <PhotoThumb photo={img?.photo ?? null} name={img?.media?.local_name} className={className} />;
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-[#03c75a] px-4 py-2 text-xs font-semibold text-white">
        네이버 블로그 미리보기
        <div className="flex-1" />
        <span className="font-normal">전후 사진</span>
        {(["side", "stack"] as const).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onLayout(l)}
            className={`rounded-full px-2 py-0.5 ${layout === l ? "bg-white text-[#03a94d]" : "bg-white/20 hover:bg-white/30"}`}
          >
            {l === "side" ? "좌우" : "위아래"}
          </button>
        ))}
      </div>
      <article className="px-6 py-6">
        <h1 className="text-[22px] font-bold leading-snug text-[#222]">{title || "제목을 입력해 주세요"}</h1>
        <p className="mt-2 border-b border-slate-100 pb-4 text-xs text-slate-400">{businessName}</p>
        <div className="mt-5 space-y-5 text-[15px] leading-[1.9] text-[#333]">
          {groupBlocks(blocks).map((g) => {
            if (g.kind === "heading") {
              return g.block.text.trim() ? (
                <h3 key={g.block.id} className="pt-3 text-[19px] font-bold leading-snug text-[#111]">
                  {g.block.text}
                </h3>
              ) : null;
            }
            if (g.kind === "paragraph") {
              return g.block.text.trim() ? (
                <p key={g.block.id} className="whitespace-pre-wrap break-keep">
                  {g.block.text}
                </p>
              ) : null;
            }
            if (g.kind === "pair" && layout === "side") {
              return (
                <figure key={g.before.id} className="mx-auto grid max-w-[560px] grid-cols-2 gap-1">
                  {photo(g.before, "aspect-[3/4] w-full")}
                  {photo(g.after, "aspect-[3/4] w-full")}
                </figure>
              );
            }
            const list = g.kind === "pair" ? [g.before, g.after] : [g.block];
            return list.map((b) => (
              <figure key={b.id} className="mx-auto max-w-[480px]">
                {photo(b, "aspect-[4/3] w-full rounded-sm")}
              </figure>
            ));
          })}
        </div>
      </article>
    </div>
  );
}
