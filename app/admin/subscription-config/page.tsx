import { createServerSupabase } from "@/lib/supabase-server";
import { getSubscriptionAmountCents, getSubscriptionPromoConfig } from "@/lib/app-settings";
import SubscriptionConfigForm from "./SubscriptionConfigForm";
import PromoConfigForm from "./PromoConfigForm";

export default async function AdminSubscriptionConfigPage() {
  const supabase = await createServerSupabase();
  const [amountCents, promoConfig] = await Promise.all([
    getSubscriptionAmountCents(supabase),
    getSubscriptionPromoConfig(supabase),
  ]);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">구독 결제 금액 설정</h1>
        <p className="mb-6 text-sm text-slate-500">
          프리미엄 월 구독 결제 금액(원)을 설정합니다. 변경 시 새로 가입하는 구독부터 적용됩니다.
        </p>
        <SubscriptionConfigForm initialAmountCents={amountCents} />
      </div>

      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">이벤트 프로모 설정</h1>
        <p className="mb-4 text-sm text-slate-500">
          첫 1~3개월(설정 가능)만 특가(예: 100원), 이후 정상가(9,900원)로 자동 전환. 이벤트 기간을 지정하면 해당 기간 내 가입자만 적용됩니다.
        </p>
        <PromoConfigForm initialPromo={promoConfig} />
      </div>
    </div>
  );
}
