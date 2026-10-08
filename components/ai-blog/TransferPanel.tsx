"use client";

import { useEffect, useMemo, useState } from "react";
import { PhotoSourceBar, PhotoThumb } from "@/components/ai-blog/PhotoSource";
import { copyPlain, copyText, type PhotoLayout, type ResolvedImage } from "@/components/ai-blog/content-helpers";
import { Notice, btnGhost, btnPrimary, btnSecondary, card } from "@/components/ai-blog/ui";
import type { LocalPhotosState } from "@/components/ai-blog/useLocalPhotos";
import {
  pickStageFolder,
  stageFolderInfo,
  stagePhotos,
  supportsFolderAccess,
  type ExportItem,
} from "@/lib/ai-blog/local-media";
import type { ContentBlock, ContentStatus } from "@/lib/ai-blog/types";

type Step =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "text"; text: string; no: number }
  | { kind: "images"; items: ResolvedImage[] };

const isSidePair = (items: ResolvedImage[]) =>
  items.length === 2 &&
  items[0].block.role === "BEFORE" &&
  items[1].block.role === "AFTER" &&
  items[0].block.pair_id === items[1].block.pair_id;

function buildSteps(title: string, blocks: ContentBlock[], images: Map<string, ResolvedImage>): Step[] {
  const steps: Step[] = [{ kind: "title", text: title }];
  let no = 0;
  for (const b of blocks) {
    if (b.type === "heading") {
      if (b.text.trim()) steps.push({ kind: "heading", text: b.text.trim() });
      continue;
    }
    if (b.type === "paragraph") {
      if (b.text.trim()) steps.push({ kind: "text", text: b.text.trim(), no: ++no });
      continue;
    }
    const img = images.get(b.id);
    if (!img) continue;
    const last = steps[steps.length - 1];
    if (last.kind === "images") last.items.push(img);
    else steps.push({ kind: "images", items: [img] });
  }
  return steps;
}

const toExport = (items: ResolvedImage[]): ExportItem[] =>
  items.flatMap((x) => (x.photo ? [{ fileName: x.fileName, photo: x.photo }] : []));

export default function TransferPanel({
  title,
  blocks,
  images,
  photosState,
  layout,
  status,
  onStatus,
}: {
  title: string;
  blocks: ContentBlock[];
  images: Map<string, ResolvedImage>;
  photosState: LocalPhotosState;
  layout: PhotoLayout;
  status: ContentStatus;
  onStatus: (s: ContentStatus) => void;
}) {
  const steps = useMemo(() => buildSteps(title, blocks, images), [title, blocks, images]);
  const [current, setCurrent] = useState(0);
  const [done, setDone] = useState<Set<number>>(new Set());
  const [removeGps, setRemoveGps] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  const [stage, setStage] = useState<{ name: string; granted: boolean } | null>(null);
  const [staged, setStaged] = useState<string | null>(null);
  const [staging, setStaging] = useState(false);
  const [stageErr, setStageErr] = useState<string | null>(null);

  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(supportsFolderAccess());
    void stageFolderInfo().then(setStage);
  }, []);

  const missing = [...images.values()].filter((i) => !i.photo);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash((f) => (f === msg ? null : f)), 2200);
  };

  const copy = async (text: string, label: string) => {
    say((await copyPlain(text)) ? `${label} 복사했습니다. 네이버에 붙여넣기(Ctrl+V) 하세요.` : "복사하지 못했습니다.");
  };

  const chooseStage = async (): Promise<boolean> => {
    setStageErr(null);
    try {
      const name = await pickStageFolder();
      if (!name) return false;
      setStage({ name, granted: true });
      setStaged(null);
      return true;
    } catch {
      setStageErr("이 폴더는 사용할 수 없습니다. 바탕화면 안에 새 폴더를 만들어 선택해 주세요.");
      return false;
    }
  };

  /** 옮기기 폴더를 이 사진들로 교체. key 는 지금 폴더에 무엇이 들어 있는지 표시용 */
  const stageItems = async (items: ResolvedImage[], key: string) => {
    const list = toExport(items);
    if (!list.length) {
      say("이 사진을 내 PC에서 찾지 못했습니다. 왼쪽에서 사진 폴더를 열어 주세요.");
      return;
    }
    setStaging(true);
    setStageErr(null);
    try {
      let r = await stagePhotos(list, removeGps);
      if (!r.ok && r.reason === "no_folder" && (await chooseStage())) r = await stagePhotos(list, removeGps);
      if (r.ok) {
        setStaged(key);
        setStage({ name: r.folderName, granted: true });
      } else if (r.reason === "denied") {
        setStageErr("옮기기 폴더 쓰기 권한이 없습니다. 다시 눌러 '허용'을 선택하거나 폴더를 다시 정해 주세요.");
      }
    } catch {
      setStageErr("옮기기 폴더에 사진을 넣지 못했습니다. 폴더를 다시 정해 주세요.");
    } finally {
      setStaging(false);
    }
  };

  const stepKey = (i: number) => `step:${i}`;

  const goTo = (i: number) => {
    setCurrent(i);
    const s = steps[i];
    if (s?.kind === "images" && stage && staged !== stepKey(i)) void stageItems(s.items, stepKey(i));
  };

  const finishStep = (i: number) => {
    setDone((prev) => new Set(prev).add(i));
    goTo(Math.min(i + 1, steps.length - 1));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <div className="space-y-4 lg:col-span-2">
        <section className={`${card} space-y-3 p-4`}>
          <h3 className="text-sm font-semibold text-slate-900">1. 옮기기 폴더 준비 (처음 한 번)</h3>
          {!supported ? (
            <Notice tone="warning">이 기능은 PC 크롬에서만 사용할 수 있습니다.</Notice>
          ) : stage ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                <span className="text-slate-500">옮기기 폴더</span>
                <b className="text-slate-900">{stage.name}</b>
                <div className="flex-1" />
                <button type="button" className={btnGhost} onClick={() => void chooseStage()}>
                  바꾸기
                </button>
              </div>
              <p className="text-xs text-slate-600">
                윈도우 탐색기로 <b>{stage.name}</b> 폴더를 열어 네이버 글쓰기 창 옆에 두세요. 오른쪽에서 사진 단계를 누르면 그
                사진 원본만 이 폴더에 들어갑니다. 탐색기에서 끌어 네이버에 놓으면 원본 그대로 올라갑니다.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <ol className="list-decimal space-y-0.5 pl-4 text-xs text-slate-600">
                <li>바탕화면에 빈 폴더를 하나 만듭니다 (예: 블로그옮기기).</li>
                <li>아래 버튼으로 그 폴더를 고르고 &quot;수정 허용&quot;을 누릅니다.</li>
                <li>윈도우 탐색기로 그 폴더를 열어 네이버 글쓰기 창 옆에 둡니다.</li>
              </ol>
              <button type="button" className={btnPrimary} onClick={() => void chooseStage()}>
                옮기기 폴더 정하기
              </button>
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            폴더 안의 다른 파일은 건드리지 않고, 01_before.jpg 같은 옮기기용 파일만 바꿉니다.
          </p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={removeGps} onChange={(e) => setRemoveGps(e.target.checked)} />
            사진 속 위치정보(GPS)는 지우고 넣기 (화질 그대로)
          </label>
          {stageErr ? <Notice tone="error">{stageErr}</Notice> : null}
          <div className="border-t border-slate-100 pt-3">
            <p className="mb-2 text-xs font-medium text-slate-600">현장 사진</p>
            <PhotoSourceBar state={photosState} />
            {missing.length ? (
              <div className="mt-2">
                <Notice tone="warning">
                  {missing.length}장을 열린 사진에서 찾지 못했습니다: {missing.map((m) => m.media?.local_name ?? m.fileName).join(", ")}
                </Notice>
              </div>
            ) : null}
          </div>
        </section>

        <section className={`${card} space-y-2 p-4`}>
          <h3 className="text-sm font-semibold text-slate-900">한 번에 복사</h3>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnSecondary} onClick={() => copy(title, "제목을")}>
              제목 복사
            </button>
            <button type="button" className={btnSecondary} onClick={() => copy(copyText(blocks), "본문 전체를")}>
              본문 전체 복사 (글만)
            </button>
          </div>
          <p className="text-xs text-slate-500">서식 없는 순수 글자만 복사됩니다.</p>
        </section>

        <section className={`${card} space-y-2 p-4`}>
          <h3 className="text-sm font-semibold text-slate-900">3. 발행은 네이버에서 직접</h3>
          <p className="text-xs text-slate-600">
            네이버 로그인과 발행은 사용자가 직접 합니다. 클린아이덱스는 네이버 계정 정보를 받거나 저장하지 않습니다.
          </p>
          <button
            type="button"
            className={status === "DONE" ? btnSecondary : btnPrimary}
            onClick={() => onStatus(status === "DONE" ? "READY" : "DONE")}
          >
            {status === "DONE" ? "옮기기 완료 취소" : "네이버로 옮기기 완료"}
          </button>
        </section>
      </div>

      <section className={`${card} p-4 lg:col-span-3`}>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">2. 순서대로 옮기기</h3>
          <span className="text-xs text-slate-500">
            {done.size}/{steps.length} 완료
          </span>
          <div className="flex-1" />
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setDone(new Set());
              setCurrent(0);
            }}
          >
            처음부터
          </button>
        </div>
        {flash ? (
          <div className="sticky top-2 z-10 mb-3">
            <Notice tone="success">{flash}</Notice>
          </div>
        ) : null}
        <ol className="space-y-2">
          {steps.map((s, i) => {
            const isCurrent = i === current;
            const isDone = done.has(i);
            const inFolder = staged === stepKey(i);
            return (
              <li
                key={i}
                onClick={() => goTo(i)}
                className={`cursor-pointer rounded-lg border p-3 ${
                  isCurrent ? "border-emerald-500 bg-emerald-50/40" : isDone ? "border-slate-100 opacity-60" : "border-slate-200"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                      isDone ? "bg-emerald-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {isDone ? "✓" : i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    {s.kind === "title" ? (
                      <>
                        <p className="text-xs font-semibold text-slate-500">제목</p>
                        <p className="text-sm font-semibold text-slate-900">{s.text}</p>
                      </>
                    ) : null}
                    {s.kind === "heading" ? (
                      <>
                        <p className="text-xs font-semibold text-emerald-700">소제목</p>
                        <p className="text-base font-bold text-slate-900">{s.text}</p>
                        {isCurrent ? (
                          <p className="mt-1 text-xs text-slate-500">
                            붙여넣은 줄을 선택하고 네이버 글자 스타일에서 &quot;소제목&quot;을 고르면 소제목 모양이 됩니다.
                          </p>
                        ) : null}
                      </>
                    ) : null}
                    {s.kind === "text" ? (
                      <>
                        <p className="text-xs font-semibold text-slate-500">문단 {s.no}</p>
                        <p className={`whitespace-pre-wrap text-sm text-slate-800 ${isCurrent ? "" : "line-clamp-2"}`}>{s.text}</p>
                      </>
                    ) : null}
                    {s.kind === "images" ? (
                      <>
                        <p className="text-xs font-semibold text-slate-500">
                          사진 {s.items.map((x) => x.fileName).join(", ")}
                          {inFolder ? (
                            <span className="ml-2 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] text-white">
                              옮기기 폴더에 있음
                            </span>
                          ) : null}
                        </p>
                        {isCurrent ? (
                          <p className="mt-1 text-xs text-emerald-700">
                            {staging
                              ? "옮기기 폴더에 넣는 중…"
                              : inFolder
                                ? `탐색기의 ${stage?.name ?? "옮기기"} 폴더에서 ${
                                    s.items.length > 1 ? "사진을 함께 선택(Ctrl+A)해 " : "사진을 "
                                  }네이버 글쓰기 창으로 끌어다 놓으세요.${
                                    layout === "side" && isSidePair(s.items)
                                      ? " 두 장이 들어가면 \"콜라주\"를 골라 좌우로 배치하세요."
                                      : ""
                                  }`
                                : "이 단계를 누르면 이 사진들이 옮기기 폴더에 들어갑니다. 사진 한 장만 넣으려면 그 사진을 누르세요."}
                          </p>
                        ) : null}
                        <div className={`mt-2 flex flex-wrap ${layout === "side" && isSidePair(s.items) ? "gap-1" : "gap-2"}`}>
                          {s.items.map((x) => {
                            const single = staged === `photo:${x.block.id}`;
                            return (
                              <button
                                key={x.block.id}
                                type="button"
                                disabled={!x.photo || staging}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrent(i);
                                  void stageItems([x], `photo:${x.block.id}`);
                                }}
                                className={`w-28 space-y-0.5 rounded-md text-left ${single ? "ring-2 ring-emerald-500" : ""}`}
                                title="이 사진만 옮기기 폴더에 넣기"
                              >
                                <PhotoThumb photo={x.photo} name={x.media?.local_name} className="h-20 w-28 rounded" />
                                <p className="truncate text-[11px] font-semibold text-slate-700">{x.fileName}</p>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    ) : null}
                  </div>
                  {isCurrent ? (
                    <div className="flex shrink-0 flex-col gap-1">
                      {s.kind === "images" ? (
                        <>
                          {!inFolder ? (
                            <button
                              type="button"
                              className={btnPrimary}
                              disabled={staging || !s.items.some((x) => x.photo)}
                              onClick={(e) => {
                                e.stopPropagation();
                                void stageItems(s.items, stepKey(i));
                              }}
                            >
                              폴더에 넣기
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className={inFolder ? btnPrimary : btnSecondary}
                            onClick={(e) => {
                              e.stopPropagation();
                              finishStep(i);
                            }}
                          >
                            넣었어요 → 다음
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          className={btnPrimary}
                          onClick={(e) => {
                            e.stopPropagation();
                            void copy(
                              s.text,
                              s.kind === "title" ? "제목을" : s.kind === "heading" ? "소제목을" : `문단 ${s.no}을(를)`,
                            );
                            finishStep(i);
                          }}
                        >
                          복사하고 다음
                        </button>
                      )}
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
