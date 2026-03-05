"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import Button from "@/components/Button";

type UgcType = "field" | "review" | "issue";

export default function NewUgcPage() {
  const router = useRouter();
  const [type, setType] = useState<UgcType>("field");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [region, setRegion] = useState("");
  const [areaSqm, setAreaSqm] = useState("");
  const [frequency, setFrequency] = useState("");
  const [pricePerPyeong, setPricePerPyeong] = useState("");
  const [scope, setScope] = useState("");
  const [rating, setRating] = useState("3");
  const [comment, setComment] = useState("");
  const [issueText, setIssueText] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const payload = {
      type,
      user_id: user?.id ?? null,
      region: region || null,
      area_sqm: areaSqm ? Number(areaSqm) : null,
      frequency: frequency || null,
      price_per_pyeong: pricePerPyeong ? Number(pricePerPyeong) : null,
      scope: scope || null,
      rating: type === "review" ? Number(rating) : null,
      comment: comment || null,
      issue_text: type === "issue" ? issueText : null,
      status: "pending",
    };

    const { error: err } = await supabase.from("ugc").insert(payload);
    if (err) {
      setError(err.message);
      setLoading(false);
      return;
    }
    router.push("/ugc");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/ugc" className="mb-6 inline-block text-sm text-blue-600 hover:underline">
        ← 목록
      </Link>
      <h1 className="mb-8 text-2xl font-bold text-slate-900">글쓰기</h1>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <label className="label">유형</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as UgcType)}
            className="input"
          >
            <option value="field">현장 공유</option>
            <option value="review">후기</option>
            <option value="issue">이슈 제보</option>
          </select>
        </div>

        {type === "field" && (
          <>
            <div>
              <label className="label">지역</label>
              <input
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="input"
                placeholder="예: 서울 강남"
              />
            </div>
            <div>
              <label className="label">면적 (㎡)</label>
              <input
                type="number"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                className="input"
                placeholder="예: 500"
              />
            </div>
            <div>
              <label className="label">주기</label>
              <input
                type="text"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="input"
                placeholder="예: 월 1회"
              />
            </div>
            <div>
              <label className="label">평당 단가 (원)</label>
              <input
                type="number"
                value={pricePerPyeong}
                onChange={(e) => setPricePerPyeong(e.target.value)}
                className="input"
                placeholder="예: 15000"
              />
            </div>
            <div>
              <label className="label">작업 범위</label>
              <textarea
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                className="input min-h-[80px]"
                placeholder="청소 범위 요약"
              />
            </div>
          </>
        )}

        {type === "review" && (
          <>
            <div>
              <label className="label">별점 (1~5)</label>
              <select
                value={rating}
                onChange={(e) => setRating(e.target.value)}
                className="input"
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n}점</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">코멘트</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="input min-h-[120px]"
                placeholder="후기 내용"
              />
            </div>
          </>
        )}

        {type === "issue" && (
          <div>
            <label className="label">내용</label>
            <textarea
              value={issueText}
              onChange={(e) => setIssueText(e.target.value)}
              className="input min-h-[120px]"
              placeholder="이슈를 간단히 적어 주세요"
              required
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={loading}>
            {loading ? "등록 중…" : "등록"}
          </Button>
          <Link href="/ugc">
            <Button type="button" variant="secondary">취소</Button>
          </Link>
        </div>
      </form>
    </div>
  );
}
