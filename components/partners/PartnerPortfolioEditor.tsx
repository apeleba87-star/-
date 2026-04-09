"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import {
  addPartnerPortfolioByUrl,
  deletePartnerPortfolioItem,
  updatePartnerPortfolioItem,
} from "@/app/admin/partners/portfolio-actions";
import { PARTNER_PORTFOLIO_MAX_ITEMS } from "@/lib/partners/portfolio-constants";
import { portfolioItemTitleForUpload } from "@/lib/partners/portfolio-upload-title";

export type PortfolioEditorItem = {
  id: string;
  title: string;
  caption: string | null;
  sort_order: number;
  thumbUrl: string;
  displayUrl: string;
  /** 외부 URL 등 next/image 도메인 제한 회피 */
  isExternal?: boolean;
};

type Props = {
  companyId: string;
  initialItems: PortfolioEditorItem[];
};

export default function PartnerPortfolioEditor({ companyId, initialItems }: Props) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [urlBusy, setUrlBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const items = initialItems.slice().sort((a, b) => a.sort_order - b.sort_order);

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (uploading || items.length >= PARTNER_PORTFOLIO_MAX_ITEMS) return;
    const form = e.currentTarget;
    const fileInput = form.elements.namedItem("file") as HTMLInputElement | null;
    const titleInput = form.elements.namedItem("title") as HTMLInputElement | null;
    const files = Array.from(fileInput?.files ?? []);
    if (files.length === 0) {
      setError("파일을 선택해 주세요.");
      return;
    }
    const slotsLeft = PARTNER_PORTFOLIO_MAX_ITEMS - items.length;
    if (slotsLeft <= 0) return;
    setUploading(true);
    setError(null);
    setMessage(null);
    const titleRawFromInput = titleInput?.value?.trim() ?? "";
    try {
      let totalAdded = 0;
      const allFailures: { name: string; error: string }[] = [];
      let totalSkipped = 0;

      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const slotsNow = PARTNER_PORTFOLIO_MAX_ITEMS - items.length - totalAdded;
        if (slotsNow <= 0) {
          totalSkipped += files.length - i;
          break;
        }

        const fd = new FormData();
        fd.set("company_id", companyId);
        fd.append("file", file);
        fd.set("title", portfolioItemTitleForUpload(file.name, i, files.length, titleRawFromInput));

        const res = await fetch("/api/partners/portfolio/upload", {
          method: "POST",
          body: fd,
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          added?: number;
          failures?: { name: string; error: string }[];
          skipped_limit?: number;
        } | null;

        if (res.status === 401) {
          throw new Error(data?.error ?? "로그인이 필요합니다.");
        }

        if (!res.ok || !data?.ok) {
          const errMsg = data?.error ?? "업로드에 실패했습니다.";
          if (errMsg.includes("최대") && errMsg.includes("장")) {
            totalSkipped += files.length - i;
            break;
          }
          allFailures.push({ name: file.name, error: errMsg });
          continue;
        }

        totalAdded += data.added ?? 1;
        if (data.skipped_limit && data.skipped_limit > 0) totalSkipped += data.skipped_limit;
        if (data.failures?.length) allFailures.push(...data.failures);
      }

      if (totalAdded === 0) {
        setError(
          allFailures.length > 0
            ? allFailures.map((f) => `${f.name}: ${f.error}`).join(" · ")
            : totalSkipped > 0
              ? `최대 ${PARTNER_PORTFOLIO_MAX_ITEMS}장까지 등록할 수 있습니다.`
              : "업로드에 실패했습니다."
        );
      } else {
        const parts: string[] = [`${totalAdded}장 추가했습니다.`];
        if (totalSkipped > 0) {
          parts.push(`${totalSkipped}장은 최대 ${PARTNER_PORTFOLIO_MAX_ITEMS}장 한도로 건너뛰었습니다.`);
        }
        if (allFailures.length > 0) {
          parts.push(`일부 실패: ${allFailures.map((f) => `${f.name}(${f.error})`).join(", ")}`);
        }
        setMessage(parts.join(" "));
        form.reset();
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "업로드 중 오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function onAddByUrl(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (urlBusy || items.length >= PARTNER_PORTFOLIO_MAX_ITEMS) return;
    const form = e.currentTarget;
    const urlInput = form.elements.namedItem("image_url") as HTMLInputElement | null;
    const titleInput = form.elements.namedItem("title_url") as HTMLInputElement | null;
    const imageUrl = urlInput?.value?.trim() ?? "";
    if (!imageUrl) {
      setError("이미지 URL을 입력하세요.");
      return;
    }
    setUrlBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await addPartnerPortfolioByUrl({
        company_id: companyId,
        image_url: imageUrl,
        title: titleInput?.value?.trim() || undefined,
      });
      if (!res.ok) throw new Error(res.error);
      setMessage("URL 이미지가 추가되었습니다.");
      form.reset();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "추가에 실패했습니다.");
    } finally {
      setUrlBusy(false);
    }
  }

  async function onSave(item: PortfolioEditorItem, draft: { title: string; caption: string; sort_order: string }) {
    setError(null);
    setMessage(null);
    const res = await updatePartnerPortfolioItem({
      id: item.id,
      title: draft.title,
      caption: draft.caption || null,
      sort_order: Number(draft.sort_order),
    });
    if (!res.ok) {
      setError(res.error ?? "저장에 실패했습니다.");
      return;
    }
    setMessage("저장되었습니다.");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("이 사진을 삭제할까요?")) return;
    setError(null);
    setMessage(null);
    const res = await deletePartnerPortfolioItem({ id });
    if (!res.ok) {
      setError(res.error ?? "삭제에 실패했습니다.");
      return;
    }
    setMessage("삭제되었습니다.");
    router.refresh();
  }

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-slate-200 bg-slate-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-800">포트폴리오 사진</p>
        <p className="text-xs text-slate-500">
          {items.length}/{PARTNER_PORTFOLIO_MAX_ITEMS}장 · 여러 장 선택 가능(서버 용량 한도를 피하려고 한 장씩 순서대로 전송) · WebP 최적화 · URL 직접 등록 가능
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-slate-500">등록된 사진이 없습니다.</p>
      ) : (
        <ul className="space-y-4">
          {items
            .slice()
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((item) => (
              <PortfolioRow key={item.id} item={item} onSave={onSave} onDelete={onDelete} />
            ))}
        </ul>
      )}

      {items.length < PARTNER_PORTFOLIO_MAX_ITEMS ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <form onSubmit={onUpload} className="space-y-2 rounded-lg border border-dashed border-slate-300 bg-white p-3">
            <p className="text-xs font-medium text-slate-700">파일 업로드</p>
            <input
              name="title"
              placeholder="제목 (선택, 여러 장이면 번호 붙임)"
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <input
              name="file"
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="block w-full text-xs text-slate-600"
            />
            <button
              type="submit"
              disabled={uploading}
              className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-emerald-300"
            >
              {uploading ? "업로드 중..." : "업로드"}
            </button>
          </form>
          <form onSubmit={(ev) => void onAddByUrl(ev)} className="space-y-2 rounded-lg border border-dashed border-sky-200 bg-white p-3">
            <p className="text-xs font-medium text-slate-700">이미지 URL</p>
            <input name="title_url" placeholder="제목 (선택)" className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm" />
            <input
              name="image_url"
              type="url"
              placeholder="https://..."
              className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
            />
            <button
              type="submit"
              disabled={urlBusy}
              className="rounded bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-sky-300"
            >
              {urlBusy ? "추가 중..." : "URL 추가"}
            </button>
          </form>
        </div>
      ) : null}

      {message ? <p className="text-xs text-emerald-700">{message}</p> : null}
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

function PortfolioRow({
  item,
  onSave,
  onDelete,
}: {
  item: PortfolioEditorItem;
  onSave: (item: PortfolioEditorItem, draft: { title: string; caption: string; sort_order: string }) => void;
  onDelete: (id: string) => void;
}) {
  const [title, setTitle] = useState(item.title);
  const [caption, setCaption] = useState(item.caption ?? "");
  const [sortOrder, setSortOrder] = useState(String(item.sort_order));

  useEffect(() => {
    setTitle(item.title);
    setCaption(item.caption ?? "");
    setSortOrder(String(item.sort_order));
  }, [item.id, item.title, item.caption, item.sort_order]);

  return (
    <li className="grid gap-3 rounded-lg border border-slate-200 bg-white p-3 sm:grid-cols-[120px_1fr]">
      <div className="relative aspect-square w-full max-w-[120px] overflow-hidden rounded-md bg-slate-100">
        {item.isExternal ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Image src={item.thumbUrl} alt="" fill className="object-cover" sizes="120px" />
        )}
      </div>
      <div className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="제목"
        />
        <input
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="설명 (선택)"
        />
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="w-24 rounded border border-slate-300 px-2 py-1 text-xs"
            placeholder="정렬"
          />
          <button
            type="button"
            onClick={() => onSave(item, { title, caption, sort_order: sortOrder })}
            className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700"
          >
            저장
          </button>
          <button type="button" onClick={() => onDelete(item.id)} className="rounded border border-rose-200 px-2 py-1 text-xs text-rose-700">
            삭제
          </button>
        </div>
      </div>
    </li>
  );
}
