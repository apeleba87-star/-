import type { MagamListingPublic } from "@/lib/magam/types";
import { MagamListingListItem } from "@/components/magam/MagamShareCard";

type Props = {
  listings: MagamListingPublic[];
  title: string;
};

export default function MagamOpenListings({ listings, title }: Props) {
  if (listings.length === 0) return null;

  return (
    <section className="mt-8 border-t border-slate-200 pt-6">
      <h2 className="text-base font-semibold text-slate-900">{title}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {listings.map((item) => (
          <li key={item.id}>
            <MagamListingListItem listing={item} />
          </li>
        ))}
      </ul>
    </section>
  );
}
