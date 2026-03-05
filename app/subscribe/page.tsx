import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase-server";
import SubscribeCheckout from "./SubscribeCheckout";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<{ receipt_id?: string; event?: string; status?: string }> };

export default async function SubscribePage({ searchParams }: Props) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/subscribe");
  }

  const appId = process.env.NEXT_PUBLIC_BOOTPAY_APPLICATION_ID;
  if (!appId) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-slate-600">결제 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요.</p>
      </div>
    );
  }

  const params = await searchParams;
  const receiptId = params?.receipt_id ?? null;
  const event = params?.event ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">프리미엄 구독</h1>
      <p className="mt-2 text-slate-600">월 9,900원으로 데이터 인사이트를 이용하실 수 있습니다.</p>
      <SubscribeCheckout
        applicationId={appId}
        userEmail={user.email ?? undefined}
        redirectReceiptId={receiptId}
        redirectEvent={event}
      />
    </div>
  );
}
