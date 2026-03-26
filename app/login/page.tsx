import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[min(100vh,920px)] bg-gradient-to-b from-slate-50 to-white px-4 py-10 sm:px-6">
          <div className="mx-auto w-full max-w-md sm:max-w-lg lg:max-w-xl">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
              <div className="mx-auto mb-6 h-8 w-40 animate-pulse rounded bg-slate-200" />
              <div className="h-56 animate-pulse rounded-xl bg-slate-100" />
            </div>
          </div>
        </div>
      }
    >
      <LoginClient />
    </Suspense>
  );
}
