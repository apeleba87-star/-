import type { MagamListingPublic } from "@/lib/magam/types";
import { MagamListingPeekItem } from "@/components/magam/MagamShareCard";
import { MAGAM_SHARE_FROM_LIVE } from "@/lib/magam/back-href";

type Props = {
  listings: MagamListingPublic[];
  title: string;
  /** /p/ 링크에 전달할 from 쿼리 (뒤로가기 유지) */
  shareFrom?: string;
};

export default function MagamOpenListings({ listings, title, shareFrom = MAGAM_SHARE_FROM_LIVE }: Props) {
  if (listings.length === 0) return null;

  return (
    <section className="mt-6 border-t border-slate-200 pt-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <ul className="mt-3 flex flex-col gap-1.5">
        {listings.map((item) => (
          <li key={item.id}>
            <MagamListingPeekItem listing={item} shareFrom={shareFrom} />
          </li>
        ))}
      </ul>
    </section>
  );
}
