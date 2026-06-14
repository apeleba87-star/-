import Link from "next/link";
import type { MagamListingPublic } from "@/lib/magam/types";
import {
  MAGAM_LISTING_TYPE_LABEL,
  MAGAM_STATUS_LABEL,
} from "@/lib/magam/copy";

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

type Props = {
  listing: MagamListingPublic;
  highlight?: boolean;
};

export default function MagamShareCard({ listing, highlight }: Props) {
  const isClosed = listing.status === "closed";
  const typeLabel = MAGAM_LISTING_TYPE_LABEL[listing.listing_type];

  return (
    <article
      className={`rounded-2xl border bg-white p-5 shadow-sm ${
        highlight ? "border-slate-300 ring-1 ring-slate-200" : "border-slate-200"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-xs font-semibold text-white">
          {typeLabel}
        </span>
        <span className="text-sm font-medium text-slate-700">{listing.region_gu}</span>
        <span
          className={`ml-auto rounded-full px-2.5 py-0.5 text-xs font-semibold ${
            isClosed ? "bg-slate-200 text-slate-600" : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {MAGAM_STATUS_LABEL[listing.status]}
        </span>
      </div>

      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900">{listing.body_text}</p>

      {(listing.price_text || listing.schedule_text || listing.special_notes) && (
        <dl className="mt-4 space-y-1 text-sm text-slate-600">
          {listing.price_text ? (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-slate-500">금액</dt>
              <dd>{listing.price_text}</dd>
            </div>
          ) : null}
          {listing.schedule_text ? (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-slate-500">일정</dt>
              <dd>{listing.schedule_text}</dd>
            </div>
          ) : null}
          {listing.special_notes ? (
            <div className="flex gap-2">
              <dt className="shrink-0 font-medium text-slate-500">특이사항</dt>
              <dd className="whitespace-pre-wrap">{listing.special_notes}</dd>
            </div>
          ) : null}
        </dl>
      )}

      <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
        {isClosed ? (
          <p className="text-sm font-medium text-slate-600">마감된 공고입니다. 연락처는 더 이상 제공되지 않습니다.</p>
        ) : listing.contact_phone ? (
          <p className="text-sm text-slate-700">
            연락처{" "}
            <a
              href={`tel:${listing.contact_phone.replace(/[^\d+]/g, "")}`}
              className="font-semibold text-slate-900 underline-offset-2 hover:underline"
            >
              {listing.contact_phone}
            </a>
          </p>
        ) : (
          <p className="text-sm text-slate-600">연락처를 확인할 수 없습니다.</p>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        등록 {formatWhen(listing.created_at)}
        {listing.closed_at ? ` · 마감 ${formatWhen(listing.closed_at)}` : null}
      </p>
    </article>
  );
}

/** 목록용 축약 카드 */
export function MagamListingListItem({ listing }: { listing: MagamListingPublic }) {
  const typeLabel = MAGAM_LISTING_TYPE_LABEL[listing.listing_type];
  const preview = listing.body_text.replace(/\s+/g, " ").trim().slice(0, 72);

  return (
    <Link
      href={`/p/${listing.share_slug}`}
      className="block rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-slate-300 hover:bg-slate-50"
    >
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <span className="font-semibold text-slate-700">{typeLabel}</span>
        <span>{listing.region_gu}</span>
      </div>
      <p className="mt-1 line-clamp-2 text-sm text-slate-800">{preview}</p>
    </Link>
  );
}
