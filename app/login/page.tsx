import { Suspense } from "react";
import LoginClient from "./LoginClient";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-md px-4 py-16"><div className="mb-8 h-8 w-32 animate-pulse rounded bg-slate-200" /><div className="h-48 animate-pulse rounded bg-slate-100" /></div>}>
      <LoginClient />
    </Suspense>
  );
}
