"use client";

import { MapPin, Phone, LogIn, Car, AlertCircle } from "lucide-react";
import { glassCard } from "@/lib/ui-styles";

type Props = {
  fullAddress: string | null;
  contactPhone: string | null;
  accessInstructions: string | null;
  parkingInfo: string | null;
  notes: string | null;
};

const iconClass = "h-4 w-4 shrink-0 text-slate-500";

export default function JobPostPrivateDetails({
  fullAddress,
  contactPhone,
  accessInstructions,
  parkingInfo,
  notes,
}: Props) {
  const hasAny = fullAddress || contactPhone || accessInstructions || parkingInfo || notes;
  if (!hasAny) return null;

  return (
    <section className={`${glassCard} border-amber-200/50 bg-amber-50/40 p-5`}>
      <h2 className="text-base font-semibold text-slate-800">현장 상세 정보</h2>
      <p className="mt-0.5 text-xs text-slate-500">확정 후 공개되는 정보입니다.</p>
      <dl className="mt-4 space-y-4">
        {fullAddress && (
          <div>
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <MapPin className={iconClass} /> 상세 주소
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">{fullAddress}</dd>
          </div>
        )}
        {contactPhone && (
          <div>
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Phone className={iconClass} /> 담당자 연락처
            </dt>
            <dd className="mt-1">
              <a
                href={`tel:${contactPhone.replace(/\D/g, "")}`}
                className="text-sm font-medium text-blue-600 hover:underline"
              >
                {contactPhone}
              </a>
            </dd>
          </div>
        )}
        {accessInstructions && (
          <div>
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <LogIn className={iconClass} /> 출입 방법
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{accessInstructions}</dd>
          </div>
        )}
        {parkingInfo && (
          <div>
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <Car className={iconClass} /> 주차
            </dt>
            <dd className="mt-1 text-sm text-slate-800">{parkingInfo}</dd>
          </div>
        )}
        {notes && (
          <div>
            <dt className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-slate-500">
              <AlertCircle className={iconClass} /> 주의사항
            </dt>
            <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-800">{notes}</dd>
          </div>
        )}
      </dl>
    </section>
  );
}
