"use client";

import { useState, type ReactNode } from "react";
import { GripVertical, ImageIcon, Trash2 } from "lucide-react";
import {
  getImageAnchor,
  listBodyImages,
  listTextBlocks,
  placeBodyImageAtAnchor,
  removeBodyImage,
  setBodyImageAlign,
  type EduBodyImage,
  type EduImageAlign,
  type EduImageAnchor,
} from "@/lib/edu-blog/body-images";

const ALIGN_OPTIONS: { id: EduImageAlign; label: string }[] = [
  { id: "center", label: "가운데" },
  { id: "left", label: "왼쪽" },
  { id: "right", label: "오른쪽" },
  { id: "full", label: "넓게" },
];

const DND_TYPE = "application/x-edu-blog-image-index";

type Props = {
  body: string;
  onChange: (next: string) => void;
  disabled?: boolean;
};

function imagesForAnchor(body: string, anchor: EduImageAnchor): EduBodyImage[] {
  return listBodyImages(body).filter((_, i) => {
    const a = getImageAnchor(body, i);
    if (anchor.kind === "top") return a.kind === "top";
    if (anchor.kind === "bottom") return a.kind === "bottom";
    return a.kind === "after" && a.textIndex === anchor.textIndex;
  });
}

function DropZone({
  label,
  anchor,
  active,
  disabled,
  onDropImage,
  children,
}: {
  label: string;
  anchor: EduImageAnchor;
  active: boolean;
  disabled?: boolean;
  onDropImage: (imageIndex: number, anchor: EduImageAnchor) => void;
  children?: ReactNode;
}) {
  const [over, setOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        if (disabled) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        if (disabled) return;
        e.preventDefault();
        setOver(false);
        const raw = e.dataTransfer.getData(DND_TYPE);
        const idx = Number(raw);
        if (!Number.isFinite(idx)) return;
        onDropImage(idx, anchor);
      }}
      className={`rounded-xl border-2 border-dashed px-3 py-2 transition ${
        over || active
          ? "border-teal-500 bg-teal-50"
          : "border-slate-200 bg-slate-50/60"
      }`}
    >
      <p className="mb-2 text-[11px] font-bold text-slate-500">{label}</p>
      {children}
      {!children ? (
        <p className="py-3 text-center text-xs text-slate-400">여기로 사진을 드래그</p>
      ) : null}
    </div>
  );
}

function DraggableImageCard({
  body,
  img,
  disabled,
  onChange,
}: {
  body: string;
  img: EduBodyImage;
  disabled?: boolean;
  onChange: (next: string) => void;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <div
      draggable={!disabled}
      onDragStart={(e) => {
        e.dataTransfer.setData(DND_TYPE, String(img.index));
        e.dataTransfer.effectAllowed = "move";
        setDragging(true);
      }}
      onDragEnd={() => setDragging(false)}
      className={`flex flex-wrap items-start gap-2 rounded-lg border border-slate-200 bg-white p-2 shadow-sm ${
        dragging ? "opacity-50" : ""
      } ${disabled ? "cursor-not-allowed" : "cursor-grab active:cursor-grabbing"}`}
    >
      <GripVertical className="mt-4 h-4 w-4 shrink-0 text-slate-300" aria-hidden />
      <span className="flex h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={img.url} alt={img.alt || `사진 ${img.index + 1}`} className="h-full w-full object-cover" />
      </span>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-700">사진 {img.index + 1}</p>
          <button
            type="button"
            title="삭제"
            disabled={disabled}
            onClick={() => {
              if (confirm(`사진 ${img.index + 1}을 본문에서 삭제할까요?`)) {
                onChange(removeBodyImage(body, img.index));
              }
            }}
            className="rounded-md bg-white p-1 text-rose-600 ring-1 ring-rose-100 disabled:opacity-30"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        <div className="flex flex-wrap gap-1">
          {ALIGN_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(setBodyImageAlign(body, img.index, o.id))}
              className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                img.align === o.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 문단 아래로 사진을 드래그해 배치.
 * 글 마크다운은 유지하고 사진 블록만 이동한다.
 */
export default function EduBlogImageManager({ body, onChange, disabled }: Props) {
  const images = listBodyImages(body);
  const textBlocks = listTextBlocks(body);

  function handleDrop(imageIndex: number, anchor: EduImageAnchor) {
    onChange(placeBodyImageAtAnchor(body, imageIndex, anchor));
  }

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-4 text-center text-xs text-slate-500">
        본문에 사진이 없습니다. 위에서 사진을 넣은 뒤, 아래에서{" "}
        <strong className="font-bold text-slate-700">원하는 문단 칸으로 드래그</strong>하세요.
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-3">
      <div>
        <p className="flex items-center gap-1.5 text-sm font-bold text-slate-800">
          <ImageIcon className="h-4 w-4 text-teal-700" aria-hidden />
          사진 위치 (드래그)
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          사진을 잡아 원하는 문단 아래 칸에 놓으세요. 마크다운을 직접 옮기지 않아도 됩니다.
        </p>
      </div>

      {textBlocks.length === 0 ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
          아직 문단이 없습니다. 본문에 제목·글을 먼저 쓰면, 그 문단 아래로 사진을 드래그할 수 있습니다.
        </p>
      ) : null}

      <div className="space-y-3">
        <DropZone
          label="본문 맨 위"
          anchor={{ kind: "top" }}
          active={false}
          disabled={disabled}
          onDropImage={handleDrop}
        >
          {imagesForAnchor(body, { kind: "top" }).map((img) => (
            <div key={`top-${img.index}-${img.url}`} className="mb-2 last:mb-0">
              <DraggableImageCard body={body} img={img} disabled={disabled} onChange={onChange} />
            </div>
          ))}
        </DropZone>

        {textBlocks.map((t) => {
          const anchor: EduImageAnchor = { kind: "after", textIndex: t.index };
          const under = imagesForAnchor(body, anchor);
          return (
            <div key={`text-${t.index}`} className="space-y-2">
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                <p className="text-[11px] font-bold text-slate-400">문단 {t.index + 1}</p>
                <p className="mt-0.5 text-sm font-medium leading-snug text-slate-800">{t.preview}</p>
              </div>
              <DropZone
                label="↓ 이 문단 바로 아래"
                anchor={anchor}
                active={under.length > 0}
                disabled={disabled}
                onDropImage={handleDrop}
              >
                {under.map((img) => (
                  <div key={`after-${t.index}-${img.index}-${img.url}`} className="mb-2 last:mb-0">
                    <DraggableImageCard body={body} img={img} disabled={disabled} onChange={onChange} />
                  </div>
                ))}
              </DropZone>
            </div>
          );
        })}

        <DropZone
          label="본문 맨 아래"
          anchor={{ kind: "bottom" }}
          active={false}
          disabled={disabled}
          onDropImage={handleDrop}
        >
          {imagesForAnchor(body, { kind: "bottom" }).map((img) => (
            <div key={`bottom-${img.index}-${img.url}`} className="mb-2 last:mb-0">
              <DraggableImageCard body={body} img={img} disabled={disabled} onChange={onChange} />
            </div>
          ))}
        </DropZone>
      </div>
    </div>
  );
}
