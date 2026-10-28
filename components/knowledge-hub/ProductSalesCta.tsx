import { ExternalLink } from "lucide-react";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";
import { productBuyTrackPath } from "@/lib/knowledge-hub/product-sales";

type Props = {
  product: KnowledgeProduct;
  className?: string;
  /** 클릭 출처 (집계용). 기본 recipe */
  source?: string;
};

/** 판매 URL이 있을 때만 구매 버튼. 없으면 준비중 안내. 클릭은 /go/buy 경유 추적. */
export default function ProductSalesCta({ product, className, source = "recipe" }: Props) {
  if (!product.salesUrl) {
    return (
      <p
        role="status"
        className={`inline-flex min-h-[48px] items-center justify-center rounded-xl bg-slate-100 px-5 py-3 text-sm font-bold text-slate-600 ${className ?? ""}`}
      >
        상품 준비중입니다
      </p>
    );
  }

  return (
    <a
      href={productBuyTrackPath(product.id, source)}
      rel="noopener noreferrer"
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 ${className ?? ""}`}
    >
      {product.salesLabel ?? `${product.name} 구매하기`}
      <ExternalLink className="h-4 w-4" aria-hidden />
    </a>
  );
}
