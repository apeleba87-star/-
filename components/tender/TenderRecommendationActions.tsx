"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Bookmark, ListFilter } from "lucide-react";
import { saveUserTenderFocus } from "@/app/tenders/actions";
import { buildTendersSearchParams } from "@/lib/tenders/user-focus";
import { dispatchTenderFocusUpdated } from "@/lib/tenders/tender-focus-events";

export default function TenderRecommendationActions(props: {
  industryCodes: string[];
  regionSido: string | null;
  regionGugun: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const hasAnyCondition = props.industryCodes.length > 0 || !!props.regionSido || !!props.regionGugun;
  const similarHref = useMemo(
    () =>
      "/tenders" +
      buildTendersSearchParams({
        industryCodes: props.industryCodes,
        regionSido: props.regionSido,
        regionGugun: props.regionGugun,
        sort: "clse",
      }),
    [props.industryCodes, props.regionGugun, props.regionSido]
  );

  const onSave = () => {
    setMsg(null);
    startTransition(async () => {
      const res = await saveUserTenderFocus({
        industryCodes: props.industryCodes,
        regionSido: props.regionSido,
        regionGugun: props.regionGugun,
      });
      if (res.ok) {
        setMsg("이 조건을 내 관심으로 저장했어요.");
        dispatchTenderFocusUpdated();
      } else {
        setMsg(res.error ?? "조건 저장에 실패했습니다.");
      }
    });
  };

  return (
    <section className="mt-4 rounded-2xl border border-teal-200/70 bg-gradient-to-r from-teal-50 to-emerald-50/70 p-4 shadow-sm">
      <p className="text-sm font-semibold text-slate-900">추천 조건 빠른 실행</p>
      <p className="mt-1 text-xs text-slate-600">이 조건 저장 후 같은 기준으로 유사 입찰을 바로 확인할 수 있어요.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onSave}
          disabled={pending || !hasAnyCondition}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-700 disabled:opacity-60"
        >
          <Bookmark className="h-4 w-4" aria-hidden />
          {pending ? "저장 중…" : "이 조건 저장"}
        </button>
        <Link
          href={similarHref}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ListFilter className="h-4 w-4" aria-hidden />
          유사 입찰 리스트 보기
        </Link>
      </div>
      {!hasAnyCondition ? (
        <p className="mt-2 text-xs text-amber-700">이 공고에서 업종·지역 조건을 추출하지 못해 저장은 비활성화됩니다.</p>
      ) : null}
      {msg ? <p className="mt-2 text-xs text-slate-700">{msg}</p> : null}
    </section>
  );
}
