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
  READY: "옮기기 준비",
  DONE: "옮기기 완료",
  ARCHIVED: "보관",
};

export function projectName(p: Project) {
  const place = [p.region_sigungu, p.region_dong].filter(Boolean).join(" ");
  const size = [p.property_type, p.area_pyeong ? `${p.area_pyeong}평` : null].filter(Boolean).join(" ");
  return [place, size, p.service_type].filter(Boolean).join(" · ");
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
    if (!window.confirm("이 현장을 삭제할까요? 연결된 초안도 목록에서 사라집니다.")) return;
    try {
      await apiJson(`/api/ai-blog/projects/${project.id}`, { method: "DELETE" });
      router.push("/ai-blog");
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const usablePairs = pairs.filter((p) => p.before_media_id || p.after_media_id).length;
  const tabs: { id: Tab; label: string }[] = [
    { id: "info", label: "현장 정보" },
    { id: "photos", label: `사진 정렬${pairs.length ? ` (${pairs.length}쌍)` : ""}` },
    { id: "blog", label: `블로그${contents.length ? ` (${contents.length})` : ""}` },
  ];

  return (
    <div className="space-y-4">
      <div className="text-xs text-slate-500">
        <Link href="/ai-blog" className="hover:underline">
          내 현장
        </Link>{" "}
        / {projectName(project)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold text-slate-900">{projectName(project)}</h1>
        <div className="flex-1" />
        <button type="button" className="text-xs text-slate-400 hover:text-rose-600" onClick={removeProject}>
          현장 삭제
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => go(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
              tab === t.id ? "border-slate-900 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {tab === "info" ? (
        <ProjectForm project={project} attributes={bundle.attributes} serviceOptions={serviceOptions} />
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
        />
      </div>

      {tab === "blog" ? (
        <div className="space-y-3">
          {!usablePairs ? (
            <Notice tone="info">
              사진 짝이 없어도 초안은 만들 수 있지만, 전후 사진을 먼저 정렬하면 사진 순서에 맞춰 글이 써집니다.{" "}
              <button type="button" className="font-semibold underline" onClick={() => go("photos")}>
                사진 정렬하기
              </button>
            </Notice>
          ) : null}
          <div className={card}>
            <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
              <h3 className="text-sm font-semibold text-slate-900">이 현장의 블로그 초안</h3>
              <div className="flex-1" />
              <button
                type="button"
                className={btnPrimary}
                disabled={creating || !canCreate}
                title={canCreate ? undefined : "AI 블로그 이용 기간에만 새 초안을 만들 수 있습니다."}
                onClick={createDraft}
              >
                {creating ? "만드는 중…" : "새 블로그 초안"}
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
                        {c.title || <span className="text-slate-400">아직 AI 초안을 만들지 않음</span>}
                      </span>
                      <span className="text-xs text-slate-500">{c.keyword}</span>
                      <span className="text-xs text-slate-500">{c.mode ? getMode(c.mode).name : ""}</span>
                      <span className="w-20 text-xs text-slate-600">{STATUS_LABEL[c.status]}</span>
                      <span className="w-16 text-xs text-slate-400">{c.updated_at.slice(5, 10).replace("-", ".")}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                &quot;새 블로그 초안&quot;을 누르면 AI 초안 만들기 화면으로 이동합니다.
              </div>
            )}
          </div>
          <div className="flex justify-end">
            <button type="button" className={btnSecondary} onClick={() => go("photos")}>
              사진 정렬 다시 보기
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
