import type { RadarAdImageCrop } from "@/lib/demand/radar-ad-image-crop";
import { radarAdCropImageStyle } from "@/lib/demand/radar-ad-image-crop";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  crop: RadarAdImageCrop;
  className?: string;
};

/** 안전 영역(crop)만 잘라 컨테이너에 맞춤 */
export default function RadarAdCroppedImage({ src, crop, className }: Props) {
  return (
    <div className={cn("relative overflow-hidden bg-slate-100", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt="" className="max-w-none" style={radarAdCropImageStyle(crop)} />
    </div>
  );
}
