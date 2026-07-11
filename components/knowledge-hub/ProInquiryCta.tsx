import Link from "next/link";
import { ArrowRight } from "lucide-react";

type Props = {
  /** regular | move_in — 없으면 regular */
  inquiryType?: "regular" | "move_in" | "none";
  /** 현재 페이지 path */
  path?: string;
  category?: string;
  productId?: string;
  recipeSlug?: string;
  materialId?: string;
  contaminantId?: string;
  className?: string;
};

export default function ProInquiryCta({
  inquiryType = "regular",
  path,
  category,
  productId,
  recipeSlug,
  materialId,
  contaminantId,
  className,
}: Props) {
  if (inquiryType === "none") return null;

  const base = inquiryType === "move_in" ? "/inquiry/move-in" : "/inquiry/regular";
  const q = new URLSearchParams();
  if (path) q.set("path", path);
  if (category) q.set("ref", category);
  if (productId) q.set("product", productId);
  if (recipeSlug) q.set("recipe", recipeSlug);
  if (materialId) q.set("material", materialId);
  if (contaminantId) q.set("contaminant", contaminantId);
  const href = `${base}?${q.toString()}`;

  return (
    <section
      className={`rounded-3xl bg-slate-900 p-6 text-white sm:p-8 ${className ?? ""}`}
    >
      <p className="text-sm font-bold text-teal-300">전문 청소가 필요하신가요?</p>
      <h2 className="mt-2 text-2xl font-black">전문업체 문의하기</h2>
      <p className="mt-2 text-sm leading-7 text-slate-300">
        지금 보고 계신 오염·재질·현장 정보를 바탕으로 견적을 안내합니다.
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-black text-slate-950"
      >
        전문업체 문의하기
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
