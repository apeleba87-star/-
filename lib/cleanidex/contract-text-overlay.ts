import type { PDFDocument, PDFFont, PDFPage } from "pdf-lib";

export type TextOverlayAlign = "left" | "center" | "right";

export type ContractTextOverlay = {
  id: string;
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  content: string;
  fontSizePt?: number;
  align?: TextOverlayAlign;
};

export const TEXT_OVERLAY_MAX_COUNT = 15;
export const TEXT_OVERLAY_MAX_CONTENT = 2000;
export const TEXT_OVERLAY_FONT_MIN = 6;
export const TEXT_OVERLAY_FONT_MAX = 28;

function assertRatio(name: string, v: number) {
  if (!Number.isFinite(v) || v < 0 || v > 1) {
    throw new Error(`text_overlay_${name}_invalid`);
  }
}

export function parseContractTextOverlays(raw: unknown): ContractTextOverlay[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error("text_overlays_invalid");
  if (raw.length > TEXT_OVERLAY_MAX_COUNT) throw new Error("text_overlays_too_many");
  const out: ContractTextOverlay[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") throw new Error("text_overlay_invalid");
    const o = item as Record<string, unknown>;
    const id = typeof o.id === "string" && o.id.trim() ? o.id.trim() : "";
    if (!id) throw new Error("text_overlay_id_invalid");
    const pageIndex = Number(o.pageIndex);
    const x = Number(o.x);
    const y = Number(o.y);
    const width = Number(o.width);
    const height = Number(o.height);
    const content = typeof o.content === "string" ? o.content : "";
    if (!Number.isInteger(pageIndex) || pageIndex < 0) throw new Error("text_overlay_page_invalid");
    assertRatio("x", x);
    assertRatio("y", y);
    assertRatio("width", width);
    assertRatio("height", height);
    if (width <= 0 || height <= 0) throw new Error("text_overlay_size_invalid");
    if (content.length > TEXT_OVERLAY_MAX_CONTENT) throw new Error("text_overlay_content_too_long");
    let fontSizePt = o.fontSizePt != null ? Number(o.fontSizePt) : 11;
    if (!Number.isFinite(fontSizePt)) fontSizePt = 11;
    fontSizePt = Math.min(TEXT_OVERLAY_FONT_MAX, Math.max(TEXT_OVERLAY_FONT_MIN, fontSizePt));
    const alignRaw = o.align;
    let align: TextOverlayAlign = "left";
    if (alignRaw === "center" || alignRaw === "right") align = alignRaw;
    out.push({ id, pageIndex, x, y, width, height, content, fontSizePt, align });
  }
  return out;
}

function wrapLines(font: PDFFont, text: string, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.replace(/\r\n/g, "\n").split("\n");
  for (const para of paragraphs) {
    let line = "";
    for (const ch of para) {
      const test = line + ch;
      if (font.widthOfTextAtSize(test, fontSize) <= maxWidth) line = test;
      else {
        if (line.length) lines.push(line);
        line = ch;
      }
    }
    if (line.length) lines.push(line);
    else if (para === "") lines.push("");
  }
  return lines.length ? lines : [""];
}

/**
 * Draw filled text inside normalized box (web top-left). Mutates pages.
 */
export function drawTextOverlaysOnPdf(doc: PDFDocument, font: PDFFont, overlays: ContractTextOverlay[]) {
  const pages = doc.getPages();
  const sorted = [...overlays].filter((o) => o.content.trim().length > 0).sort((a, b) => a.pageIndex - b.pageIndex);

  for (const overlay of sorted) {
    if (overlay.pageIndex < 0 || overlay.pageIndex >= pages.length) continue;
    const page = pages[overlay.pageIndex];
    drawOverlayOnPage(page, font, overlay);
  }
}

function drawOverlayOnPage(page: PDFPage, font: PDFFont, overlay: ContractTextOverlay) {
  const { width: pw, height: ph } = page.getSize();
  const fontSize = overlay.fontSizePt ?? 11;
  const lineHeight = fontSize * 1.35;
  const maxW = Math.max(8, overlay.width * pw - 2);
  const boxLeft = overlay.x * pw + 1;
  const boxTopPdf = ph - overlay.y * ph;
  const boxBottomPdf = ph - (overlay.y + overlay.height) * ph;

  const lines = wrapLines(font, overlay.content.trim(), fontSize, maxW);

  let cursorY = boxTopPdf - fontSize * 0.9;
  const align = overlay.align ?? "left";

  for (const line of lines) {
    if (cursorY < boxBottomPdf + fontSize * 0.2) break;
    let tx = boxLeft;
    const wline = font.widthOfTextAtSize(line, fontSize);
    if (align === "center") tx = boxLeft + (maxW - wline) / 2;
    if (align === "right") tx = boxLeft + maxW - wline;
    page.drawText(line, {
      x: Math.max(boxLeft, tx),
      y: cursorY,
      size: fontSize,
      font,
    });
    cursorY -= lineHeight;
  }
}
