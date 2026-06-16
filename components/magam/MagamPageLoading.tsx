import { MagamSectionCard } from "@/components/magam/ui/MagamUi";

function Pulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-[10px] bg-[#E3E6EC] ${className}`} />;
}

export default function MagamPageLoading() {
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <Pulse className="h-9 w-9 shrink-0 rounded-[12px]" />
        <Pulse className="h-7 w-32" />
      </div>
      <MagamSectionCard>
        <Pulse className="mb-3 h-5 w-2/3" />
        <Pulse className="h-24 w-full" />
      </MagamSectionCard>
      <MagamSectionCard className="mt-3">
        <Pulse className="mb-3 h-5 w-1/2" />
        <Pulse className="mb-2 h-12 w-full" />
        <Pulse className="h-12 w-full" />
      </MagamSectionCard>
    </div>
  );
}
