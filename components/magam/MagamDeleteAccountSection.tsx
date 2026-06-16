"use client";

import { useState } from "react";

import { deleteMagamAccount } from "@/app/magam/actions";
import { MagamErrorBanner, magamOutlineBtnClass } from "@/components/magam/ui/MagamUi";
import { MAGAM_DEFAULT_AUTH_NEXT } from "@/lib/magam/auth-cookie";
import { MAGAM_DELETE_ACCOUNT_BODY, MAGAM_DELETE_ACCOUNT_TITLE } from "@/lib/magam/copy";
import { createClient } from "@/lib/supabase";

export default function MagamDeleteAccountSection() {
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDeleteAccount() {
    if (!window.confirm(MAGAM_DELETE_ACCOUNT_BODY)) return;
    setDeleting(true);
    setError(null);

    const result = await deleteMagamAccount();
    if (!result.ok) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = `/login?from=magam&next=${encodeURIComponent(MAGAM_DEFAULT_AUTH_NEXT)}`;
  }

  return (
    <div>
      <p className="text-sm leading-relaxed text-[#5B6472]">{MAGAM_DELETE_ACCOUNT_BODY}</p>
      {error ? <MagamErrorBanner message={error} /> : null}
      <button
        type="button"
        onClick={handleDeleteAccount}
        disabled={deleting}
        className={`${magamOutlineBtnClass} mt-4 !text-[#DC2626]`}
      >
        {deleting ? "탈퇴 처리 중…" : MAGAM_DELETE_ACCOUNT_TITLE}
      </button>
    </div>
  );
}
