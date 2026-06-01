"use client";

import { CHANNEL_HINTS } from "@/lib/demand/dummy-data";
import { DemandReveal } from "@/components/demand/DemandReveal";

export default function ChannelHints() {
  return (
    <DemandReveal label="채널 참고" hint="참고용 · 규칙 v0.1">
      <ul className="space-y-2 text-sm">
        {CHANNEL_HINTS.map(({ channel, stars }) => (
          <li key={channel} className="flex items-center justify-between text-slate-700">
            <span>{channel}</span>
            <span className="text-amber-500">
              {"★".repeat(stars)}
              <span className="text-slate-300">{"★".repeat(5 - stars)}</span>
            </span>
          </li>
        ))}
      </ul>
    </DemandReveal>
  );
}
