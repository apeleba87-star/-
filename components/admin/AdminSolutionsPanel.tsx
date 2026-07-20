"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PLACE_SPACE_ORDER,
  PRIMARY_PLACE_ORDER,
  SOLUTION_PARTS,
  SOLUTION_PLACES,
  SOLUTION_SPACES,
  getPartLabel,
  getPlaceLabel,
  getSpaceLabel,
  spaceIdsForUiSelection,
} from "@/lib/knowledge-hub/solutions/taxonomy";
import type {
  SolutionDetailBody,
  SolutionPage,
  SolutionRecommendProduct,
  SolutionStarRating,
} from "@/lib/knowledge-hub/solutions/types";
import { enrichPageFromSiblings } from "@/lib/knowledge-hub/solutions/solution-inherit";

type ProductOpt = { id: string; name: string; standardDilution?: string | null };

type ContaminantOpt = { id: string; name: string };
type MasterRow = {
  contaminantId: string;
  defaultProductIds: string[];
  baseGuide?: string;
  warnings?: string[];
};
type PageListItem = SolutionPage & {
  path: string;
  source: "seed" | "db";
};

type Props = {
  products: ProductOpt[];
  contaminants: ContaminantOpt[];
  masters: MasterRow[];
  seedPages: PageListItem[];
  dbPages: PageListItem[];
};

function linesToList(text: string): string[] {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

function listToLines(list?: string[]): string {
  return (list ?? []).join("\n");
}

function productDilution(products: ProductOpt[], productId: string): string | undefined {
  const d = products.find((p) => p.id === productId)?.standardDilution?.trim();
  return d || undefined;
}

function recommendationsFromMaster(
  masterProductIds: string[],
  products: ProductOpt[],
  prev: SolutionRecommendProduct[]
): SolutionRecommendProduct[] {
  return masterProductIds.map((pid) => {
    const existing = prev.find((r) => r.productId === pid);
    const name = products.find((p) => p.id === pid)?.name ?? pid;
    const fromCatalog = productDilution(products, pid);
    return {
      productId: pid,
      label: existing?.label || name,
      rating: existing?.rating ?? (3 as SolutionStarRating),
      dilution: existing?.dilution?.trim() || fromCatalog,
    };
  });
}

export default function AdminSolutionsPanel({
  products,
  contaminants,
  masters: mastersProp,
  seedPages,
  dbPages,
}: Props) {
  const router = useRouter();
  const productName = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of products) m.set(p.id, p.name);
    return m;
  }, [products]);

  const [localMasters, setLocalMasters] = useState(mastersProp);
  const [localDbPages, setLocalDbPages] = useState(dbPages);
  useEffect(() => setLocalMasters(mastersProp), [mastersProp]);
  useEffect(() => setLocalDbPages(dbPages), [dbPages]);
  const masterMap = useMemo(() => {
    const m = new Map<string, MasterRow>();
    for (const row of localMasters) m.set(row.contaminantId, row);
    return m;
  }, [localMasters]);

  const [contaminantId, setContaminantId] = useState(contaminants[0]?.id ?? "");
  const current = masterMap.get(contaminantId);
  const [productIds, setProductIds] = useState<string[]>(current?.defaultProductIds ?? []);
  const [baseGuide, setBaseGuide] = useState(current?.baseGuide ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function loadContaminant(id: string) {
    setContaminantId(id);
    const m = masterMap.get(id);
    setProductIds(m?.defaultProductIds ?? []);
    setBaseGuide(m?.baseGuide ?? "");
    setMsg(null);
  }

  function toggleProduct(id: string) {
    setProductIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function patchLocalMaster(contamId: string, nextProductIds: string[]) {
    setLocalMasters((prev) => {
      const idx = prev.findIndex((m) => m.contaminantId === contamId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], defaultProductIds: nextProductIds };
        return copy;
      }
      return [
        ...prev,
        {
          contaminantId: contamId,
          defaultProductIds: nextProductIds,
          baseGuide: "",
          warnings: [],
        },
      ];
    });
    if (contamId === contaminantId) setProductIds(nextProductIds);
  }

  async function saveMaster() {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/solutions/contaminant-master", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contaminantId,
          productIds,
          baseGuide: baseGuide || null,
          warnings: current?.warnings ?? [],
        }),
      });
      const json = (await res.json()) as { ok: boolean; error?: string };
      if (json.ok) {
        patchLocalMaster(contaminantId, productIds);
        setMsg("오염 마스터 저장됨");
      } else {
        setMsg(json.error || "저장 실패");
      }
    } catch {
      setMsg("저장 중 오류");
    } finally {
      setBusy(false);
    }
  }

  const [screen, setScreen] = useState<"list" | "form">("list");
  const [listBrowse, setListBrowse] = useState<"place" | "space" | "pages">("place");
  const [filterPlaceId, setFilterPlaceId] = useState("");
  const [filterSpaceId, setFilterSpaceId] = useState("");
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [placeId, setPlaceId] = useState("home");
  const [spaceId, setSpaceId] = useState("restroom");
  const [partId, setPartId] = useState("toilet");
  const [pageContaminantId, setPageContaminantId] = useState(contaminants[0]?.id ?? "");
  const [slug, setSlug] = useState("");
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState<"draft" | "published">("draft");

  const [summary, setSummary] = useState("");
  const [difficulty, setDifficulty] = useState<SolutionStarRating | "">("");
  const [locationsText, setLocationsText] = useState("");
  const [methodText, setMethodText] = useState("");
  const [cautionsText, setCautionsText] = useState("");
  const [ifFailsText, setIfFailsText] = useState("");
  const [recommendations, setRecommendations] = useState<SolutionRecommendProduct[]>([]);
  const [customLabel, setCustomLabel] = useState("");
  const [customRating, setCustomRating] = useState<SolutionStarRating>(2);
  const [pickProductId, setPickProductId] = useState("");
  const [pickRating, setPickRating] = useState<SolutionStarRating>(3);
  const [syncMasterOnSave, setSyncMasterOnSave] = useState(true);

  const usedProductIds = useMemo(
    () => new Set(recommendations.map((r) => r.productId).filter((x): x is string => Boolean(x))),
    [recommendations]
  );
  const availableProducts = useMemo(
    () => products.filter((p) => !usedProductIds.has(p.id)),
    [products, usedProductIds]
  );

  function pullMasterProducts(contamId: string, keep: SolutionRecommendProduct[] = recommendations) {
    const master = masterMap.get(contamId);
    const ids = master?.defaultProductIds ?? [];
    const fromMaster = recommendationsFromMaster(ids, products, keep);
    const extras = keep.filter((r) => !r.productId);
    setRecommendations([...fromMaster, ...extras]);
  }

  function goToList() {
    setScreen("list");
  }

  function startCreate() {
    setEditingId(null);
    setPlaceId("home");
    setSpaceId("restroom");
    setPartId("toilet");
    const firstContam = contaminants[0]?.id ?? "";
    setPageContaminantId(firstContam);
    setSlug("");
    setTitle("");
    setStatus("draft");
    setSummary("");
    setDifficulty("");
    setLocationsText("");
    setMethodText("");
    setCautionsText("");
    setIfFailsText("");
    setCustomLabel("");
    setPickProductId("");
    setPickRating(3);
    setSyncMasterOnSave(true);
    setMsg(null);
    pullMasterProducts(firstContam, []);
    setScreen("form");
  }

  function startEdit(page: PageListItem) {
    const pool = (() => {
      const archivedIds = new Set(
        localDbPages.filter((p) => p.status === "archived").map((p) => p.id)
      );
      const map = new Map<string, PageListItem>();
      for (const p of seedPages) {
        if (archivedIds.has(p.id)) continue;
        map.set(p.id, p);
      }
      for (const p of localDbPages) {
        if (p.status === "archived") continue;
        map.set(p.id, { ...p, source: "db" });
      }
      return [...map.values()];
    })();
    const enriched = enrichPageFromSiblings(page, pool);

    setEditingId(page.id);
    setPlaceId(page.placeId);
    setSpaceId(page.spaceId);
    setPartId(page.partId);
    setPageContaminantId(page.contaminantId);
    setSlug(page.slug === page.contaminantId ? "" : page.slug);
    setTitle(page.title);
    setStatus(page.status === "published" ? "published" : "draft");

    const d = enriched.detail;
    setSummary(d?.summary ?? page.placeContext ?? "");
    setDifficulty(d?.difficulty ?? "");
    setLocationsText(listToLines(d?.locations));
    setMethodText(listToLines(d?.methodSteps));
    setCautionsText(listToLines(d?.cautions));
    setIfFailsText(listToLines(d?.ifFails));

    const masterIds =
      masterMap.get(page.contaminantId)?.defaultProductIds ??
      enriched.productIds ??
      page.productIds ??
      [];
    const prev = d?.recommendations ?? [];
    if (prev.length) {
      setRecommendations(prev);
    } else {
      setRecommendations(recommendationsFromMaster(masterIds, products, []));
    }
    setPickProductId("");
    setPickRating(3);
    setSyncMasterOnSave(false);
    setMsg(
      enriched.inheritedFromPlaceId
        ? `${getPlaceLabel(enriched.inheritedFromPlaceId)} 동일 부위·오염 내용을 불러왔습니다. 저장하면 이 장소에 따로 저장됩니다.`
        : null
    );
    setScreen("form");
  }

  function onPageContaminantChange(id: string) {
    setPageContaminantId(id);
    pullMasterProducts(id);
  }

  function setRating(index: number, rating: SolutionStarRating) {
    setRecommendations((prev) => prev.map((r, i) => (i === index ? { ...r, rating } : r)));
  }

  function setDilution(index: number, dilution: string) {
    setRecommendations((prev) =>
      prev.map((r, i) => (i === index ? { ...r, dilution: dilution.trim() || undefined } : r))
    );
  }

  function moveRec(index: number, dir: -1 | 1) {
    setRecommendations((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }

  function removeRec(index: number) {
    setRecommendations((prev) => prev.filter((_, i) => i !== index));
  }

  function addCatalogProduct() {
    if (!pickProductId) return;
    if (usedProductIds.has(pickProductId)) {
      setMsg("이미 추가된 제품입니다.");
      return;
    }
    const name = productName.get(pickProductId) ?? pickProductId;
    setRecommendations((prev) => [
      ...prev,
      {
        productId: pickProductId,
        label: name,
        rating: pickRating,
        dilution: productDilution(products, pickProductId),
      },
    ]);
    setPickProductId("");
    setMsg(null);
  }

  function addCustomRec() {
    const label = customLabel.trim();
    if (!label) return;
    setRecommendations((prev) => [...prev, { label, rating: customRating }]);
    setCustomLabel("");
  }

  function buildDetail(): SolutionDetailBody | undefined {
    const detail: SolutionDetailBody = {
      summary: summary.trim() || undefined,
      difficulty: difficulty || undefined,
      locations: linesToList(locationsText),
      methodSteps: linesToList(methodText),
      cautions: linesToList(cautionsText),
      ifFails: linesToList(ifFailsText),
      recommendations: recommendations.length ? recommendations : undefined,
    };
    if (
      !detail.summary &&
      !detail.difficulty &&
      !detail.locations?.length &&
      !detail.methodSteps?.length &&
      !detail.cautions?.length &&
      !detail.ifFails?.length &&
      !detail.recommendations?.length
    ) {
      return undefined;
    }
    return detail;
  }

  async function savePage() {
    setBusy(true);
    setMsg(null);
    try {
      const detail = buildDetail();
      const productIdsOrdered = recommendations
        .map((r) => r.productId)
        .filter((x): x is string => Boolean(x));
      const resolvedSlug = (slug.trim() || pageContaminantId).replace(/[^a-z0-9-_]/gi, "-");
      const res = await fetch("/api/admin/solutions/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingId || undefined,
          placeId,
          spaceId,
          partId,
          contaminantId: pageContaminantId,
          slug: slug || undefined,
          title,
          placeContext: summary.trim() || undefined,
          status,
          productIds: productIdsOrdered.length ? productIdsOrdered : undefined,
          detail,
        }),
      });
      const raw = await res.text();
      let json: { ok: boolean; error?: string; path?: string; id?: string };
      try {
        json = JSON.parse(raw) as { ok: boolean; error?: string; path?: string; id?: string };
      } catch {
        setMsg(`저장 실패 (서버 ${res.status}). 로그인·권한·DB 연결을 확인해 주세요.`);
        return;
      }
      if (!json.ok) {
        setMsg(json.error || `저장 실패 (${res.status})`);
        return;
      }

      const savedId = json.id ?? editingId;
      if (savedId) setEditingId(savedId);

      const path =
        json.path ?? `/solutions/${placeId}/${spaceId}/${partId}/${resolvedSlug}`;
      if (savedId) {
        const saved: PageListItem = {
          id: savedId,
          placeId: placeId as PageListItem["placeId"],
          spaceId: spaceId as PageListItem["spaceId"],
          partId: partId as PageListItem["partId"],
          contaminantId: pageContaminantId,
          slug: resolvedSlug,
          title: title.trim(),
          placeContext: summary.trim() || undefined,
          productIds: productIdsOrdered.length ? productIdsOrdered : undefined,
          detail,
          status,
          path,
          source: "db",
        };
        setLocalDbPages((prev) => {
          const idx = prev.findIndex((p) => p.id === savedId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved];
        });
      }

      let masterNote = "";
      if (syncMasterOnSave) {
        const master = masterMap.get(pageContaminantId);
        const masterRes = await fetch("/api/admin/solutions/contaminant-master", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contaminantId: pageContaminantId,
            productIds: productIdsOrdered,
            baseGuide: master?.baseGuide ?? null,
            warnings: master?.warnings ?? [],
          }),
        });
        const masterRaw = await masterRes.text();
        let masterJson: { ok: boolean; error?: string };
        try {
          masterJson = JSON.parse(masterRaw) as { ok: boolean; error?: string };
        } catch {
          masterJson = { ok: false, error: `서버 ${masterRes.status}` };
        }
        if (masterJson.ok) {
          patchLocalMaster(pageContaminantId, productIdsOrdered);
          masterNote = " · 오염 마스터도 반영됨";
        } else {
          masterNote = ` · 마스터 반영 실패: ${masterJson.error ?? "오류"}`;
        }
      }

      const publishNote =
        status === "published"
          ? " · 공개 페이지에 반영됩니다"
          : " · draft라서 공개에는 시드/기존 공개본이 그대로입니다 (공개하려면 published)";
      setMsg(`저장됨 ${path}${masterNote}${publishNote}`);
      router.refresh();
      setScreen("list");
    } catch {
      setMsg("저장 중 오류");
    } finally {
      setBusy(false);
    }
  }

  const allListed = useMemo(() => {
    const archivedIds = new Set(
      localDbPages.filter((p) => p.status === "archived").map((p) => p.id)
    );
    const map = new Map<string, PageListItem>();
    for (const p of seedPages) {
      if (archivedIds.has(p.id)) continue;
      map.set(p.id, p);
    }
    for (const p of localDbPages) {
      if (p.status === "archived") continue;
      map.set(p.id, { ...p, source: "db" });
    }
    return [...map.values()].sort((a, b) => a.title.localeCompare(b.title, "ko"));
  }, [seedPages, localDbPages]);

  const placeBuckets = useMemo(() => {
    const count = new Map<string, number>();
    for (const p of allListed) {
      count.set(p.placeId, (count.get(p.placeId) ?? 0) + 1);
    }
    return PRIMARY_PLACE_ORDER.map((id) => ({
      id,
      label: getPlaceLabel(id),
      n: count.get(id) ?? 0,
    })).filter((p) => p.n > 0);
  }, [allListed]);

  const spaceBuckets = useMemo(() => {
    if (!filterPlaceId) return [];
    const bySpace = new Map<string, number>();
    for (const p of allListed) {
      if (p.placeId !== filterPlaceId) continue;
      bySpace.set(p.spaceId, (bySpace.get(p.spaceId) ?? 0) + 1);
    }
    const order = PLACE_SPACE_ORDER[filterPlaceId as keyof typeof PLACE_SPACE_ORDER] ?? [];
    const seen = new Set<string>();
    const out: { id: string; label: string; matchIds: string[]; n: number }[] = [];
    for (const id of order) {
      const matchIds = spaceIdsForUiSelection(filterPlaceId, id);
      const n = matchIds.reduce((sum, sid) => sum + (bySpace.get(sid) ?? 0), 0);
      if (!n) continue;
      out.push({ id, label: getSpaceLabel(id, filterPlaceId), matchIds, n });
      matchIds.forEach((sid) => seen.add(sid));
    }
    for (const [sid, n] of bySpace) {
      if (seen.has(sid)) continue;
      out.push({ id: sid, label: getSpaceLabel(sid, filterPlaceId), matchIds: [sid], n });
    }
    return out;
  }, [allListed, filterPlaceId]);

  const filteredPages = useMemo(() => {
    if (!filterPlaceId || !filterSpaceId) return [];
    const space = spaceBuckets.find((s) => s.id === filterSpaceId);
    const matchIds = space?.matchIds ?? [filterSpaceId];
    return allListed.filter(
      (p) => p.placeId === filterPlaceId && matchIds.includes(p.spaceId)
    );
  }, [allListed, filterPlaceId, filterSpaceId, spaceBuckets]);

  async function saveTitleInline(page: PageListItem, nextTitle: string) {
    const next = nextTitle.trim();
    if (!next || next === page.title) {
      setEditingTitleId(null);
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/solutions/pages", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: page.id,
          placeId: page.placeId,
          spaceId: page.spaceId,
          partId: page.partId,
          contaminantId: page.contaminantId,
          slug: page.slug,
          title: next,
          placeContext: page.placeContext,
          status: page.status === "published" ? "published" : "draft",
          productIds: page.productIds,
          detail: page.detail,
          materialId: page.materialId,
          materialContaminantId: page.materialContaminantId,
          description: page.description,
        }),
      });
      const raw = await res.text();
      let json: { ok: boolean; error?: string };
      try {
        json = JSON.parse(raw) as { ok: boolean; error?: string };
      } catch {
        setMsg(`제목 저장 실패 (서버 ${res.status})`);
        return;
      }
      if (!json.ok) {
        setMsg(json.error || "제목 저장 실패");
        return;
      }
      setLocalDbPages((prev) => {
        const row: PageListItem = {
          ...page,
          title: next,
          source: "db",
          status: page.status === "published" ? "published" : "draft",
        };
        const idx = prev.findIndex((x) => x.id === page.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = row;
          return copy;
        }
        return [...prev, row];
      });
      setMsg("제목 저장됨");
      setEditingTitleId(null);
      router.refresh();
    } catch {
      setMsg("제목 저장 중 오류");
    } finally {
      setBusy(false);
    }
  }

  async function deletePage(page: PageListItem) {
    if (!window.confirm(`「${page.title}」을(를) 삭제할까요?\n공개·목록에서 숨겨집니다.`)) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/solutions/pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: page.id,
          placeId: page.placeId,
          spaceId: page.spaceId,
          partId: page.partId,
          contaminantId: page.contaminantId,
          slug: page.slug,
          title: page.title,
          placeContext: page.placeContext,
          productIds: page.productIds,
          detail: page.detail,
          materialId: page.materialId,
          materialContaminantId: page.materialContaminantId,
          description: page.description,
          status: page.status,
        }),
      });
      const raw = await res.text();
      let json: { ok: boolean; error?: string };
      try {
        json = JSON.parse(raw) as { ok: boolean; error?: string };
      } catch {
        setMsg(`삭제 실패 (서버 ${res.status})`);
        return;
      }
      if (!json.ok) {
        setMsg(json.error || "삭제 실패");
        return;
      }
      setLocalDbPages((prev) => {
        const archived: PageListItem = { ...page, status: "archived", source: "db" };
        const idx = prev.findIndex((x) => x.id === page.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = archived;
          return copy;
        }
        return [...prev, archived];
      });
      setMsg("삭제됨 (목록·공개에서 숨김)");
      router.refresh();
    } catch {
      setMsg("삭제 중 오류");
    } finally {
      setBusy(false);
    }
  }

  if (screen === "list") {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-black text-slate-900">검색어 솔루션</h1>
          <p className="mt-1 text-sm text-slate-600">
            장소 → 공간으로 좁힌 뒤 제목을 바로 수정하거나 상세 편집합니다.{" "}
            <Link href="/solutions" className="font-semibold text-teal-800 hover:underline">
              공개 허브
            </Link>
            {" · "}
            <Link href="/admin/knowledge-hub" className="font-semibold text-slate-600 hover:underline">
              지식 허브 (마스터·판매)
            </Link>
          </p>
          {msg ? <p className="mt-2 text-sm font-medium text-teal-800">{msg}</p> : null}
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-black text-slate-900">
              검색어 페이지
              <span className="ml-2 text-sm font-bold text-slate-500">({allListed.length})</span>
            </h2>
            <button
              type="button"
              onClick={startCreate}
              className="rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white"
            >
              새로 만들기
            </button>
          </div>

          {listBrowse !== "place" ? (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className="text-sm font-bold text-teal-800 hover:underline"
                onClick={() => {
                  if (listBrowse === "pages") {
                    setListBrowse("space");
                    setFilterSpaceId("");
                  } else {
                    setListBrowse("place");
                    setFilterPlaceId("");
                    setFilterSpaceId("");
                  }
                }}
              >
                ← 뒤로
              </button>
              <p className="text-sm text-slate-500">
                {[
                  filterPlaceId ? getPlaceLabel(filterPlaceId) : null,
                  filterSpaceId ? getSpaceLabel(filterSpaceId, filterPlaceId) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
          ) : null}

          {listBrowse === "place" ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {placeBuckets.map((pl) => (
                <li key={pl.id} className="py-2 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-2 py-3 text-left hover:bg-slate-50"
                    onClick={() => {
                      setFilterPlaceId(pl.id);
                      setFilterSpaceId("");
                      setListBrowse("space");
                    }}
                  >
                    <span className="font-bold text-slate-950">{pl.label}</span>
                    <span className="text-sm font-bold text-slate-500">{pl.n}개 →</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {listBrowse === "space" ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {spaceBuckets.map((sp) => (
                <li key={sp.id} className="py-2 first:pt-0 last:pb-0">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between rounded-xl px-2 py-3 text-left hover:bg-slate-50"
                    onClick={() => {
                      setFilterSpaceId(sp.id);
                      setListBrowse("pages");
                    }}
                  >
                    <span className="font-bold text-slate-950">{sp.label}</span>
                    <span className="text-sm font-bold text-slate-500">{sp.n}개 →</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          {listBrowse === "pages" ? (
            <ul className="mt-4 divide-y divide-slate-100">
              {filteredPages.map((p) => (
                <li
                  key={`${p.source}-${p.id}`}
                  className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0 flex-1">
                    {editingTitleId === p.id ? (
                      <input
                        autoFocus
                        className="w-full rounded-lg border border-teal-600 px-2 py-1.5 text-sm font-bold text-slate-950 outline-none ring-2 ring-teal-800/20"
                        value={titleDraft}
                        disabled={busy}
                        onChange={(e) => setTitleDraft(e.target.value)}
                        onBlur={() => void saveTitleInline(p, titleDraft)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void saveTitleInline(p, titleDraft);
                          }
                          if (e.key === "Escape") setEditingTitleId(null);
                        }}
                      />
                    ) : (
                      <button
                        type="button"
                        className="w-full text-left font-bold text-slate-950 hover:text-teal-800"
                        title="클릭하여 제목 수정"
                        onClick={() => {
                          setEditingTitleId(p.id);
                          setTitleDraft(p.title);
                        }}
                      >
                        {p.title}
                      </button>
                    )}
                    <p className="mt-0.5 text-xs text-slate-500">
                      {p.source === "db" ? "DB" : "시드"} · {p.status}
                      {p.detail ? " · 상세있음" : ""}
                      {" · "}
                      {getPartLabel(p.partId, p.spaceId)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(p)}
                    className="rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-bold text-slate-900 hover:border-teal-700 hover:text-teal-800"
                  >
                    편집하기
                  </button>
                  {p.status === "published" ? (
                    <Link
                      href={p.path}
                      className="rounded-xl px-2 py-2 text-sm font-bold text-slate-500 hover:text-teal-800"
                    >
                      보기
                    </Link>
                  ) : null}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void deletePage(p)}
                    className="rounded-xl px-2 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    삭제
                  </button>
                </li>
              ))}
              {!filteredPages.length ? (
                <li className="py-6 text-center text-sm text-slate-500">페이지가 없습니다.</li>
              ) : null}
            </ul>
          ) : null}
        </section>

        <details className="rounded-xl border border-slate-200 bg-white p-5">
          <summary className="cursor-pointer text-base font-black text-slate-900">
            오염 마스터 · 제품 선택
          </summary>
          <p className="mt-2 text-sm text-slate-500">
            「이 세제를 써보세요」에 쓸 제품을 오염별로 연결합니다.
          </p>
          <label className="mt-4 block text-sm font-bold text-slate-600">오염</label>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={contaminantId}
            onChange={(e) => loadContaminant(e.target.value)}
          >
            {contaminants.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.id})
              </option>
            ))}
          </select>
          <label className="mt-4 block text-sm font-bold text-slate-600">기본 안내</label>
          <textarea
            className="mt-1 min-h-[100px] w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
            value={baseGuide}
            onChange={(e) => setBaseGuide(e.target.value)}
          />
          <p className="mt-4 text-sm font-bold text-slate-600">제품 마스터</p>
          <ul className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-slate-100 p-3">
            {products.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={productIds.includes(p.id)}
                    onChange={() => toggleProduct(p.id)}
                  />
                  <span>{p.name}</span>
                </label>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled={busy}
            onClick={saveMaster}
            className="mt-4 rounded-xl bg-teal-800 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            오염 마스터 저장
          </button>
        </details>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <button
          type="button"
          onClick={goToList}
          className="text-sm font-bold text-teal-800 hover:underline"
        >
          ← 목록으로
        </button>
        <h1 className="mt-2 text-2xl font-black text-slate-900">
          {editingId ? "페이지 편집" : "새로 만들기"}
        </h1>
        {msg ? <p className="mt-2 text-sm font-medium text-teal-800">{msg}</p> : null}
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">
          제품은 카탈로그에서 추가하거나 마스터에서 불러온 뒤 별점·순서를 지정합니다. published면 공개됩니다.
        </p>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="font-bold text-slate-600">장소</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={placeId}
              onChange={(e) => setPlaceId(e.target.value)}
            >
              {SOLUTION_PLACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-bold text-slate-600">공간</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={spaceId}
              onChange={(e) => setSpaceId(e.target.value)}
            >
              {SOLUTION_SPACES.map((p) => (
                <option key={p.id} value={p.id}>
                  {getSpaceLabel(p.id, placeId)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-bold text-slate-600">부위</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={partId}
              onChange={(e) => setPartId(e.target.value)}
            >
              {SOLUTION_PARTS.map((p) => (
                <option key={p.id} value={p.id}>
                  {getPartLabel(p.id, spaceId)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="font-bold text-slate-600">오염</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
              value={pageContaminantId}
              onChange={(e) => onPageContaminantChange(e.target.value)}
            >
              {contaminants.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="mt-3 block text-sm">
          <span className="font-bold text-slate-600">검색어 제목 (H1)</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 가정집 화장실 변기 요석 제거"
          />
        </label>
        <label className="mt-3 block text-sm">
          <span className="font-bold text-slate-600">URL slug (비우면 오염 ID)</span>
          <input
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="limescale"
          />
        </label>

        <div className="mt-6 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <p className="text-sm font-black text-orange-700">한줄로 보면</p>
          <textarea
            className="mt-2 min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
          />
        </div>

        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <p className="text-sm font-black text-orange-700">이런 오염이에요</p>
          <label className="mt-2 block text-sm">
            <span className="font-bold text-slate-600">난이도 (별점)</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5"
              value={difficulty}
              onChange={(e) =>
                setDifficulty(e.target.value ? (Number(e.target.value) as SolutionStarRating) : "")
              }
            >
              <option value="">선택 안 함</option>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {"★".repeat(n)} ({n}/5)
                </option>
              ))}
            </select>
          </label>
          <label className="mt-3 block text-sm">
            <span className="font-bold text-slate-600">잘 생기는 곳 (줄마다 하나)</span>
            <textarea
              className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
              value={locationsText}
              onChange={(e) => setLocationsText(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-black text-orange-700">이 세제를 써보세요</p>
            <button
              type="button"
              onClick={() => pullMasterProducts(pageContaminantId)}
              className="text-xs font-bold text-teal-800 hover:underline"
            >
              마스터 제품 다시 불러오기
            </button>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            제품 카탈로그에서 골라 추가하거나 마스터를 불러오면 표준 희석이 함께 채워집니다. 별점·희석·순서를
            조정하세요.
          </p>
          <ul className="mt-3 space-y-2">
            {recommendations.map((r, i) => (
              <li
                key={`${r.productId ?? r.label}-${i}`}
                className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2"
              >
                <span className="min-w-0 flex-1 text-sm font-bold text-slate-900">
                  {r.label}
                  {r.productId ? (
                    <span className="ml-1 text-xs font-medium text-slate-400">
                      ({productName.get(r.productId) ?? r.productId})
                    </span>
                  ) : (
                    <span className="ml-1 text-xs font-medium text-slate-400">(직접 추가)</span>
                  )}
                </span>
                <label className="text-xs font-bold text-slate-500">
                  희석
                  <input
                    type="text"
                    className="ml-1 w-[7.5rem] rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-medium text-slate-900"
                    value={r.dilution ?? ""}
                    onChange={(e) => setDilution(i, e.target.value)}
                    placeholder="예: 1:100"
                  />
                </label>
                <select
                  className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
                  value={r.rating}
                  onChange={(e) => setRating(i, Number(e.target.value) as SolutionStarRating)}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {"★".repeat(n)} {n}
                    </option>
                  ))}
                </select>
                <button type="button" className="text-xs font-bold text-slate-500" onClick={() => moveRec(i, -1)}>
                  ↑
                </button>
                <button type="button" className="text-xs font-bold text-slate-500" onClick={() => moveRec(i, 1)}>
                  ↓
                </button>
                <button type="button" className="text-xs font-bold text-red-600" onClick={() => removeRec(i)}>
                  삭제
                </button>
              </li>
            ))}
            {!recommendations.length ? (
              <li className="text-sm text-slate-500">추가된 제품이 없습니다. 아래에서 골라 주세요.</li>
            ) : null}
          </ul>

          <div className="mt-3 flex flex-wrap items-end gap-2 rounded-xl border border-teal-200 bg-white/80 p-3">
            <label className="min-w-[12rem] flex-1 text-sm">
              <span className="font-bold text-slate-600">마스터 제품 추가</span>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={pickProductId}
                onChange={(e) => setPickProductId(e.target.value)}
              >
                <option value="">제품 선택…</option>
                {availableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="font-bold text-slate-600">별점</span>
              <select
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={pickRating}
                onChange={(e) => setPickRating(Number(e.target.value) as SolutionStarRating)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addCatalogProduct}
              disabled={!pickProductId}
              className="rounded-xl bg-teal-800 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
            >
              제품 추가
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-end gap-2">
            <label className="min-w-[10rem] flex-1 text-sm">
              <span className="font-bold text-slate-600">직접 추가 (예: 구연산)</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </label>
            <label className="text-sm">
              <span className="font-bold text-slate-600">별점</span>
              <select
                className="mt-1 block rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                value={customRating}
                onChange={(e) => setCustomRating(Number(e.target.value) as SolutionStarRating)}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addCustomRec}
              className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-800"
            >
              추가
            </button>
          </div>

          <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={syncMasterOnSave}
              onChange={(e) => setSyncMasterOnSave(e.target.checked)}
            />
            <span>
              저장 시 <strong>오염 마스터에도 반영</strong>
              <span className="block text-xs text-slate-500">
                이 페이지 추천 제품(제품 ID 있는 항목) 순서로 같은 오염의 마스터를 갱신합니다.
              </span>
            </span>
          </label>
        </div>

        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <p className="text-sm font-black text-orange-700">이렇게 하세요 (줄마다 1단계)</p>
          <textarea
            className="mt-2 min-h-[120px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            value={methodText}
            onChange={(e) => setMethodText(e.target.value)}
          />
        </div>

        <div className="mt-4 rounded-xl border border-red-200 bg-red-50/50 p-4">
          <p className="text-sm font-black text-red-700">꼭 기억해 주세요 (줄마다 하나)</p>
          <textarea
            className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            value={cautionsText}
            onChange={(e) => setCautionsText(e.target.value)}
          />
        </div>

        <div className="mt-4 rounded-xl border border-orange-200 bg-orange-50/40 p-4">
          <p className="text-sm font-black text-orange-700">그래도 안 지워진다면? (줄마다 하나)</p>
          <textarea
            className="mt-2 min-h-[80px] w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"
            value={ifFailsText}
            onChange={(e) => setIfFailsText(e.target.value)}
          />
        </div>

        <label className="mt-4 block text-sm">
          <span className="font-bold text-slate-600">상태</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5"
            value={status}
            onChange={(e) => setStatus(e.target.value as "draft" | "published")}
          >
            <option value="draft">draft (비공개)</option>
            <option value="published">published (공개)</option>
          </select>
          {status === "draft" ? (
            <p className="mt-1.5 text-xs font-medium text-amber-800">
              draft로 저장하면 DB에는 들어가지만, 공개 URL에는 반영되지 않습니다. 사이트에 보이려면
              published로 저장하세요.
            </p>
          ) : null}
        </label>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={savePage}
            className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            저장
          </button>
          <button
            type="button"
            onClick={goToList}
            className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700"
          >
            취소
          </button>
        </div>
      </section>
    </div>
  );
}
