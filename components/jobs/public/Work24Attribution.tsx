import { PUBLIC_JOBS_COPY } from "@/lib/jobs-public/copy";

/** 고용24 필수 출처 표기 (텍스트 — 공식 이미지는 추후 교체 가능) */
export default function Work24Attribution() {
  return (
    <footer className="mt-10 border-t border-slate-200 pt-6">
      <p className="text-base font-semibold text-slate-800">정보출처 · 고용24</p>
      <p className="mt-2 text-sm leading-relaxed text-slate-600">{PUBLIC_JOBS_COPY.attribution}</p>
      <a
        href="https://www.work24.go.kr"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-block text-base font-medium text-blue-800 underline"
      >
        www.work24.go.kr
      </a>
    </footer>
  );
}
