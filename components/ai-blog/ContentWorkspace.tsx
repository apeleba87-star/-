"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import BlockEditor from "@/components/ai-blog/BlockEditor";
import GeneratePanel, { type GenerateRequest } from "@/components/ai-blog/GeneratePanel";
import NaverPreview from "@/components/ai-blog/NaverPreview";
import { STATUS_LABEL, projectName } from "@/components/ai-blog/ProjectWorkspace";
import TransferPanel from "@/components/ai-blog/TransferPanel";
import {
  copyText,
  countKeyword,
  fullText,
  resolveImages,
  type PhotoLayout,
} from "@/components/ai-blog/content-helpers";
import { Notice, btnPrimary } from "@/components/ai-blog/ui";
import { useLocalPhotos } from "@/components/ai-blog/useLocalPhotos";
import { siteFolderName } from "@/lib/ai-blog/local-media";
import { getMode } from "@/lib/ai-blog/modes";
import { apiJson } from "@/lib/ai-blog/messages";
import { findBannedPhrases } from "@/lib/ai-blog/sanitize";
import type {
  Content,
  ContentBlock,
  ContentStatus,
  MediaPair,
  Project,
  ProjectAttribute,
  ProjectMedia,
  UsageSummary,
} from "@/lib/ai-blog/types";

type Step = "generate" | "edit" | "transfer";
const LAYOUT_KEY = "ai-blog-photo-layout";
type SaveState = "saved" | "dirty" | "saving" | "error";

export default function ContentWorkspace({
  initial,
  bundle,
  usage,
  bannedPhrases,
  knowledgePreview,
  businessName = "",
  aiLocked = false,
  initialStep,
}: {
  aiLocked?: boolean;
  initial: Content;
  bundle: { project: Project; attributes: ProjectAttribute[]; media: ProjectMedia[]; pairs: MediaPair[] };
  usage: UsageSummary | null;
  bannedPhrases: string[];
  knowledgePreview: { title: string; basis: string }[];
  businessName?: string;
  initialStep?: Step;
}) {
  const router = useRouter();
  const { project } = bundle;
  const [content, setContent] = useState<Content>(initial);
  const [title, setTitle] = useState(initial.title);
  const [blocks, setBlocks] = useState<ContentBlock[]>(initial.blocks);
  const [step, setStep] = useState<Step>(() => {
    if (initialStep === "transfer" && initial.blocks.length) return "transfer";
    if (initialStep === "edit" && initial.blocks.length) return "edit";
    if (initialStep === "generate") return "generate";
    return initial.blocks.length ? "edit" : "generate";
  });
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [generating, setGenerating] = useState(false);
  const [rewritingId, setRewritingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const photosState = useLocalPhotos(project.id);
  const [layout, setLayout] = useState<PhotoLayout>("side");
  useEffect(() => {
    if (localStorage.getItem(LAYOUT_KEY) === "stack") setLayout("stack");
  }, []);
  const changeLayout = (l: PhotoLayout) => {
    setLayout(l);
    localStorage.setItem(LAYOUT_KEY, l);
  };
  const pending = useRef<{ title: string; blocks: ContentBlock[] } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const images = useMemo(
    () => resolveImages(blocks, bundle.media, bundle.pairs, photosState.photos),
    [blocks, bundle.media, bundle.pairs, photosState.photos],
  );
  const text = useMemo(() => fullText(blocks), [blocks]);
  const bannedFound = useMemo(
    () => findBannedPhrases(`${title}\n${copyText(blocks)}`, bannedPhrases),
    [title, blocks, bannedPhrases],
  );

  const applyServer = (c: Content) => {
    setContent(c);
    setTitle(c.title);
    setBlocks(c.blocks);
    pending.current = null;
    setSaveState("saved");
  };

  const flush = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const body = pending.current;
    if (!body) return true;
    pending.current = null;
    setSaveState("saving");
    try {
      const c = await apiJson<Content>(`/api/ai-blog/contents/${content.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      setContent((prev) => ({ ...prev, updated_at: c.updated_at, status: c.status }));
      setSaveState(pending.current ? "dirty" : "saved");
      return true;
    } catch (e) {
      pending.current = pending.current ?? body;
      setSaveState("error");
      setError((e as Error).message);
      return false;
    }
  }, [content.id]);

  const schedule = (nextTitle: string, nextBlocks: ContentBlock[]) => {
    pending.current = { title: nextTitle, blocks: nextBlocks };
    setSaveState("dirty");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void flush(), 1200);
  };

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (pending.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const generate = async (req: GenerateRequest) => {
    setError(null);
    if (!(await flush())) return;
    setGenerating(true);
    try {
      const c = await apiJson<Content>(`/api/ai-blog/contents/${content.id}/generate`, {
        method: "POST",
        body: JSON.stringify(req),
      });
      applyServer(c);
      setStep("edit");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  const rewrite = async (blockId: string, hint: string) => {
    setError(null);
    if (!(await flush())) return;
    setRewritingId(blockId);
    try {
      const c = await apiJson<Content>(`/api/ai-blog/contents/${content.id}/rewrite`, {
        method: "POST",
        body: JSON.stringify({ block_id: blockId, hint }),
      });
      applyServer(c);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setRewritingId(null);
    }
  };

  const setStatus = async (status: ContentStatus) => {
    setError(null);
    if (!(await flush())) return;
    try {
      const c = await apiJson<Content>(`/api/ai-blog/contents/${content.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setContent((prev) => ({ ...prev, status: c.status }));
      if (c.status === "DONE") {
        router.push("/ai-blog");
        router.refresh();
      }
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const goStep = async (next: Step) => {
    if (next === "transfer" && content.status === "DRAFT") void setStatus("READY");
    else await flush();
    setStep(next);
  };

  const removeDraft = async () => {
    if (!window.confirm("이 글을 삭제할까요?")) return;
    try {
      await apiJson(`/api/ai-blog/contents/${content.id}`, { method: "DELETE" });
      router.push(`/ai-blog/projects/${project.id}?tab=blog`);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const maxRewrites = usage?.max_partial_rewrites_per_content ?? 10;
  const hasDraft = blocks.length > 0;
  const keywordCount = countKeyword(`${title}\n${text}`, content.keyword);
  const saveLabel = { saved: "저장됨", dirty: "저장 대기", saving: "저장 중…", error: "저장 실패" }[saveState];

  const steps: { id: Step; label: string; enabled: boolean }[] = [
    { id: "generate", label: "글 만들기", enabled: true },
    { id: "edit", label: "고치기", enabled: hasDraft },
    { id: "transfer", label: "네이버에 올리기", enabled: hasDraft },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        <Link href="/ai-blog" className="hover:underline">
          내 블로그 글
        </Link>{" "}
        /{" "}
        <Link href={`/ai-blog/projects/${project.id}?tab=blog`} className="hover:underline">
          {projectName(project)}
        </Link>{" "}
        / 글 쓰기
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm">
        <Link
          href={`/ai-blog/projects/${project.id}?tab=info`}
          className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800 hover:bg-emerald-100"
          title="작업 정보 수정"
        >
          1 작업 정보
        </Link>
        <span className="text-slate-300">→</span>
        <Link
          href={`/ai-blog/projects/${project.id}?tab=photos`}
          className="rounded-full bg-emerald-50 px-2.5 py-0.5 font-medium text-emerald-800 hover:bg-emerald-100"
          title="사진 전·후 다시 맞추기"
        >
          2 사진
        </Link>
        <span className="text-slate-300">→</span>
        <span className="rounded-full bg-slate-900 px-2.5 py-0.5 font-medium text-white">3·4 글 · 네이버</span>
        <span className="ml-1 text-xs text-slate-500">실수했으면 위 1·2를 눌러 돌아가 고치세요.</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s) => (
          <button
            key={s.id}
            type="button"
            disabled={!s.enabled || generating}
            onClick={() => void goStep(s.id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
              step === s.id ? "bg-slate-900 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {s.label}
          </button>
        ))}
        <div className="flex-1" />
        <span className="text-xs text-slate-500">
          {STATUS_LABEL[content.status]}
          {content.mode ? ` · ${getMode(content.mode).name}` : ""}
          {hasDraft ? ` · ${saveLabel}` : ""}
        </span>
        <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={removeDraft}>
          글 삭제
        </button>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {step === "generate" ? (
        <GeneratePanel
          content={content}
          pairs={bundle.pairs}
          knowledgePreview={knowledgePreview}
          usage={usage}
          generating={generating}
          onGenerate={generate}
          locked={aiLocked}
        />
      ) : null}

      {step === "edit" ? (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  본문 {text.length.toLocaleString()}자 (공백 제외 {text.replace(/\s/g, "").length.toLocaleString()}자)
                </span>
                <span>
                  키워드 &ldquo;{content.keyword}&rdquo; {keywordCount}회
                </span>
                <span>사진 {images.size}장</span>
                <span>
                  문단 다시쓰기 {content.partial_rewrite_count}/{maxRewrites}회
                </span>
              </div>
              <BlockEditor
                title={title}
                titleCandidates={content.title_candidates}
                blocks={blocks}
                images={images}
                rewriteLeft={aiLocked ? 0 : Math.max(maxRewrites - content.partial_rewrite_count, 0)}
                rewritingId={rewritingId}
                bannedFound={bannedFound}
                onTitle={(t) => {
                  setTitle(t);
                  schedule(t, blocks);
                }}
                onBlocks={(b) => {
                  setBlocks(b);
                  schedule(title, b);
                }}
                onRewrite={rewrite}
              />
            </div>
            <div className="space-y-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
              {!photosState.photos.length && images.size ? (
                <Notice tone="info">
                  사진 폴더를 열면 미리보기에 실제 사진이 보입니다.{" "}
                  <button
                    type="button"
                    className="font-semibold underline"
                    onClick={() =>
                      void (photosState.pendingRemembered.length ? photosState.reopen() : photosState.addFolder())
                    }
                  >
                    {photosState.pendingRemembered.length ? "이전 폴더 열기" : "폴더 선택"}
                  </button>
                </Notice>
              ) : null}
              <NaverPreview
                title={title}
                blocks={blocks}
                images={images}
                businessName={businessName}
                layout={layout}
                onLayout={changeLayout}
              />
              <p className="text-center text-sm text-slate-600">글이 괜찮으면 아래로 → 네이버에 올리기</p>
            </div>
          </div>
          <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center gap-3 border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur">
            <span className="text-xs text-slate-500">{saveLabel === "저장됨" ? "글이 저장되어 있습니다" : saveLabel}</span>
            <div className="flex-1" />
            <button
              type="button"
              className={`${btnPrimary} px-6 py-3 text-base`}
              onClick={() => void goStep("transfer")}
            >
              다음: 네이버에 올리기 →
            </button>
          </div>
        </div>
      ) : null}

      {step === "transfer" ? (
        <TransferPanel
          projectId={project.id}
          siteFolderLabel={siteFolderName(project)}
          title={title}
          blocks={blocks}
          images={images}
          photosState={photosState}
          businessName={businessName}
          layout={layout}
          onLayout={changeLayout}
          status={content.status}
          onStatus={(s) => void setStatus(s)}
          serverOriginals={bundle.media.some((item) => Boolean(item.storage_path))}
        />
      ) : null}
    </div>
  );
}
