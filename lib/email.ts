/**
 * 이메일 발송 (Resend API). RESEND_API_KEY 없으면 no-op.
 * from 도메인은 Resend에서 검증된 도메인 사용.
 */

const RESEND_API = "https://api.resend.com/emails";

export type SendEmailOptions = {
  to: string;
  subject: string;
  html: string;
  from?: string;
};

export async function sendEmail({ to, subject, html, from }: SendEmailOptions): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromAddress = from ?? process.env.RESEND_FROM ?? "클린아이덱스 <noreply@example.com>";

  if (!apiKey?.trim()) {
    if (process.env.NODE_ENV === "development") {
      console.log("[email] RESEND_API_KEY 없음, 스킵:", { to: to.slice(0, 3) + "***", subject });
    }
    return { ok: true };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, error: body || res.statusText };
    }
    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}

/** 구독 취소 안내 메일 본문 */
export function subscriptionCancelledEmailBody(nextBillingAt: string): string {
  const dateLabel =
    nextBillingAt &&
    (() => {
      try {
        return new Date(nextBillingAt + "T12:00:00").toLocaleDateString("ko-KR", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      } catch {
        return nextBillingAt;
      }
    })();
  return `
    <p>클린아이덱스 구독이 취소되었습니다.</p>
    <p><strong>${dateLabel}까지</strong> 유료 콘텐츠를 이용하실 수 있으며, 이후에는 자동 결제가 진행되지 않습니다.</p>
    <p>다시 구독하시려면 <a href="${process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com"}/subscribe">구독 페이지</a>에서 결제를 진행해 주세요.</p>
  `.trim();
}

/** 내일 이용 종료 리마인더 메일 본문 */
export function subscriptionExpiringTomorrowEmailBody(): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  return `
    <p>클린아이덱스 구독 이용이 <strong>내일</strong> 종료됩니다.</p>
    <p>계속 이용하시려면 <a href="${siteUrl}/subscribe">구독 페이지</a>에서 다시 결제해 주세요.</p>
  `.trim();
}

/** 결제 실패(past_due) 안내 메일 본문 */
export function subscriptionPaymentFailedEmailBody(retryNote: string): string {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  return `
    <p>클린아이덱스 구독 결제에 실패했습니다.</p>
    <p>${retryNote}</p>
    <p>결제 수단을 확인하시거나 <a href="${siteUrl}/subscribe">구독 페이지</a>에서 다시 등록해 주세요.</p>
  `.trim();
}
