"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";

import { PdfDragResizeOverlay } from "@/components/cleanidex/pdf-drag-resize-overlay";
import type { SignaturePlacement } from "@/lib/cleanidex/contract-pdf";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

if (typeof window !== "undefined") {
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
}

export type ContractPdfPlacementEditorProps = {
  pdfUrl: string | null;
  placement: SignaturePlacement;
  onPlacementChange: (p: SignaturePlacement) => void;
  /** 예: 사장 서명란, 거래처 서명란 */
  fieldLabel: string;
  /** 테두리 색 tailwind 클래스 */
  /** 테두리·강조색 (Tailwind) */
  accentBorderClassName?: string;
  disabled?: boolean;
  /** 페이지 최대 너비(px) */
  maxPageWidth?: number;
};

export default function ContractPdfPlacementEditor({
  pdfUrl,
  placement,
  onPlacementChange,
  fieldLabel,
  accentBorderClassName = "border-indigo-600",
  disabled = false,
  maxPageWidth = 560,
}: ContractPdfPlacementEditorProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [numPages, setNumPages] = useState(0);
  const [pageSize, setPageSize] = useState({ w: 0, h: 0 });
  const [pdfError, setPdfError] = useState<string | null>(null);

  const pageNumber = placement.pageIndex + 1;

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
  }, [measureCanvas, pageSize.w, pdfUrl, pageNumber]);

  useEffect(() => {
    setPdfError(null);
    setPageSize({ w: 0, h: 0 });
  }, [pdfUrl, pageNumber]);

  useEffect(() => {
    if (numPages <= 0 || placement.pageIndex < numPages) return;
    const nextIndex = Math.max(0, numPages - 1);
    if (nextIndex !== placement.pageIndex) {
      onPlacementChange({ ...placement, pageIndex: nextIndex });
    }
  }, [numPages, placement.pageIndex, placement.x, placement.y, placement.width, placement.height, placement, onPlacementChange]);

  const onPageSelect = (nextOneBased: number) => {
    const idx = Math.max(0, Math.min(nextOneBased - 1, Math.max(0, numPages - 1)));
    onPlacementChange({ ...placement, pageIndex: idx });
  };

  if (!pdfUrl) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-8 text-center text-sm text-slate-600">
        PDF 주소를 불러오면 여기에서 드래그로 위치를 정할 수 있습니다.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-slate-800">{fieldLabel}</span>
        {numPages > 0 ? (
          <label className="flex items-center gap-1 text-slate-600">
            페이지
            <select
              value={pageNumber}
              disabled={disabled}
              onChange={(e) => onPageSelect(Number(e.target.value))}
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
        <span className="text-xs text-slate-500">
          박스 안을 드래그해 옮기고, 오른쪽 아래 모서리를 잡아 크기를 조절하세요.
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
            onLoadError={(err) => {
              setPdfError(err.message || "PDF를 열 수 없습니다.");
            }}
          >
            <Page
              pageNumber={pageNumber}
              width={maxPageWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              onRenderSuccess={() => {
                requestAnimationFrame(measureCanvas);
              }}
            />
          </Document>

          {pageSize.w > 0 && pageSize.h > 0 && !disabled ? (
            <div
              className="pointer-events-none absolute left-0 top-0 overflow-hidden"
              style={{ width: pageSize.w, height: pageSize.h }}
            >
              <div className="relative h-full w-full">
                <PdfDragResizeOverlay
                  pw={pageSize.w}
                  ph={pageSize.h}
                  norm={placement}
                  onNormChange={onPlacementChange}
                  disabled={disabled}
                  zIndex={2}
                  className={`border bg-white/40 ${accentBorderClassName}`}
                >
                  <span className="flex min-h-[2rem] items-center justify-center px-1 text-center text-[10px] font-semibold leading-tight text-slate-800">
                    {fieldLabel}
                  </span>
                </PdfDragResizeOverlay>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
