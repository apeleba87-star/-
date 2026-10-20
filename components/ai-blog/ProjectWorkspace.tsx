"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import PhotoSorter from "@/components/ai-blog/PhotoSorter";
import ProjectForm from "@/components/ai-blog/ProjectForm";
import { Notice, btnPrimary, btnSecondary, card } from "@/components/ai-blog/ui";
import { useLocalPhotos } from "@/components/ai-blog/useLocalPhotos";
import { getMode } from "@/lib/ai-blog/modes";
import { apiJson } from "@/lib/ai-blog/messages";
import type {
  BlogMode,
  Content,
  ContentStatus,
  MediaPair,
  Project,
  ProjectAttribute,
  ProjectMedia,
} from "@/lib/ai-blog/types";

export type ContentSummary = {
  id: string;
  title: string;
  keyword: string;
  status: ContentStatus;
  mode: BlogMode | null;
  generation_count: number;
  created_at: string;
  updated_at: string;
};

type Tab = "info" | "photos" | "blog";

export const STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: "작성 중",
  READY: "네이버에 넣으면 됨",
  DONE: "완료",
  ARCHIVED: "보관",
};

export function projectName(p: Project) {
  const place = [p.region_sigungu, p.region_dong].filter(Boolean).join(" ");
  const size = [p.property_type, p.area_pyeong ? `${p.area_pyeong}평` : null].filter(Boolean).join(" ");
  return [place, size, p.service_type].filter(Boolean).join(" · ");
}

function StepBar({
  current,
  onGo,
}: {
  current: 1 | 2 | 3;
  onGo: (tab: Tab) => void;
}) {
  const items: { n: 1 | 2 | 3 | 4; label: string; tab?: Tab }[] = [
    { n: 1, label: "작업 정보", tab: "info" },
    { n: 2, label: "사진", tab: "photos" },
    { n: 3, label: "글 쓰기", tab: "blog" },
    { n: 4, label: "네이버에 올리기", tab: "blog" },
  ];
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5">
        {items.map((item, i) => {
          const active = item.n === current || (current === 3 && item.n === 4);
          const done = item.n < current;
          const className = `rounded-full px-2.5 py-0.5 text-sm ${
            active
              ? "bg-slate-900 font-medium text-white"
              : done
                ? "bg-emerald-50 font-medium text-emerald-800 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
          }`;
          return (
            <div key={item.n} className="flex items-center gap-2">
              {i > 0 ? <span className="text-slate-300">→</span> : null}
              {item.tab ? (
                <button type="button" className={className} onClick={() => onGo(item.tab!)}>
                  {item.n} {item.label}
                </button>
              ) : (
                <span className={className}>
                  {item.n} {item.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">이전 단계로 돌아가려면 위 번호를 누르세요.</p>
    </div>
  );
}

export default function ProjectWorkspace({
  bundle,
  serviceOptions,
  contents,
  labelSuggestions,
  initialTab,
  canCreate = true,
}: {
  canCreate?: boolean;
  bundle: { project: Project; attributes: ProjectAttribute[]; media: ProjectMedia[]; pairs: MediaPair[] };
  serviceOptions: string[];
  contents: ContentSummary[];
  labelSuggestions: string[];
  initialTab: Tab;
}) {
  const router = useRouter();
  const { project } = bundle;
  const [tab, setTab] = useState<Tab>(initialTab);
  const [pairs, setPairs] = useState<MediaPair[]>(bundle.pairs);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photosState = useLocalPhotos(project.id);

  const go = (next: Tab) => {
    setTab(next);
    window.history.replaceState(null, "", `/ai-blog/projects/${project.id}?tab=${next}`);
  };

  const createDraft = async () => {
    setCreating(true);
    setError(null);
    try {
      const c = await apiJson<Content>("/api/ai-blog/contents", {
        method: "POST",
        body: JSON.stringify({ project_id: project.id }),
      });
      router.push(`/ai-blog/contents/${c.id}`);
    } catch (e) {
      setError((e as Error).message);
      setCreating(false);
    }
  };

  const removeProject = async () => {
    if (!window.confirm("이 작업을 삭제할까요? 연결된 글도 목록에서 사라집니다.")) return;
    try {
      await apiJson(`/api/ai-blog/projects/${project.id}`, { method: "DELETE" });
      router.push("/ai-blog");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const usablePairs = pairs.filter((p) => p.before_media_id || p.after_media_id).length;
  const stepNum: 1 | 2 | 3 = tab === "info" ? 1 : tab === "photos" ? 2 : 3;
  const stepHint =
    tab === "info"
      ? "지금: 어디에, 무슨 청소를 했는지 알려 주세요."
      : tab === "photos"
        ? "지금: 사진을 크게 보고 전·후를 맞춰 주세요."
        : "지금: AI로 글을 만들고, 네이버에 올리세요.";

  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "1. 작업 정보" },
    { id: "photos", label: `2. 사진${usablePairs ? ` (${usablePairs}세트)` : ""}` },
    { id: "blog", label: `3·4. 글 · 네이버${contents.length ? ` (${contents.length})` : ""}` },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        <Link href="/ai-blog" className="hover:underline">
          내 블로그 글
        </Link>{" "}
        / {projectName(project)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">{projectName(project)}</h1>
        <div className="flex-1" />
        <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={removeProject}>
          작업 삭제
        </button>
      </div>

      <StepBar current={stepNum} onGo={go} />
      <p className="text-sm text-slate-600">{stepHint}</p>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => go(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
              tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {tab === "info" ? (
        <div className="space-y-3">
          <ProjectForm
            project={project}
            attributes={bundle.attributes}
            serviceOptions={serviceOptions}
            onSavedNext={() => go("photos")}
          />
        </div>
      ) : null}

      <div hidden={tab !== "photos"}>
        <PhotoSorter
          projectId={project.id}
          media={bundle.media}
          pairs={pairs}
          photosState={photosState}
          labelSuggestions={labelSuggestions}
          onSaved={(_media, nextPairs) => {
            setPairs(nextPairs);
            router.refresh();
          }}
          onContinue={() => {
            go("blog");
            if (!contents.length && canCreate) void createDraft();
          }}
        />
      </div>

      {tab === "blog" ? (
        <div className="space-y-3">
          {!usablePairs ? (
            <Notice tone="info">
              전·후 사진이 없어도 글은 만들 수 있지만, 사진을 먼저 맞추면 글이 더 잘 나옵니다.{" "}
              <button type="button" className="font-semibold underline" onClick={() => go("photos")}>
                사진 맞추기
              </button>
            </Notice>
          ) : null}
          <div className={card}>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">이 작업의 블로그 글</h3>
              <div className="flex-1" />
              <button
                type="button"
                className={btnPrimary}
                disabled={creating || !canCreate}
                title={canCreate ? undefined : "AI 블로그 이용 기간에만 새 글을 만들 수 있습니다."}
                onClick={() => void createDraft()}
              >
                {creating ? "만드는 중…" : contents.length ? "새 글 만들기" : "AI로 글 만들기"}
              </button>
            </div>
            {contents.length ? (
              <ul className="divide-y divide-slate-100">
                {contents.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/ai-blog/contents/${c.id}`}
                      className="flex flex-wrap items-center gap-x-6 gap-y-1 px-4 py-3 hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1 text-sm font-medium text-slate-900">
                        {c.title || <span className="text-slate-400">아직 글을 만들지 않음 · 눌러서 이어서</span>}
                      </span>
                      <span className="text-xs text-slate-500">{c.keyword}</span>
                      <span className="text-xs text-slate-500">{c.mode ? getMode(c.mode).name : ""}</span>
                      <span className="min-w-[7rem] text-xs text-slate-600">{STATUS_LABEL[c.status]}</span>
                      <span className="w-16 text-xs text-slate-400">{c.updated_at.slice(5, 10).replace("-", ".")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                &quot;AI로 글 만들기&quot;를 누르면 글 작성 화면으로 이동합니다.
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button type="button" className={btnSecondary} onClick={() => go("photos")}>
              ← 사진 다시 보기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
