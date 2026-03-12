"use client";

import { useState } from "react";
import Button from "@/components/Button";

export default function SendNewsletterButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSend() {
    if (!confirm("뉴스레터를 지금 발송하시겠습니까? 큐에 있는 항목이 한 회차로 발송됩니다.")) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/newsletter/send?manual=1", { method: "POST" });
      const data = await res.json();
      if (data.ok) setResult("발송 요청이 완료되었습니다. (이메일 연동 시 실제 발송됩니다)");
      else setResult(data.error || "실패");
    } catch (e) {
      setResult("요청 중 오류가 발생했습니다.");
    }
    setLoading(false);
  }

  return (
    <div>
      <Button onClick={handleSend} disabled={loading}>
        {loading ? "처리 중…" : "지금 발송"}
      </Button>
      {result && <p className="mt-2 text-sm text-slate-600">{result}</p>}
    </div>
  );
}
