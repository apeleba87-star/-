"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { PdfDragResizeOverlay } from "@/components/cleanidex/pdf-drag-resize-overlay";
import type { ContractTextOverlay, TextOverlayAlign } from "@/lib/cleanidex/contract-text-overlay";
import {
  TEXT_OVERLAY_FONT_MAX,
  TEXT_OVERLAY_FONT_MIN,
  TEXT_OVERLAY_MAX_CONTENT,
  TEXT_OVERLAY_MAX_COUNT,
} from "@/lib/cleanidex/contract-text-overlay";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

function newOverlay(pageIndex: number): ContractTextOverlay {
  return {
    id: crypto.randomUUID(),
    pageIndex,
    x: 0.08,
    y: 0.12,
    width: 0.84,
    height: 0.12,
    content: "텍스트를 입력하세요",
    fontSizePt: 11,
    align: "left",
  };
}

export default function ContractPdfTextOverlaysEditor({
  pdfUrl,
  overlays,
  onOverlaysChange,
  disabled,
  maxPageWidth = 560,
}: {
  pdfUrl: string | null;
  overlays: ContractTextOverlay[];
  onOverlaysChange: (next: ContractTextOverlay[]) => void;
  disabled: boolean;
  maxPageWidth?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [viewPage, setViewPage] = useState(1);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const measureCanvas = useCallback(() => {
    const canvas = wrapRef.current?.querySelector("canvas");
    if (!canvas) return;
    setPageSize({ w: canvas.clientWidth, h: canvas.clientHeight });
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || pageSize.w === 0) return;
    const ro = new ResizeObserver(() => measureCanvas());
    ro.observe(el);
    return () => ro.disconnect();
  }, [measureCanvas, pageSize.w, pdfUrl, viewPage]);

  useEffect(() => {
    setPdfError(null);
    setPageSize({ w: 0, h: 0 });
  }, [pdfUrl, viewPage]);

  useEffect(() => {
    const sel = overlays.find((o) => o.id === selectedId);
    if (selectedId && sel && sel.pageIndex !== viewPage - 1) setSelectedId(null);
  }, [viewPage, overlays, selectedId]);

  useEffect(() => {
    if (numPages <= 0 || viewPage <= numPages) return;
    setViewPage(Math.max(1, numPages));
  }, [numPages, viewPage]);

  const onPage = useMemo(() => overlays.filter((o) => o.pageIndex === viewPage - 1), [overlays, viewPage]);

  function patchOverlay(id: string, patch: Partial<ContractTextOverlay>) {
    onOverlaysChange(overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }

  function addField() {
    if (overlays.length >= TEXT_OVERLAY_MAX_COUNT) return;
    const o = newOverlay(viewPage - 1);
    onOverlaysChange([...overlays, o]);
    setSelectedId(o.id);
  }

  function removeSelected() {
    if (!selectedId) return;
    onOverlaysChange(overlays.filter((o) => o.id !== selectedId));
    setSelectedId(null);
  }

  const selected = overlays.find((o) => o.id === selectedId) ?? null;

  if (!pdfUrl) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-600">
        PDF를 먼저 업로드하면 텍스트 상자를 배치할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-800">PDF 고정 텍스트</span>
        {numPages > 0 ? (
          <label className="flex items-center gap-1 text-slate-600">
            페이지
            <select
              value={viewPage}
              disabled={disabled}
              onChange={(e) => setViewPage(Number(e.target.value))}
              className="rounded border border-slate-300 px-2 py-1 text-xs"
            >
              {Array.from({ length: numPages }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {i + 1}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button
          type="button"
          disabled={disabled || overlays.length >= TEXT_OVERLAY_MAX_COUNT}
          onClick={addField}
          className="rounded bg-violet-600 px-2 py-1 text-xs font-medium text-white disabled:bg-violet-300"
        >
          텍스트 상자 추가
        </button>
        <span className="text-xs text-slate-500">
          상자 안 드래그로 이동, 오른쪽 아래로 크기 조절. ({overlays.length}/{TEXT_OVERLAY_MAX_COUNT})
        </span>
      </div>

      {pdfError ? <p className="text-sm text-rose-600">{pdfError}</p> : null}

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-slate-100 p-2">
        <div ref={wrapRef} className="relative inline-block select-none">
          <Document
            file={pdfUrl}
            loading={<p className="p-4 text-sm text-slate-600">PDF 불러오는 중…</p>}
            onLoadSuccess={(doc) => {
              setNumPages(doc.numPages);
              setPdfError(null);
            }}
            onLoadError={(err) => setPdfError(err.message || "PDF를 열 수 없습니다.")}
          >
            <Page
              pageNumber={viewPage}
              width={maxPageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={() => requestAnimationFrame(measureCanvas)}
            />
          </Document>

          {pageSize.w > 0 && pageSize.h > 0 && !disabled ? (
            <div
              className="pointer-events-none absolute left-0 top-0 overflow-hidden"
              style={{ width: pageSize.w, height: pageSize.h }}
            >
              <div className="relative h-full w-full">
                {onPage.map((o) => {
                  const isSel = o.id === selectedId;
                  return (
                    <PdfDragResizeOverlay
                      key={o.id}
                      pw={pageSize.w}
                      ph={pageSize.h}
                      norm={o}
                      onNormChange={(next) => {
                        onOverlaysChange(overlays.map((x) => (x.id === o.id ? next : x)));
                      }}
                      onActivate={() => setSelectedId(o.id)}
                      disabled={disabled}
                      zIndex={isSel ? 10 : 1}
                      className={`border bg-violet-100/50 ${
                        isSel ? "border-violet-700 ring-2 ring-violet-400" : "border-violet-500"
                      }`}
                    >
                      <span className="block max-h-full overflow-hidden p-1 text-left text-[10px] leading-snug text-violet-950">
                        {o.content.trim() ? o.content.slice(0, 120) + (o.content.length > 120 ? "…" : "") : "(비어 있음)"}
                      </span>
                    </PdfDragResizeOverlay>
                  );
                })}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm space-y-2">
        {selected ? (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium text-slate-800">선택한 텍스트 상자</span>
              <button
                type="button"
                disabled={disabled}
                onClick={removeSelected}
                className="rounded bg-rose-600 px-2 py-1 text-xs text-white disabled:bg-rose-300"
              >
                삭제
              </button>
            </div>
            <label className="block text-xs text-slate-600">
              내용
              <textarea
                disabled={disabled}
                value={selected.content}
                maxLength={TEXT_OVERLAY_MAX_CONTENT}
                onChange={(e) => patchOverlay(selected.id, { content: e.target.value })}
                rows={4}
                className="mt-1 w-full rounded border border-slate-300 px-2 py-1 text-sm"
              />
            </label>
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col text-xs text-slate-600">
                글자 크기 (pt)
                <input
                  type="number"
                  disabled={disabled}
                  min={TEXT_OVERLAY_FONT_MIN}
                  max={TEXT_OVERLAY_FONT_MAX}
                  value={selected.fontSizePt ?? 11}
                  onChange={(e) =>
                    patchOverlay(selected.id, {
                      fontSizePt: Math.min(
                        TEXT_OVERLAY_FONT_MAX,
                        Math.max(TEXT_OVERLAY_FONT_MIN, Number(e.target.value) || 11)
                      ),
                    })
                  }
                  className="mt-1 w-20 rounded border px-2 py-1"
                />
              </label>
              <label className="flex flex-col text-xs text-slate-600">
                정렬
                <select
                  disabled={disabled}
                  value={selected.align ?? "left"}
                  onChange={(e) => patchOverlay(selected.id, { align: e.target.value as TextOverlayAlign })}
                  className="mt-1 rounded border px-2 py-1"
                >
                  <option value="left">왼쪽</option>
                  <option value="center">가운데</option>
                  <option value="right">오른쪽</option>
                </select>
              </label>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-600">PDF 위의 점선 상자를 눌러 선택하거나 「텍스트 상자 추가」를 사용하세요.</p>
        )}
      </div>
    </div>
  );
}
