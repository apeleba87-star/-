import type { ReactNode } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, ChevronRight, Clock, Droplets, FlaskConical, Wrench } from "lucide-react";
import EntityRichText from "@/components/knowledge-hub/EntityRichText";
import { isRinseStep, parseWorkStep, toolIconFor } from "@/lib/knowledge-hub/tool-icons";
import type { PhInfo } from "@/lib/knowledge-hub/ph-scale";

function valueTextClass(value: string) {
  return value.length > 14
    ? "break-keep text-lg font-black leading-snug text-slate-950 sm:text-xl"
    : "break-keep text-xl font-black leading-snug text-slate-950 sm:text-2xl";
}

export function MetricCard({
  icon: Icon,
  label,
  value,
  badge,
  hint,
  iconClassName = "text-emerald-700",
  className = "",
}: {
  icon: typeof Droplets;
  label: string;
  value: string;
  badge?: string;
  hint?: string;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4 ${className}`}>
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${iconClassName}`} aria-hidden />
        <span className="text-sm font-bold text-slate-500">{label}</span>
      </div>
      <p className={`mt-2 ${valueTextClass(value)}`}>{value}</p>
      {badge ? (
        <span className="mt-2 inline-flex rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800">
          {badge}
        </span>
      ) : null}
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function PhMetricCard({
  label,
  info,
  badge,
  hint,
}: {
  label: string;
  info: PhInfo;
  badge?: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-3.5 sm:p-4">
      <div className="flex items-center gap-2">
        <FlaskConical className="h-4 w-4 text-slate-500" aria-hidden />
        <span className="text-sm font-bold text-slate-500">{label}</span>
      </div>
      <p className="mt-2 text-xl font-black text-slate-950 sm:text-2xl">pH {info.valueLabel}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold"
          style={{ backgroundColor: `${info.color}22`, color: info.color }}
        >
          {info.natureLabel}
        </span>
        {badge ? (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
            {badge}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function ToolsStrip({ tools }: { tools: string[] }) {
  if (!tools.length) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Wrench className="h-5 w-5 text-sky-600" aria-hidden />
        <h2 className="text-lg font-black text-slate-950">사용 도구</h2>
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2.5">
        {tools.map((t) => {
          const Icon = toolIconFor(t);
          return (
            <li
              key={t}
              title={t}
              className="flex min-h-[5.5rem] flex-col items-center justify-center gap-2 rounded-2xl border border-slate-100 bg-slate-50 px-2 py-3"
            >
              {Icon ? (
                <Icon className="h-8 w-8 text-slate-700" aria-hidden />
              ) : (
                <span className="flex h-8 w-8 items-center justify-center text-base font-bold text-slate-400">·</span>
              )}
              <span className="line-clamp-2 w-full text-center text-sm font-bold leading-snug text-slate-800 break-keep">
                {t}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function WorkSteps({
  steps,
  rich = false,
}: {
  steps: string[];
  rich?: boolean;
}) {
  if (!steps.length) return null;
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <Clock className="h-5 w-5 text-emerald-700" aria-hidden />
        <h2 className="text-lg font-black text-slate-950">작업 순서</h2>
      </div>
      <ol className="mt-3 space-y-3">
        {steps.map((step, i) => {
          const { stage, body } = parseWorkStep(step);
          const rinse = isRinseStep(step);
          return (
            <li
              key={`${i}-${step.slice(0, 24)}`}
              className={`flex gap-3 rounded-2xl p-4 ${
                rinse ? "border border-violet-200 bg-violet-50" : "bg-slate-50"
              }`}
            >
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white ${
                  rinse ? "bg-violet-600" : "bg-emerald-700"
                }`}
                aria-hidden
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                {stage ? (
                  <p
                    className={`mb-1.5 text-xs font-bold tracking-wide ${
                      rinse ? "text-violet-700" : "text-emerald-800"
                    }`}
                  >
                    {stage}
                  </p>
                ) : null}
                <p className="text-base font-semibold leading-7 text-slate-900 break-keep">
                  {rich ? <EntityRichText text={body} /> : body}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function WarningsPanel({
  title = "주의사항",
  items,
}: {
  title?: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <section className="rounded-3xl border border-rose-200 bg-rose-50/80 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-5 w-5 text-rose-600" aria-hidden />
        <h2 className="text-lg font-black text-rose-950">{title}</h2>
      </div>
      <ul className="mt-3 space-y-2">
        {items.map((w) => (
          <li key={w} className="flex min-h-[44px] gap-2 rounded-xl bg-white/70 px-3 py-2.5 text-sm font-medium leading-6 text-rose-950">
            <span className="mt-0.5 shrink-0 text-rose-500" aria-hidden>
              ⌀
            </span>
            <span className="break-keep">{w}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function LinkedGuides({
  title = "장소별 가이드",
  items,
}: {
  title?: string;
  items: { href: string; label: string; icon?: ReactNode }[];
}) {
  if (!items.length) return null;
  return (
    <section className="rounded-3xl border border-teal-200 bg-teal-50/50 p-4 sm:p-5">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-teal-700" aria-hidden />
        <h2 className="text-lg font-black text-slate-950">{title}</h2>
      </div>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex min-h-[44px] items-center gap-3 rounded-2xl border border-teal-100 bg-white px-4 py-2.5 text-sm font-bold text-slate-900 transition hover:border-teal-300"
            >
              <span className="min-w-0 flex-1 truncate">{item.label}</span>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export { Droplets, Clock, FlaskConical };
