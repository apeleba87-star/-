import PublicJobRegionPicker from "@/components/jobs/public/PublicJobRegionPicker";

type Props = {
  currentSido: string;
  currentSigungu: string | null;
  jobCount: number;
};

export default function PublicJobRegionSection({
  currentSido,
  currentSigungu,
  jobCount,
}: Props) {
  return (
    <PublicJobRegionPicker
      currentSido={currentSido}
      currentSigungu={currentSigungu}
      jobCount={jobCount}
    />
  );
}
