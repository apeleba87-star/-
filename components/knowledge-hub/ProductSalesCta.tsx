import { ExternalLink } from "lucide-react";
import type { KnowledgeProduct } from "@/lib/knowledge-hub/cleaning-knowledge/types";

type Props = {
  product: KnowledgeProduct;
  className?: string;
};

/** 판매 URL이 있을 때만 노출. 더미/자동 아웃링크 금지 */
export default function ProductSalesCta({ product, className }: Props) {
  if (!product.salesUrl) {
    return (
      <p className={`text-sm text-slate-500 ${className ?? ""}`}>
        판매 링크는 관리자에서 등록되면 표시됩니다.
      </p>
    );
  }

  return (
    <a
      href={product.salesUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-black text-white hover:bg-slate-800 ${className ?? ""}`}
    >
      {product.salesLabel ?? `${product.name} 구매하기`}
      <ExternalLink className="h-4 w-4" aria-hidden />
    </a>
  );
}
