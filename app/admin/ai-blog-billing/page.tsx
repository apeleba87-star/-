import MonetizationSectionTabs from "@/components/admin/MonetizationSectionTabs";
import { createServerSupabase } from "@/lib/supabase-server";
import {
  getAiBlogAmountCents,
  getAiBlogPromoConfig,
  getAiBlogTrialConfig,
} from "@/lib/ai-blog/billing-settings";
import { AmountForm, PromoForm, TrialForm } from "./AiBlogBillingForms";

export default async function AdminAiBlogBillingPage() {
  const supabase = await createServerSupabase();
  const [amountCents, promo, trial] = await Promise.all([
    getAiBlogAmountCents(supabase),
    getAiBlogPromoConfig(supabase),
    getAiBlogTrialConfig(supabase),
  ]);

  return (
    <div className="space-y-10">
      <MonetizationSectionTabs />
      <div>
        <h1 className="mb-2 text-2xl font-bold text-slate-900">AI 블로그 결제 설정</h1>
        <p className="mb-6 text-sm text-slate-500">
          무료 체험 → 100원 1·2개월 선택 → 이후 정상가 자동결제. 부트페이 빌링키 기반입니다.
        </p>
        <div className="space-y-8">
          <TrialForm initialTrial={trial} />
          <PromoForm initialPromo={promo} />
          <AmountForm initialAmountCents={amountCents} />
        </div>
      </div>
    </div>
  );
}
