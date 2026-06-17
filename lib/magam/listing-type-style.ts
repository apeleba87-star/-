/** 도급·구인 타입별 색 (배지·목록 강조) */

export type MagamListingTypeKey = "subcontract" | "hiring" | string;

export function magamListingTypeAccent(listingType: MagamListingTypeKey) {
  if (listingType === "hiring") {
    return {
      badgeBg: "bg-[#EA580C]",
      badgeBgMuted: "bg-[#5B6472]",
      peek: "border border-[#FED7AA] border-l-4 border-l-[#EA580C] bg-[#FFF7ED] hover:bg-[#FFEDD5]",
      card: "border border-[#FED7AA] border-l-4 border-l-[#EA580C] bg-[#FFF7ED] hover:bg-[#FFEDD5]",
    };
  }
  if (listingType === "subcontract") {
    return {
      badgeBg: "bg-[#2563EB]",
      badgeBgMuted: "bg-[#5B6472]",
      peek: "border border-[#BFDBFE] border-l-4 border-l-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE]",
      card: "border border-[#BFDBFE] border-l-4 border-l-[#2563EB] bg-[#EFF6FF] hover:bg-[#DBEAFE]",
    };
  }
  if (listingType === "trade") {
    return {
      badgeBg: "bg-[#7C3AED]",
      badgeBgMuted: "bg-[#5B6472]",
      peek: "border border-[#DDD6FE] border-l-4 border-l-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE]",
      card: "border border-[#DDD6FE] border-l-4 border-l-[#7C3AED] bg-[#F5F3FF] hover:bg-[#EDE9FE]",
    };
  }
  return {
    badgeBg: "bg-[#141824]",
    badgeBgMuted: "bg-[#5B6472]",
    peek: "border border-slate-200 bg-white hover:bg-slate-50",
    card: "border border-slate-200 bg-white hover:bg-slate-50",
  };
}
