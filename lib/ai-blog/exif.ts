/**
 * JPEG EXIF 최소 처리 (브라우저 전용, 재인코딩 없음 → 화질 손실 없음).
 * - 촬영일(DateTimeOriginal) 읽기
 * - GPS 정보만 지우기: GPS IFD 의 값 바이트를 0 으로 덮고 항목 수를 0 으로. 회전(Orientation) 등 나머지는 유지.
 */

type Tiff = { view: DataView; start: number; little: boolean };

const TYPE_SIZE: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

function findExif(view: DataView): Tiff | null {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  let offset = 2;
  while (offset + 4 <= view.byteLength) {
    const marker = view.getUint16(offset);
    if ((marker & 0xff00) !== 0xff00) return null;
    const size = view.getUint16(offset + 2);
    if (marker === 0xffe1 && offset + 10 <= view.byteLength && view.getUint32(offset + 4) === 0x45786966) {
      const start = offset + 10;
      const order = view.getUint16(start);
      if (order !== 0x4949 && order !== 0x4d4d) return null;
      return { view, start, little: order === 0x4949 };
    }
    if (marker === 0xffda) return null;
    offset += 2 + size;
  }
  return null;
}

function u16(t: Tiff, at: number) {
  return t.view.getUint16(t.start + at, t.little);
}
function u32(t: Tiff, at: number) {
  return t.view.getUint32(t.start + at, t.little);
}

function findTag(t: Tiff, ifd: number, tag: number): { entry: number; type: number; count: number } | null {
  if (t.start + ifd + 2 > t.view.byteLength) return null;
  const n = u16(t, ifd);
  for (let i = 0; i < n; i++) {
    const entry = ifd + 2 + i * 12;
    if (t.start + entry + 12 > t.view.byteLength) return null;
    if (u16(t, entry) === tag) return { entry, type: u16(t, entry + 2), count: u32(t, entry + 4) };
  }
  return null;
}

function valueOffset(t: Tiff, e: { entry: number; type: number; count: number }): number {
  const bytes = (TYPE_SIZE[e.type] ?? 1) * e.count;
  return bytes <= 4 ? e.entry + 8 : u32(t, e.entry + 8);
}

function readAscii(t: Tiff, e: { entry: number; type: number; count: number }): string {
  const at = valueOffset(t, e);
  let s = "";
  for (let i = 0; i < e.count && t.start + at + i < t.view.byteLength; i++) {
    const c = t.view.getUint8(t.start + at + i);
    if (!c) break;
    s += String.fromCharCode(c);
  }
  return s;
}

export function readTakenAt(buffer: ArrayBuffer): string | null {
  try {
    const t = findExif(new DataView(buffer));
    if (!t) return null;
    const ifd0 = u32(t, 4);
    const exifPtr = findTag(t, ifd0, 0x8769);
    const exifIfd = exifPtr ? u32(t, exifPtr.entry + 8) : null;
    const tag = (exifIfd !== null && findTag(t, exifIfd, 0x9003)) || findTag(t, ifd0, 0x0132);
    if (!tag) return null;
    const m = readAscii(t, tag).match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
    if (!m) return null;
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  } catch {
    return null;
  }
}

/** GPS 정보만 제거한 사본. JPEG 가 아니거나 GPS 가 없으면 원본 그대로. */
export function stripGps(buffer: ArrayBuffer): ArrayBuffer {
  try {
    const copy = buffer.slice(0);
    const t = findExif(new DataView(copy));
    if (!t) return buffer;
    const ifd0 = u32(t, 4);
    const gpsPtr = findTag(t, ifd0, 0x8825);
    if (!gpsPtr) return buffer;
    const gpsIfd = u32(t, gpsPtr.entry + 8);
    if (t.start + gpsIfd + 2 > t.view.byteLength) return buffer;
    const n = u16(t, gpsIfd);
    for (let i = 0; i < n; i++) {
      const entry = gpsIfd + 2 + i * 12;
      if (t.start + entry + 12 > t.view.byteLength) break;
      const type = u16(t, entry + 2);
      const count = u32(t, entry + 4);
      const bytes = (TYPE_SIZE[type] ?? 1) * count;
      const at = bytes <= 4 ? entry + 8 : u32(t, entry + 8);
      for (let b = 0; b < Math.max(bytes, 4) && t.start + at + b < t.view.byteLength; b++) {
        t.view.setUint8(t.start + at + b, 0);
      }
      for (let b = 0; b < 12; b++) t.view.setUint8(t.start + entry + b, 0);
    }
    t.view.setUint16(t.start + gpsIfd, 0, t.little);
    return copy;
  } catch {
    return buffer;
  }
}
