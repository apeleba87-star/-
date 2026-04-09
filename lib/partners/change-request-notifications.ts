import { createServiceSupabase } from "@/lib/supabase-server";
import { sendEmail } from "@/lib/email";

type NotifyInput = {
  ownerUserId: string;
  companyId: string;
  companyName: string;
  status: "approved" | "rejected";
  rejectReason?: string | null;
};

function buildBody(input: NotifyInput): { title: string; body: string; linkPath: string; emailSubject: string; emailHtml: string } {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://example.com";
  const linkPath = "/partners/performance";
  if (input.status === "approved") {
    return {
      title: `[협력센터] ${input.companyName} 변경요청 승인`,
      body: "요청하신 썸네일/가격 변경이 승인되어 서비스에 반영되었습니다.",
      linkPath,
      emailSubject: `[클린아이덱스] ${input.companyName} 변경요청 승인`,
      emailHtml: `
        <p>${input.companyName} 변경요청이 승인되었습니다.</p>
        <p>요청하신 내용이 협력센터에 반영되었습니다.</p>
        <p><a href="${siteUrl}${linkPath}">광고 성과/요청 상태 보기</a></p>
      `.trim(),
    };
  }
  const reason = input.rejectReason?.trim() || "반려 사유가 등록되지 않았습니다.";
  return {
    title: `[협력센터] ${input.companyName} 변경요청 반려`,
    body: `요청이 반려되었습니다. 사유: ${reason}`,
    linkPath,
    emailSubject: `[클린아이덱스] ${input.companyName} 변경요청 반려`,
    emailHtml: `
      <p>${input.companyName} 변경요청이 반려되었습니다.</p>
      <p><strong>사유:</strong> ${reason}</p>
      <p>내용을 수정한 뒤 다시 요청해 주세요.</p>
      <p><a href="${siteUrl}${linkPath}">광고 성과/요청 상태 보기</a></p>
    `.trim(),
  };
}

export async function notifyPartnerChangeRequestResult(input: NotifyInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const service = createServiceSupabase();
    const msg = buildBody(input);

    await service.from("user_notifications").insert({
      user_id: input.ownerUserId,
      dedupe_key: `partner_change:${input.companyId}:${input.status}:${Date.now()}`,
      kind: "partner_change",
      title: msg.title,
      body: msg.body,
      link_path: msg.linkPath,
    });

    const authUser = await service.auth.admin.getUserById(input.ownerUserId).catch(() => null);
    const to = authUser?.data?.user?.email ?? null;
    if (to) {
      await sendEmail({
        to,
        subject: msg.emailSubject,
        html: msg.emailHtml,
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
