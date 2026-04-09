import sharp from "sharp";

export async function makePartnerPortfolioVariants(buffer: Buffer): Promise<{ thumb: Buffer; display: Buffer }> {
  const base = sharp(buffer).rotate();
  const display = await base
    .clone()
    .resize({ width: 1280, height: 1280, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82, effort: 4 })
    .toBuffer();
  const thumb = await base
    .clone()
    .resize({ width: 480, height: 480, fit: "cover", position: "attention" })
    .webp({ quality: 78, effort: 4 })
    .toBuffer();
  return { thumb, display };
}

export const PORTFOLIO_ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
