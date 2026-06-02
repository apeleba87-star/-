/** SVG 스무스 라인·영역 경로 (Catmull-Rom → cubic) */

export type ChartCoord = { x: number; y: number };

function controlPoints(
  p0: ChartCoord,
  p1: ChartCoord,
  p2: ChartCoord,
  t = 0.2
): { cp1x: number; cp1y: number; cp2x: number; cp2y: number } {
  const d01 = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const d12 = Math.hypot(p2.x - p1.x, p2.y - p1.y);
  const fa = d01 / (d01 + d12 || 1);
  const fb = d12 / (d01 + d12 || 1);
  return {
    cp1x: p1.x - (p2.x - p0.x) * fa * t,
    cp1y: p1.y - (p2.y - p0.y) * fa * t,
    cp2x: p1.x + (p2.x - p0.x) * fb * t,
    cp2y: p1.y + (p2.y - p0.y) * fb * t,
  };
}

export function buildSmoothLinePath(coords: ChartCoord[]): string {
  if (coords.length === 0) return "";
  if (coords.length === 1) return `M ${coords[0].x} ${coords[0].y}`;
  if (coords.length === 2) {
    return `M ${coords[0].x} ${coords[0].y} L ${coords[1].x} ${coords[1].y}`;
  }

  let d = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 0; i < coords.length - 1; i += 1) {
    const p0 = coords[Math.max(0, i - 1)];
    const p1 = coords[i];
    const p2 = coords[i + 1];
    const p3 = coords[Math.min(coords.length - 1, i + 2)];
    const { cp1x, cp1y } = controlPoints(p0, p1, p2);
    const { cp2x, cp2y } = controlPoints(p1, p2, p3);
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

export function buildAreaPath(linePath: string, coords: ChartCoord[], baselineY: number): string {
  if (coords.length === 0) return "";
  const first = coords[0];
  const last = coords[coords.length - 1];
  return `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
