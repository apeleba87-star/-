"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { PhotoSourceBar, PhotoThumb } from "@/components/ai-blog/PhotoSource";
import NaverPreview from "@/components/ai-blog/NaverPreview";
import { copyPlain, copyText, type PhotoLayout, type ResolvedImage } from "@/components/ai-blog/content-helpers";
import { Notice, btnGhost, btnPrimary, btnSecondary, card } from "@/components/ai-blog/ui";
import type { LocalPhotosState } from "@/components/ai-blog/useLocalPhotos";
import {
  fieldFolderInfo,
  organizeFieldFolder,
  pickFieldFolder,
  supportsFolderAccess,
  type ExportItem,
} from "@/lib/ai-blog/local-media";
import type { ContentBlock, ContentStatus } from "@/lib/ai-blog/types";

type FieldInfo = { name: string; granted: boolean; siteName?: string };

function StepCard({
  n,
  title,
  done,
  active,
  nextHint,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  active: boolean;
  nextHint?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`${card} p-5 transition ${
        done
          ? "border-emerald-200 bg-emerald-50/40"
          : active
            ? "border-slate-900 ring-2 ring-slate-900/10"
            : "opacity-80"
      }`}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
            done ? "bg-emerald-600 text-white" : active ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
          }`}
        >
          {done ? "✓" : n}
        </span>
        <h3 className="text-lg font-bold text-slate-900">{title}</h3>
        {done ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">완료</span> : null}
        {!done && active && nextHint ? <span className="text-xs font-medium text-emerald-700">{nextHint}</span> : null}
      </div>
      {children}
    </section>
  );
}

export default function TransferPanel({
  projectId,
  siteFolderLabel,
  title,
  blocks,
  images,
  photosState,
  businessName,
  layout,
  onLayout,
  status,
  onStatus,
  serverOriginals = false,
}: {
  projectId: string;
  /** 예: 자양동 34평 입주청소 */
  siteFolderLabel: string;
  title: string;
  blocks: ContentBlock[];
  images: Map<string, ResolvedImage>;
  photosState: LocalPhotosState;
  businessName: string;
  layout: PhotoLayout;
  onLayout: (l: PhotoLayout) => void;
  status: ContentStatus;
  onStatus: (s: ContentStatus) => void;
  serverOriginals?: boolean;
}) {
  const [removeGps, setRemoveGps] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [field, setField] = useState<FieldInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [doneOrganize, setDoneOrganize] = useState(false);
  const [doneCopy, setDoneCopy] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    setSupported(supportsFolderAccess());
    void fieldFolderInfo(projectId).then(setField);
  }, [projectId]);

  const upload = useMemo<ExportItem[]>(
    () =>
      [...images.values()]
        .filter((x) => x.photo)
        .sort((a, b) => a.order - b.order)
        .map((x) => ({ fileName: x.fileName, photo: x.photo! })),
    [images],
  );
  const usedKeys = useMemo(() => new Set(upload.map((u) => u.photo.key)), [upload]);
  const unused = useMemo(
    () => photosState.photos.filter((p) => !usedKeys.has(p.key)),
    [photosState.photos, usedKeys],
  );
  const missing = [...images.values()].filter((i) => !i.photo);

  const say = (msg: string) => {
    setFlash(msg);
    setTimeout(() => setFlash((f) => (f === msg ? null : f)), 3200);
  };

  const copy = async (text: string, label: string) => {
    const ok = await copyPlain(text);
    if (ok) {
      setDoneCopy(true);
      say(`${label} 복사했습니다. 다음: 네이버에 붙여넣기(Ctrl+V)`);
    } else {
      say("복사하지 못했습니다. 다시 눌러 주세요.");
    }
  };

  const chooseField = async (): Promise<boolean> => {
    setErr(null);
    try {
      const name = await pickFieldFolder(projectId);
      if (!name) return false;
      setField({ name, granted: true });
      setDoneOrganize(false);
      return true;
    } catch {
      setErr("이 폴더는 사용할 수 없습니다. 바탕화면 안에 새 폴더를 만들어 선택해 주세요.");
      return false;
    }
  };

  const organize = async () => {
    if (!upload.length && !unused.length) {
      say("정리할 사진이 없습니다. 아래에서 사진 폴더를 열어 주세요.");
      return;
    }
    if (!photosState.photos.length) {
      say("사진 폴더를 먼저 열어 주세요.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      let r = await organizeFieldFolder(projectId, upload, unused, removeGps, siteFolderLabel);
      if (!r.ok && r.reason === "no_folder" && (await chooseField())) {
        r = await organizeFieldFolder(projectId, upload, unused, removeGps, siteFolderLabel);
      }
      if (r.ok) {
        setField({ name: r.parentName, granted: true, siteName: r.folderName });
        setDoneOrganize(true);
        say(`「${r.folderName}」 폴더에 사진 ${r.uploadCount}장 준비됨. 다음: 글 복사하기`);
      } else if (r.reason === "denied") {
        setErr("폴더 쓰기 권한이 없습니다. 다시 눌러 ‘허용’을 선택하거나 폴더를 다시 정해 주세요.");
      } else if (r.reason === "unsupported") {
        setErr("이 기능은 PC 크롬에서만 사용할 수 있습니다.");
      } else {
        setErr("저장할 폴더를 정해 주세요.");
      }
    } catch {
      setErr("폴더에 사진을 넣지 못했습니다. 폴더를 다시 정해 주세요.");
    } finally {
      setBusy(false);
    }
  };

  const step1Active = !doneOrganize;
  const step2Active = doneOrganize && !doneCopy;
  const step3Active = doneOrganize && doneCopy;

  const markDone = () => {
    if (status === "DONE") {
      onStatus("READY");
      return;
    }
    if (
      !window.confirm(
        serverOriginals
          ? "네이버에 원본 사진을 다 올리셨나요? 완료하면 서버의 원본은 지워지고 미리보기만 남습니다."
          : "네이버에 글을 붙여 넣고 사진까지 넣으셨나요?",
      )
    )
      return;
    onStatus("DONE");
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
      <div className={`${card} space-y-2 border-amber-200 bg-amber-50 p-4`}>
        <h2 className="text-lg font-bold text-slate-900">네이버에 글을 옮기는 방법</h2>
        <p className="text-sm text-slate-700">
          클린아이덱스는 네이버에 <b>대신 올리지 않습니다</b>. 글자는 <b>텍스트만</b> 복사하고, 꾸미고 싶으면 오른쪽
          미리보기를 보고 네이버에서 따라 하면 됩니다. <b>안 꾸며도</b> 올릴 수 있습니다.
        </p>
        <ol className="flex flex-wrap gap-2 text-xs font-semibold">
          <li className={`rounded-full px-2.5 py-1 ${doneOrganize ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>
            1 사진 준비
          </li>
          <li className={`rounded-full px-2.5 py-1 ${doneCopy ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>
            2 글 복사
          </li>
          <li className={`rounded-full px-2.5 py-1 ${status === "DONE" ? "bg-emerald-600 text-white" : "bg-white text-slate-700"}`}>
            3 네이버에 넣기
          </li>
        </ol>
      </div>

      {flash ? <Notice tone="success">{flash}</Notice> : null}
      {err ? <Notice tone="error">{err}</Notice> : null}

      <StepCard
        n={1}
        title="블로그용 사진 준비하기"
        done={doneOrganize}
        active={step1Active}
        nextHint="지금 할 일"
      >
        {doneOrganize ? (
          <div className="space-y-2">
            <p className="text-sm text-emerald-800">
              ✓ 탐색기에서{" "}
              <b>
                {field?.name} → {field?.siteName ?? siteFolderLabel} → 블로그업로드
              </b>{" "}
              폴더를 쓰세요. (원본은 그대로, 복사본만 모음)
            </p>
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => void organize()}>
                사진 다시 정리하기
              </button>
              <button type="button" className={btnGhost} disabled={busy} onClick={() => void chooseField()}>
                저장 폴더 바꾸기
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              저장 위치를 고르면 그 안에 <b>{siteFolderLabel}</b> 폴더를 만들고, 그 아래{" "}
              <b>블로그업로드</b> / <b>원본_미사용</b>으로 나눕니다.
            </p>
            <p className="text-xs text-slate-500">
              같은 번호가 한 세트 · 예: <code className="rounded bg-slate-100 px-1">01.… 전</code> /{" "}
              <code className="rounded bg-slate-100 px-1">01.… 후</code>
            </p>
            {!supported ? <Notice tone="warning">PC 크롬에서만 폴더 기능을 쓸 수 있습니다.</Notice> : null}
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
              블로그용 <b>{upload.length}</b>장 · 미사용 <b>{unused.length}</b>장
              <span className="mt-1 block text-slate-600">
                만들어질 폴더: <b>{siteFolderLabel}</b>
                {field ? ` (상위: ${field.name})` : ""}
              </span>
            </div>
            {missing.length ? (
              <Notice tone="warning">{missing.length}장을 열린 사진에서 찾지 못했습니다. 사진 폴더를 열어 주세요.</Notice>
            ) : null}
            <PhotoSourceBar state={photosState} />
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={removeGps} onChange={(e) => setRemoveGps(e.target.checked)} />
              위치정보(GPS) 지우고 넣기
            </label>
            <button
              type="button"
              className={`${btnPrimary} w-full py-3 text-base`}
              disabled={busy || !supported}
              onClick={() => void organize()}
            >
              {busy ? "사진 모으는 중…" : "블로그용 사진 폴더 만들기"}
            </button>
            {upload.length ? (
              <div className="grid grid-cols-4 gap-2">
                {upload.slice(0, 4).map((u) => (
                  <PhotoThumb key={u.fileName} photo={u.photo} className="aspect-square w-full rounded-md" />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </StepCard>

      <StepCard n={2} title="글 복사하기" done={doneCopy} active={step2Active} nextHint="지금 할 일">
        <div className="space-y-3">
          {doneCopy ? (
            <p className="text-sm text-emerald-800">✓ 복사됨. 네이버에서 Ctrl+V 로 붙여 넣으세요. 아래에서 다시 고를 수 있습니다.</p>
          ) : (
            <p className="text-sm text-slate-600">
              <b>제목</b>은 네이버 제목란에, <b>본문</b>은 본문란에 붙여 넣으세요. (글자만 복사됩니다)
            </p>
          )}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`${btnPrimary} py-3 text-base`}
              onClick={() => void copy(title, "제목을")}
            >
              제목만 복사
            </button>
            <button
              type="button"
              className={`${btnPrimary} py-3 text-base`}
              onClick={() => void copy(copyText(blocks), "본문을")}
            >
              본문만 복사
            </button>
          </div>
        </div>
      </StepCard>

      <StepCard n={3} title="네이버에 붙여 넣고 꾸미기" done={status === "DONE"} active={step3Active} nextHint="지금 할 일">
        <ol className="mb-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
          <li>
            네이버 블로그에서 <b>새 글</b>을 엽니다.
          </li>
          <li>
            <b>제목만 복사</b> → 제목란에 붙여넣기 → <b>본문만 복사</b> → 본문에 붙여넣기
          </li>
          <li>
            꾸미고 싶으면 오른쪽 미리보기를 보고 네이버에서 따라 하세요. (안 꾸며도 됩니다)
          </li>
          <li>
            탐색기 <b>{siteFolderLabel} → 블로그업로드</b> 사진을 끌어다 놓으세요.
          </li>
        </ol>
        <a
          href="https://blog.naver.com"
          target="_blank"
          rel="noreferrer"
          className={`${btnSecondary} mb-3 inline-flex`}
        >
          네이버 블로그 열기 ↗
        </a>
        <button
          type="button"
          className="mb-3 block text-xs text-slate-500 underline"
          onClick={() => setShowHelp((v) => !v)}
        >
          {showHelp ? "도움말 접기" : "사진이 안 보일 때"}
        </button>
        {showHelp ? (
          <div className="mb-4 space-y-1 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p>1단계에서 사진 폴더를 다시 연 뒤 「사진 다시 정리하기」를 누르세요.</p>
            <p>PC 크롬을 권장합니다. 원드라이브에만 있는 사진은 건너뛸 수 있습니다.</p>
          </div>
        ) : null}
        <button
          type="button"
          className={status === "DONE" ? btnSecondary : `${btnPrimary} w-full py-4 text-lg`}
          onClick={markDone}
        >
          {status === "DONE" ? "완료 취소" : "다 옮겼어요 · 완료"}
        </button>
      </StepCard>
      </div>

      <div className="space-y-2 lg:self-start">
        <p className="text-sm font-semibold text-slate-800">미리보기</p>
        <p className="text-xs text-slate-500">끝까지 내려보면 아래에 완료 버튼이 있습니다.</p>
        <div className="max-h-[calc(100vh-5rem)] overflow-y-auto rounded-xl border border-slate-200">
          <NaverPreview
            title={title}
            blocks={blocks}
            images={images}
            businessName={businessName}
            layout={layout}
            onLayout={onLayout}
            showFollowHints
          />
          <div className="sticky bottom-0 space-y-3 border-t border-slate-200 bg-white p-4 shadow-[0_-8px_24px_rgba(0,0,0,0.06)]">
            <p className="text-sm font-semibold text-slate-900">미리보기를 다 보셨나요?</p>
            <p className="text-xs text-slate-600">네이버에 붙여 넣고 사진까지 넣었다면 완료를 눌러 주세요.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={btnSecondary} onClick={() => void copy(title, "제목을")}>
                제목만 복사
              </button>
              <button type="button" className={btnSecondary} onClick={() => void copy(copyText(blocks), "본문을")}>
                본문만 복사
              </button>
            </div>
            <button
              type="button"
              className={status === "DONE" ? btnSecondary : `${btnPrimary} w-full py-3.5 text-base`}
              onClick={markDone}
            >
              {status === "DONE" ? "완료 취소" : "다 옮겼어요 · 완료"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
