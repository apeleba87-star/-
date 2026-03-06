"use client";

type Props = { phone: string };

export default function ContactButtons({ phone }: Props) {
  const tel = phone.replace(/\D/g, "");
  const hrefTel = tel ? `tel:${tel}` : "#";
  const hrefSms = tel ? `sms:${tel}` : "#";

  return (
    <div className="flex flex-wrap gap-3">
      <a
        href={hrefTel}
        className="inline-flex min-h-[48px] min-w-[120px] items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-base font-medium text-white hover:bg-emerald-700"
      >
        전화하기
      </a>
      <a
        href={hrefSms}
        className="inline-flex min-h-[48px] min-w-[120px] items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-800 hover:bg-slate-50"
      >
        문자하기
      </a>
    </div>
  );
}
