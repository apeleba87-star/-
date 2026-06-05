"use client";

import { buildLinePath } from "@/lib/demand/chart-spline";
import { linearMap, niceChartScale } from "@/lib/demand/chart-scale";
import type { DemandKeywordChartPoint } from "@/lib/demand/keyword-hub-data";

const W = 120;
const H = 36;
const PAD = 2;

type Props = {
  points: DemandKeywordChartPoint[];
  strokeClass: string;
  fillClass?: string;
  className?: string;
};

export default function DemandPulseMiniSparkline({
  points,
  strokeClass,
  fillClass,
  className,
}: Props) {
  if (points.length < 2) {
    return (
      <svg viewBox={`0 0 ${W} ${H}`} className={className ?? "h-9 w-full"} aria-hidden>
        <line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
      </svg>
    );
  }

  const values = points.map((p) => p.value);
  const { min, max } = niceChartScale(values, { floorAtZero: false });
  const coords = points.map((p, i) => ({
    x: PAD + (i / (points.length - 1)) * (W - PAD * 2),
    y: PAD + linearMap(p.value, min, max, H - PAD * 2, 0),
  }));
  const linePath = buildLinePath(coords);
  const baselineY = H - PAD;
  const areaPath = `${linePath} L ${coords[coords.length - 1].x} ${baselineY} L ${coords[0].x} ${baselineY} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className ?? "h-9 w-full"} aria-hidden>
      {fillClass ? <path d={areaPath} className={fillClass} opacity={0.25} /> : null}
      <path
        d={linePath}
        fill="none"
        className={strokeClass}
        strokeWidth={1.75}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={coords[coords.length - 1].x}
        cy={coords[coords.length - 1].y}
        r={2.5}
        className={strokeClass}
        fill="white"
        strokeWidth={1}
      />
    </svg>
  );
}
