import sharp from "sharp";

export async function makePartnerMainCoverWebp(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84, effort: 4 })
    .toBuffer();
}
