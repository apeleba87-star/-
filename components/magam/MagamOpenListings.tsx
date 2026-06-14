import type { MagamListingPublic } from "@/lib/magam/types";
import { MagamListingListItem } from "@/components/magam/MagamShareCard";

type Props = {
  listings: MagamListingPublic[];
  title: string;
  emptyHint?: string;
};

export default function MagamOpenListings({ listings, title, emptyHint }: Props) {
  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      {listings.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{emptyHint ?? "현재 모집 중인 글이 없습니다."}</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {listings.map((item) => (
            <li key={item.id}>
              <MagamListingListItem listing={item} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
