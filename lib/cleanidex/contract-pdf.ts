import { createHash } from "crypto";
import { PDFDocument } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { drawTextOverlaysOnPdf, type ContractTextOverlay } from "@/lib/cleanidex/contract-text-overlay";

/** Ratios 0–1; origin top-left of the page (web-style). */
export type SignaturePlacement = {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export const CONTRACT_PDF_MAX_BYTES = 15 * 1024 * 1024;
export const CONTRACT_PDF_MAX_PAGES = 30;

function assertRatio(name: string, v: number) {
  if (!Number.isFinite(v) || v < 0 || v > 1) {
    throw new Error(`placement_${name}_invalid`);
  }
}

export function parseSignaturePlacement(raw: unknown): SignaturePlacement {
  if (!raw || typeof raw !== "object") throw new Error("placement_invalid");
  const o = raw as Record<string, unknown>;
  const pageIndex = Number(o.pageIndex);
  const x = Number(o.x);
  const y = Number(o.y);
  const width = Number(o.width);
  const height = Number(o.height);
  if (!Number.isInteger(pageIndex) || pageIndex < 0) throw new Error("placement_page_invalid");
  assertRatio("x", x);
  assertRatio("y", y);
  assertRatio("width", width);
  assertRatio("height", height);
  if (width <= 0 || height <= 0) throw new Error("placement_size_invalid");
  return { pageIndex, x, y, width, height };
}

/** Default client box: last page, lower area. */
export function defaultClientSignaturePlacement(pageCount: number): SignaturePlacement {
  const pageIndex = Math.max(0, pageCount - 1);
  return { pageIndex, x: 0.1, y: 0.78, width: 0.42, height: 0.14 };
}

/** Manual preset when page count is unknown (user should set pageIndex to last page after 확인). */
export const MANUAL_CLIENT_SIGNATURE_PLACEMENT_PRESET: SignaturePlacement = {
  pageIndex: 0,
  x: 0.1,
  y: 0.78,
  width: 0.42,
  height: 0.14,
};

export async function assertPdfWithinLimits(pdfBytes: Uint8Array) {
  if (pdfBytes.length > CONTRACT_PDF_MAX_BYTES) {
    throw new Error("pdf_too_large");
  }
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const n = doc.getPageCount();
  if (n > CONTRACT_PDF_MAX_PAGES) throw new Error("pdf_too_many_pages");
  return n;
}

export async function embedPngSignatureOnPdf(
  pdfBytes: Uint8Array,
  pngBytes: Uint8Array,
  placement: SignaturePlacement
): Promise<{ merged: Uint8Array; sha256: string; pageCount: number }> {
  if (pdfBytes.length > CONTRACT_PDF_MAX_BYTES) throw new Error("pdf_too_large");
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageCount = pages.length;
  if (placement.pageIndex < 0 || placement.pageIndex >= pageCount) {
    throw new Error("placement_page_out_of_range");
  }
  const page = pages[placement.pageIndex];
  const { width: pw, height: ph } = page.getSize();
  const png = await doc.embedPng(pngBytes);
  const drawW = placement.width * pw;
  const drawH = placement.height * ph;
  const drawX = placement.x * pw;
  const drawY = (1 - placement.y - placement.height) * ph;
  page.drawImage(png, { x: drawX, y: drawY, width: drawW, height: drawH });
  const merged = await doc.save();
  const buf = Buffer.from(merged);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  return { merged: new Uint8Array(merged), sha256, pageCount };
}

/** Source PDF → optional text overlays → owner PNG signature (single pipeline). */
export async function composeOwnerSignedPdfWithTextOverlays(
  pdfBytes: Uint8Array,
  pngBytes: Uint8Array,
  ownerPlacement: SignaturePlacement,
  textOverlays: ContractTextOverlay[],
  fontBytes: Uint8Array | null
): Promise<{ merged: Uint8Array; sha256: string; pageCount: number }> {
  if (pdfBytes.length > CONTRACT_PDF_MAX_BYTES) throw new Error("pdf_too_large");
  const doc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });
  const pages = doc.getPages();
  const pageCount = pages.length;
  if (ownerPlacement.pageIndex < 0 || ownerPlacement.pageIndex >= pageCount) {
    throw new Error("placement_page_out_of_range");
  }
  const needsTextFont = textOverlays.some((o) => o.content.trim().length > 0);
  if (needsTextFont) {
    if (!fontBytes || fontBytes.byteLength < 1000) {
      throw new Error("pdf_font_required_for_overlays");
    }
    doc.registerFontkit(fontkit);
    const font = await doc.embedFont(fontBytes, { subset: true });
    drawTextOverlaysOnPdf(doc, font, textOverlays);
  }
  const page = pages[ownerPlacement.pageIndex];
  const { width: pw, height: ph } = page.getSize();
  const png = await doc.embedPng(pngBytes);
  const drawW = ownerPlacement.width * pw;
  const drawH = ownerPlacement.height * ph;
  const drawX = ownerPlacement.x * pw;
  const drawY = (1 - ownerPlacement.y - ownerPlacement.height) * ph;
  page.drawImage(png, { x: drawX, y: drawY, width: drawW, height: drawH });
  const merged = await doc.save();
  const buf = Buffer.from(merged);
  const sha256 = createHash("sha256").update(buf).digest("hex");
  return { merged: new Uint8Array(merged), sha256, pageCount };
}
