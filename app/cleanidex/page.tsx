import CleanidexMvpDashboard from "@/components/cleanidex/CleanidexMvpDashboard";

export const dynamic = "force-dynamic";

export default function CleanidexPage() {
  return (
    <div className="min-h-screen">
      <div className="page-shell py-6 sm:py-8">
        <CleanidexMvpDashboard />
      </div>
    </div>
  );
}
