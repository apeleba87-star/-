"use client";

import type { ReactNode } from "react";

import type { MagamOnboardingWriteVisual } from "@/lib/magam/copy";

function MiniLabel({ n, text }: { n: string; text: string }) {
  return (
    <p className="text-[10px] font-bold text-[#141824]">
      <span className="mr-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-[#141824] text-[9px] text-white">
        {n}
      </span>
      {text}
    </p>
  );
}

function Chip({ children, active }: { children: ReactNode; active?: boolean }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
        active
          ? "border-2 border-[#2563EB] bg-[#EEF3FF] text-[#2563EB]"
          : "border border-[#E3E6EC] bg-white text-[#5B6472]"
      }`}
    >
      {children}
    </span>
  );
}

function WriteTypeMock() {
  return (
    <div className="space-y-2 p-3">
      <MiniLabel n="1" text="도급 / 구인" />
      <div className="flex gap-1.5">
        <Chip active>도급</Chip>
        <Chip>구인</Chip>
      </div>
      <div className="mt-2 rounded-[10px] border border-dashed border-[#D1D5DB] bg-[#F8F9FB] px-2 py-3 text-center text-[9px] text-[#8B93A1]">
        일정 · 지역 · 금액…
      </div>
    </div>
  );
}

function WriteRegionMock() {
  return (
    <div className="space-y-2 p-3">
      <MiniLabel n="3" text="어디" />
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-[10px] border-2 border-[#2563EB] bg-[#EEF3FF] px-2 py-2 text-[10px] font-semibold text-[#2563EB]">
          서울 ▾
        </div>
        <div className="rounded-[10px] border border-[#E3E6EC] bg-white px-2 py-2 text-[10px] font-semibold text-[#141824]">
          성북구 ▾
        </div>
      </div>
    </div>
  );
}

function WriteSubmitMock() {
  return (
    <div className="space-y-2 p-3">
      <MiniLabel n="7" text="연락처" />
      <div className="rounded-[10px] border-2 border-[#2563EB] bg-white px-2.5 py-2 text-[11px] font-medium text-[#141824]">
        010-0000-0000
      </div>
      <div className="mt-1 flex min-h-[36px] items-center justify-center rounded-[12px] bg-[#141824] text-[11px] font-bold text-white">
        등록하고 링크 받기
      </div>
    </div>
  );
}

export function MagamWriteOnboardingVisual({ kind }: { kind: MagamOnboardingWriteVisual }) {
  return (
    <div className="mx-auto w-full max-w-[272px] overflow-hidden rounded-[16px] border border-[#E3E6EC] bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-2 border-b border-[#E3E6EC] bg-[#F2F3F6] px-3 py-2">
        <span className="text-[12px] text-[#5B6472]" aria-hidden>
          ←
        </span>
        <span className="text-[12px] font-bold text-[#141824]">글쓰기</span>
      </div>
      <div className="bg-[#F2F3F6]">
        {kind === "type" ? <WriteTypeMock /> : null}
        {kind === "region" ? <WriteRegionMock /> : null}
        {kind === "submit" ? <WriteSubmitMock /> : null}
      </div>
    </div>
  );
}
