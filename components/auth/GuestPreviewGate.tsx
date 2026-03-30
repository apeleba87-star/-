import Link from "next/link";

type Tone = "indigo" | "teal" | "violet" | "slate";

const TONE_RING: Record<Tone, string> = {
  indigo: "border-indigo-200/90 ring-indigo-100/60",
  teal: "border-teal-200/90 ring-teal-100/60",
  violet: "border-violet-200/90 ring-violet-100/60",
  slate: "border-slate-200/90 ring-slate-100/80",
};

const TONE_BTN: Record<Tone, string> = {
  indigo: "bg-indigo-600 hover:bg-indigo-700",
  teal: "bg-teal-600 hover:bg-teal-700",
  violet: "bg-violet-600 hover:bg-violet-700",
  slate: "bg-slate-900 hover:bg-slate-800",
};

type Props = {
  isLoggedIn: boolean;
  loginNext: string;
  tone?: Tone;
  children: React.ReactNode;
};

/** 비로그인 시 본문 일부만 보이게 하고, 로그인 CTA를 붙입니다. */
export default function GuestPreviewGate({ isLoggedIn, loginNext, tone = "slate", children }: Props) {
  if (isLoggedIn) return <>{children}</>;

  const ring = TONE_RING[tone];
  const btn = TONE_BTN[tone];

  return (
    <>
      <div className="relative">
        <div className="max-h-[min(68vh,580px)] overflow-hidden">{children}</div>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white via-white/92 to-transparent"
          aria-hidden
        />
      </div>
      <div
        className={`mx-auto mt-8 max-w-lg rounded-2xl border bg-white px-5 py-5 text-center shadow-md ring-1 ${ring}`}
      >
        <p className="text-sm font-semibold text-slate-900">위 내용은 일부만 미리 보기예요.</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-600">
          로그인하면 표·지도·연락처·심화 데이터를 모두 확인할 수 있어요.
        </p>
        <Link
          href={`/login?next=${encodeURIComponent(loginNext)}`}
          className={`mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white shadow-md transition sm:w-auto ${btn}`}
        >
          로그인하고 전체 보기
        </Link>
      </div>
    </>
  );
}
