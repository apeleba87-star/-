import type { CoupangBannerProduct } from "@/lib/ads-shared";

type Props = {
  products: CoupangBannerProduct[];
  slotKey: string;
};

function formatPrice(n: number): string {
  if (!n || n <= 0) return "";
  return `${n.toLocaleString("ko-KR")}원`;
}

/**
 * 쿠팡 파트너스 API 캐시 상품 배너 (링크·이미지는 API 응답 그대로)
 */
export default function CoupangProductBanner({ products, slotKey }: Props) {
  if (!products.length) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" data-coupang-banner={slotKey}>
      {products.map((p) => (
        <a
          key={`${p.productId}-${p.productUrl}`}
          href={p.productUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          className="group flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-orange-200 hover:shadow-md"
        >
          {p.productImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={p.productImage}
              alt=""
              width={80}
              height={80}
              className="h-20 w-20 shrink-0 rounded-lg border border-slate-100 object-cover"
              loading="lazy"
            />
          ) : (
            <div className="h-20 w-20 shrink-0 rounded-lg bg-slate-100" aria-hidden />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-2 text-sm font-medium leading-snug text-slate-900 group-hover:text-orange-700">
              {p.productName}
            </p>
            {p.productPrice > 0 ? (
              <p className="mt-1 text-base font-bold tabular-nums text-slate-900">{formatPrice(p.productPrice)}</p>
            ) : null}
            <p className="mt-1 text-[10px] text-slate-400">쿠팡에서 보기</p>
          </div>
        </a>
      ))}
    </div>
  );
}
