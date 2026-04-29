"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Tab = "settings" | "work" | "confirm" | "evidence";
type Client = { id: string; name: string };
type Site = { id: string; name: string; client_id: string };
type WorkSession = { id: string; site_id: string; work_date: string };
type Contract = { id: string; status: "draft" | "signed" | "cancelled"; source_pdf_file_id?: string | null };
type ChecklistItem = { id: string; title: string };
type ChecklistOption = { id: string; label: string };
type ChecklistTemplate = { id: string; name: string };
type OptionSet = { id: string; name: string };
type PhotoZone = { id: string; site_id: string; name: string; is_required: boolean; sort_order?: number };
type Confirmation = { id: string; work_session_id: string; opened_at: string | null; confirmed: boolean; confirmed_at: string | null };
type Report = { id: string; work_session_id: string; generated_at: string; generated_pdf_file_id: string | null };

const TAB_LABEL: Record<Tab, string> = {
  settings: "설정",
  work: "작업",
  confirm: "확인현황",
  evidence: "증거/PDF",
};

export default function CleanidexMvpDashboard() {
  const [tab, setTab] = useState<Tab>("settings");
  const [isDark, setIsDark] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [clients, setClients] = useState<Client[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [sessions, setSessions] = useState<WorkSession[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [optionSets, setOptionSets] = useState<OptionSet[]>([]);
  const [confirmations, setConfirmations] = useState<Confirmation[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [hasLoadedConfirmations, setHasLoadedConfirmations] = useState(false);
  const [hasLoadedReports, setHasLoadedReports] = useState(false);
  const [sessionHasMore, setSessionHasMore] = useState(false);
  const [confirmHasMore, setConfirmHasMore] = useState(false);
  const [reportHasMore, setReportHasMore] = useState(false);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [checklistOptions, setChecklistOptions] = useState<ChecklistOption[]>([]);
  const [checklistMap, setChecklistMap] = useState<Record<string, string>>({});
  const [photoZones, setPhotoZones] = useState<PhotoZone[]>([]);
  const [zoneEditorZones, setZoneEditorZones] = useState<PhotoZone[]>([]);
  const [editingZoneId, setEditingZoneId] = useState("");
  const [editingZoneName, setEditingZoneName] = useState("");

  const [clientName, setClientName] = useState("");
  const [siteClientId, setSiteClientId] = useState("");
  const [siteName, setSiteName] = useState("");
  const [contractClientId, setContractClientId] = useState("");
  const [contractSiteId, setContractSiteId] = useState("");
  const [contractPdfFile, setContractPdfFile] = useState<File | null>(null);
  const [signatureContractId, setSignatureContractId] = useState("");
  const [signatureType, setSignatureType] = useState<"company" | "client">("company");
  const [signRequestContractId, setSignRequestContractId] = useState("");
  const [signRequestRecipientName, setSignRequestRecipientName] = useState("");
  const [signRequestRecipientContact, setSignRequestRecipientContact] = useState("");
  const [latestSignRequestPath, setLatestSignRequestPath] = useState("");
  const [zoneSiteId, setZoneSiteId] = useState("");
  const [zoneName, setZoneName] = useState("");
  const [zoneBulkNames, setZoneBulkNames] = useState("");
  const [templateSiteId, setTemplateSiteId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [templatePreviewItems, setTemplatePreviewItems] = useState<ChecklistItem[]>([]);
  const [templatePreviewOptions, setTemplatePreviewOptions] = useState<ChecklistOption[]>([]);
  const [isTemplatePreviewLoading, setIsTemplatePreviewLoading] = useState(false);
  const [optionSetName, setOptionSetName] = useState("");
  const [newOptionSetId, setNewOptionSetId] = useState("");
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateOptionSetId, setNewTemplateOptionSetId] = useState("");
  const [itemTemplateId, setItemTemplateId] = useState("");
  const [itemTitle, setItemTitle] = useState("");
  const [versionSourceTemplateId, setVersionSourceTemplateId] = useState("");
  const [versionName, setVersionName] = useState("");
  const [quickTemplateName, setQuickTemplateName] = useState("");
  const [quickTemplateItems, setQuickTemplateItems] = useState("");
  const [quickTemplateSiteId, setQuickTemplateSiteId] = useState("");

  const [workSiteId, setWorkSiteId] = useState("");
  const [workDate, setWorkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [workSessionId, setWorkSessionId] = useState("");
  const [photoZoneId, setPhotoZoneId] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [confirmLinkPath, setConfirmLinkPath] = useState("");
  const [confirmFilter, setConfirmFilter] = useState<"all" | "opened_pending" | "confirmed">("all");

  const [reportSessionId, setReportSessionId] = useState("");
  const [reportFileId, setReportFileId] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem("cleanidex_theme");
    setIsDark(saved === "dark");
    void loadInitialData();
  }, []);

  async function loadInitialData() {
    const [clientsRes, sitesRes, sessionsRes, contractsRes, templatesRes, optionSetsRes] = await Promise.all([
      fetch("/api/cleanidex/clients"),
      fetch("/api/cleanidex/sites"),
      fetch("/api/cleanidex/work-sessions?limit=20&offset=0"),
      fetch("/api/cleanidex/contracts"),
      fetch("/api/cleanidex/checklist-template?mode=list"),
      fetch("/api/cleanidex/checklist-option-sets"),
    ]);
    const [clientsJson, sitesJson, sessionsJson, contractsJson, templatesJson, optionSetsJson] = await Promise.all([
      clientsRes.json(),
      sitesRes.json(),
      sessionsRes.json(),
      contractsRes.json(),
      templatesRes.json(),
      optionSetsRes.json(),
    ]);
    if (!clientsRes.ok) return setError(clientsJson.error ?? "load_failed");
    if (!sitesRes.ok) return setError(sitesJson.error ?? "load_failed");
    if (!sessionsRes.ok) return setError(sessionsJson.error ?? "load_failed");
    if (!contractsRes.ok) return setError(contractsJson.error ?? "load_failed");
    if (!templatesRes.ok) return setError(templatesJson.error ?? "load_failed");
    if (!optionSetsRes.ok) return setError(optionSetsJson.error ?? "load_failed");

    setClients(clientsJson.data ?? []);
    setSites(sitesJson.data ?? []);
    setSessions(sessionsJson.data ?? []);
    setSessionHasMore(Boolean(sessionsJson.pagination?.has_more));
    setContracts(contractsJson.data ?? []);
    setTemplates(templatesJson.data ?? []);
    setOptionSets(optionSetsJson.data ?? []);
  }

  async function loadClients() {
    const res = await fetch("/api/cleanidex/clients");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "clients_load_failed");
    setClients(json.data ?? []);
  }

  async function loadSites() {
    const res = await fetch("/api/cleanidex/sites");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "sites_load_failed");
    setSites(json.data ?? []);
  }

  async function loadSessions(opts?: { append?: boolean }) {
    const append = opts?.append ?? false;
    const offset = append ? sessions.length : 0;
    const params = new URLSearchParams({ limit: "20", offset: String(offset) });
    const res = await fetch(`/api/cleanidex/work-sessions?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "sessions_load_failed");
    const rows = (json.data ?? []) as WorkSession[];
    setSessions((prev) => (append ? [...prev, ...rows] : rows));
    setSessionHasMore(Boolean(json.pagination?.has_more));
  }

  async function loadContracts() {
    const res = await fetch("/api/cleanidex/contracts");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "contracts_load_failed");
    setContracts(json.data ?? []);
  }

  async function loadTemplates() {
    const res = await fetch("/api/cleanidex/checklist-template?mode=list");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "templates_load_failed");
    setTemplates(json.data ?? []);
  }

  async function loadOptionSets() {
    const res = await fetch("/api/cleanidex/checklist-option-sets");
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "option_sets_load_failed");
    setOptionSets(json.data ?? []);
  }

  async function loadConfirmations(opts?: { append?: boolean; filter?: "all" | "opened_pending" | "confirmed" }) {
    const append = opts?.append ?? false;
    const filter = opts?.filter ?? confirmFilter;
    const offset = append ? confirmations.length : 0;
    const params = new URLSearchParams({
      limit: "20",
      offset: String(offset),
      filter,
    });
    const res = await fetch(`/api/cleanidex/client-confirmations?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "confirmations_load_failed");
    const rows = (json.data ?? []) as Confirmation[];
    setConfirmations((prev) => (append ? [...prev, ...rows] : rows));
    setConfirmHasMore(Boolean(json.pagination?.has_more));
    setHasLoadedConfirmations(true);
  }

  async function loadReports(opts?: { append?: boolean }) {
    const append = opts?.append ?? false;
    const offset = append ? reports.length : 0;
    const params = new URLSearchParams({
      limit: "20",
      offset: String(offset),
    });
    const res = await fetch(`/api/cleanidex/reports?${params.toString()}`);
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "reports_load_failed");
    const rows = (json.data ?? []) as Report[];
    setReports((prev) => (append ? [...prev, ...rows] : rows));
    setReportHasMore(Boolean(json.pagination?.has_more));
    setHasLoadedReports(true);
  }

  const selectedSession = useMemo(() => sessions.find((s) => s.id === workSessionId) ?? null, [sessions, workSessionId]);
  const pagedConfirmations = useMemo(() => confirmations, [confirmations]);
  const pagedReports = useMemo(() => reports, [reports]);

  useEffect(() => {
    if (!zoneSiteId) {
      setZoneEditorZones([]);
      return;
    }
    void (async () => {
      const zonesRes = await fetch(`/api/cleanidex/photo-zones?site_id=${encodeURIComponent(zoneSiteId)}`);
      const zonesJson = await zonesRes.json();
      if (zonesRes.ok) setZoneEditorZones(zonesJson.data ?? []);
    })();
  }, [zoneSiteId]);

  useEffect(() => {
    if (tab === "confirm" && !hasLoadedConfirmations) {
      void loadConfirmations({ append: false, filter: confirmFilter }).catch((e) => setError(e instanceof Error ? e.message : "confirmations_load_failed"));
    }
    if (tab === "evidence" && !hasLoadedReports) {
      void loadReports({ append: false }).catch((e) => setError(e instanceof Error ? e.message : "reports_load_failed"));
    }
  }, [tab, hasLoadedConfirmations, hasLoadedReports]);

  useEffect(() => {
    if (tab !== "confirm") return;
    void loadConfirmations({ append: false, filter: confirmFilter }).catch((e) => setError(e instanceof Error ? e.message : "confirmations_load_failed"));
  }, [confirmFilter]);

  useEffect(() => {
    if (!selectedSession) return;
    void (async () => {
      const [templateRes, responsesRes, zonesRes] = await Promise.all([
        fetch(`/api/cleanidex/checklist-template?site_id=${encodeURIComponent(selectedSession.site_id)}`),
        fetch(`/api/cleanidex/checklist-responses?work_session_id=${encodeURIComponent(selectedSession.id)}`),
        fetch(`/api/cleanidex/photo-zones?site_id=${encodeURIComponent(selectedSession.site_id)}`),
      ]);
      const [templateJson, responsesJson, zonesJson] = await Promise.all([templateRes.json(), responsesRes.json(), zonesRes.json()]);
      if (templateRes.ok && templateJson.data) {
        setChecklistItems(templateJson.data.items ?? []);
        setChecklistOptions(templateJson.data.options ?? []);
      }
      if (responsesRes.ok) {
        const map: Record<string, string> = {};
        for (const row of responsesJson.data ?? []) map[row.checklist_item_id] = row.selected_option_id;
        setChecklistMap(map);
      }
      if (zonesRes.ok) setPhotoZones(zonesJson.data ?? []);
    })();
  }, [selectedSession]);

  useEffect(() => {
    if (!templateId) {
      setTemplatePreviewItems([]);
      setTemplatePreviewOptions([]);
      setIsTemplatePreviewLoading(false);
      return;
    }
    void (async () => {
      setIsTemplatePreviewLoading(true);
      const res = await fetch(`/api/cleanidex/checklist-template?template_id=${encodeURIComponent(templateId)}`);
      const json = await res.json();
      if (res.ok && json.data) {
        setTemplatePreviewItems(json.data.items ?? []);
        setTemplatePreviewOptions(json.data.options ?? []);
      } else {
        setTemplatePreviewItems([]);
        setTemplatePreviewOptions([]);
      }
      setIsTemplatePreviewLoading(false);
    })();
  }, [templateId]);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    window.localStorage.setItem("cleanidex_theme", next ? "dark" : "light");
  }

  async function postJson(url: string, body: unknown) {
    const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "request_failed");
    return json;
  }

  async function onCreateClient(e: FormEvent) {
    e.preventDefault();
    if (!clientName.trim()) return;
    await postJson("/api/cleanidex/clients", { name: clientName.trim() });
    setClientName("");
    setNotice("거래처가 추가되었습니다.");
    await loadClients();
  }

  async function onCreateSite(e: FormEvent) {
    e.preventDefault();
    if (!siteClientId || !siteName.trim()) return;
    await postJson("/api/cleanidex/sites", { client_id: siteClientId, name: siteName.trim() });
    setSiteName("");
    setNotice("현장이 추가되었습니다.");
    await loadSites();
  }

  async function onCreateContract(e: FormEvent) {
    e.preventDefault();
    if (!contractClientId) return;
    let sourcePdfFileId: string | null = null;
    if (contractPdfFile) {
      const ext = contractPdfFile.name.split(".").pop() ?? "pdf";
      const signed = await postJson("/api/cleanidex/files/signed-upload", { file_type: "contract_pdf", extension: ext });
      const uploadRes = await fetch(signed.data.signed_url, {
        method: "PUT",
        headers: { "content-type": contractPdfFile.type || "application/pdf" },
        body: contractPdfFile,
      });
      if (!uploadRes.ok) throw new Error("contract_pdf_upload_failed");
      const fileMeta = await postJson("/api/cleanidex/files", {
        file_path: signed.data.file_path,
        file_type: "contract_pdf",
        mime_type: contractPdfFile.type || "application/pdf",
        size: contractPdfFile.size,
      });
      sourcePdfFileId = fileMeta.data.id;
    }
    await postJson("/api/cleanidex/contracts", {
      client_id: contractClientId,
      site_id: contractSiteId || null,
      source_pdf_file_id: sourcePdfFileId,
    });
    setContractPdfFile(null);
    setNotice("계약이 생성되었습니다.");
    await loadContracts();
  }

  async function onSignContract(e: FormEvent) {
    e.preventDefault();
    if (!signatureContractId) return;
    await postJson("/api/cleanidex/contract-signatures", { contract_id: signatureContractId, signer_type: signatureType });
    setNotice(`서명 완료 (${signatureType === "client" ? "고객" : "업체"})`);
    await loadContracts();
  }

  async function onIssueContractSignRequest(e: FormEvent) {
    e.preventDefault();
    if (!signRequestContractId) return;
    const json = await postJson("/api/cleanidex/contracts/sign-request", {
      contract_id: signRequestContractId,
      signer_type: "client",
      recipient_name: signRequestRecipientName.trim() || null,
      recipient_contact: signRequestRecipientContact.trim() || null,
      expires_in_hours: 72,
    });
    setLatestSignRequestPath(json.data.sign_path ?? "");
    setNotice("서명 요청 링크가 발급되었습니다.");
  }

  async function onCreatePhotoZone(e: FormEvent) {
    e.preventDefault();
    if (!zoneSiteId) return;
    setError(null);

    const existingNameSet = new Set(zoneEditorZones.map((z) => z.name.trim().toLowerCase()));
    const inputNames = [
      zoneName.trim(),
      ...zoneBulkNames
        .split(/\r?\n/)
        .map((v) => v.trim())
        .filter(Boolean),
    ]
      .filter((v, idx, arr) => arr.indexOf(v) === idx)
      .filter(Boolean);
    const names = inputNames.filter((name) => !existingNameSet.has(name.toLowerCase()));
    const skippedCount = inputNames.length - names.length;

    if (!names.length) {
      setNotice("모든 구역이 이미 등록되어 있어 저장할 항목이 없습니다.");
      return;
    }

    const result = await postJson("/api/cleanidex/photo-zones", {
      site_id: zoneSiteId,
      names,
      is_required: true,
    });

    const createdCount = Number(result.created_count ?? 0);
    const skippedByServer = Number(result.skipped_count ?? 0);
    const totalSkipped = skippedCount + skippedByServer;

    if (createdCount > 0) {
      setZoneName("");
      setZoneBulkNames("");
      const zonesRes = await fetch(`/api/cleanidex/photo-zones?site_id=${encodeURIComponent(zoneSiteId)}`);
      const zonesJson = await zonesRes.json();
      if (zonesRes.ok) setZoneEditorZones(zonesJson.data ?? []);
    }

    if (createdCount > 0) {
      setNotice(
        totalSkipped > 0
          ? `현장 사진 구역 ${createdCount}개 저장, 중복 ${totalSkipped}개 건너뜀`
          : `현장 사진 구역 ${createdCount}개가 저장되었습니다.`,
      );
      return;
    }

    setNotice("추가된 구역이 없습니다.");
  }

  async function onDeletePhotoZone(zoneId: string) {
    const res = await fetch(`/api/cleanidex/photo-zones?id=${encodeURIComponent(zoneId)}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "request_failed");
    setZoneEditorZones((prev) => prev.filter((z) => z.id !== zoneId));
    setNotice("사진 구역이 삭제되었습니다.");
  }

  async function onMovePhotoZone(zoneId: string, direction: -1 | 1) {
    const ordered = [...zoneEditorZones].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const index = ordered.findIndex((z) => z.id === zoneId);
    const targetIndex = index + direction;
    if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;

    const current = ordered[index];
    const target = ordered[targetIndex];
    const currentSort = current.sort_order ?? index;
    const targetSort = target.sort_order ?? targetIndex;

    const res = await fetch("/api/cleanidex/photo-zones", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        orders: [
          { id: current.id, sort_order: targetSort },
          { id: target.id, sort_order: currentSort },
        ],
      }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "request_failed");

    ordered[index] = { ...target, sort_order: currentSort };
    ordered[targetIndex] = { ...current, sort_order: targetSort };
    setZoneEditorZones(ordered);
    setNotice("사진 구역 순서가 변경되었습니다.");
  }

  function onStartEditPhotoZone(zoneId: string, currentName: string) {
    setEditingZoneId(zoneId);
    setEditingZoneName(currentName);
  }

  async function onSavePhotoZoneName() {
    const name = editingZoneName.trim();
    if (!editingZoneId || !name) return;
    const res = await fetch("/api/cleanidex/photo-zones", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: editingZoneId, name }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "request_failed");

    setZoneEditorZones((prev) => prev.map((z) => (z.id === editingZoneId ? { ...z, name } : z)));
    setEditingZoneId("");
    setEditingZoneName("");
    setNotice("사진 구역 이름이 수정되었습니다.");
  }

  async function onSetSiteTemplate(e: FormEvent) {
    e.preventDefault();
    if (!templateSiteId || !templateId) return;
    await postJson("/api/cleanidex/site-checklist-template", { site_id: templateSiteId, template_id: templateId });
    setNotice("현장 체크리스트 템플릿이 저장되었습니다.");
  }

  async function onCreateOptionSet(e: FormEvent) {
    e.preventDefault();
    if (!optionSetName.trim()) return;
    await postJson("/api/cleanidex/checklist-option-sets", { name: optionSetName.trim() });
    setOptionSetName("");
    setNotice("옵션셋이 생성되었습니다.");
    await loadOptionSets();
  }

  async function onCreateOption(e: FormEvent) {
    e.preventDefault();
    if (!newOptionSetId || !newOptionLabel.trim()) return;
    await postJson("/api/cleanidex/checklist-options", { option_set_id: newOptionSetId, label: newOptionLabel.trim() });
    setNewOptionLabel("");
    setNotice("옵션이 추가되었습니다.");
  }

  async function onCreateTemplate(e: FormEvent) {
    e.preventDefault();
    if (!newTemplateName.trim() || !newTemplateOptionSetId) return;
    await postJson("/api/cleanidex/checklist-template", {
      name: newTemplateName.trim(),
      option_set_id: newTemplateOptionSetId,
    });
    setNewTemplateName("");
    setNotice("체크리스트 템플릿이 생성되었습니다.");
    await loadTemplates();
  }

  async function onCreateTemplateVersion(e: FormEvent) {
    e.preventDefault();
    if (!versionSourceTemplateId) return;
    await postJson("/api/cleanidex/checklist-template", {
      source_template_id: versionSourceTemplateId,
      name: versionName.trim() || null,
    });
    setVersionName("");
    setNotice("템플릿 새 버전이 생성되었습니다.");
    await loadTemplates();
  }

  async function onCreateChecklistItem(e: FormEvent) {
    e.preventDefault();
    if (!itemTemplateId || !itemTitle.trim()) return;
    await postJson("/api/cleanidex/checklist-items", { template_id: itemTemplateId, title: itemTitle.trim() });
    setItemTitle("");
    setNotice("체크리스트 항목이 추가되었습니다.");
  }

  async function onQuickCreateTemplate(e: FormEvent) {
    e.preventDefault();
    const name = quickTemplateName.trim();
    const itemLines = quickTemplateItems.trim();
    if (!name) return;
    if (!itemLines) {
      setNotice("항목을 한 줄씩 입력해주세요.");
      return;
    }

    const json = await postJson("/api/cleanidex/checklist-template", {
      name,
      item_lines: itemLines,
    });

    if (quickTemplateSiteId) {
      await postJson("/api/cleanidex/site-checklist-template", {
        site_id: quickTemplateSiteId,
        template_id: json.data.id,
      });
    }

    setQuickTemplateName("");
    setQuickTemplateItems("");
    setNotice("간편 템플릿이 생성되었습니다.");
    await loadTemplates();
  }

  async function onStartWork(e: FormEvent) {
    e.preventDefault();
    if (!workSiteId || !workDate) return;
    const json = await postJson("/api/cleanidex/work-sessions", { site_id: workSiteId, work_date: workDate });
    setWorkSessionId(json.data.id);
    setNotice("작업 세션이 시작되었습니다.");
    await loadSessions();
  }

  async function onSelectChecklist(itemId: string, optionId: string) {
    if (!workSessionId) return;
    const prev = checklistMap[itemId];
    setChecklistMap((m) => ({ ...m, [itemId]: optionId }));
    try {
      await postJson("/api/cleanidex/checklist-responses", {
        work_session_id: workSessionId,
        responses: [{ checklist_item_id: itemId, selected_option_id: optionId }],
      });
    } catch {
      setChecklistMap((m) => ({ ...m, [itemId]: prev }));
      setNotice("체크리스트 저장 실패");
    }
  }

  async function compressImage(file: File, maxBytes = 500 * 1024) {
    if (!file.type.startsWith("image/") || file.size <= maxBytes) return file;
    const imageUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error("image_decode_failed"));
        el.src = imageUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return file;
      ctx.drawImage(img, 0, 0);
      let quality = 0.82;
      let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      while (blob && blob.size > maxBytes && quality > 0.4) {
        quality -= 0.08;
        blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
      }
      if (!blob) return file;
      return new File([blob], `${file.name.replace(/\.[^/.]+$/, "")}.jpg`, { type: "image/jpeg" });
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  async function onUploadPhoto(e: FormEvent) {
    e.preventDefault();
    if (!workSessionId || !photoZoneId || !photoFile) return;
    const compressed = await compressImage(photoFile);
    const ext = compressed.name.split(".").pop() ?? "jpg";
    const signed = await postJson("/api/cleanidex/files/signed-upload", { file_type: "work_photo", extension: ext });
    const uploadRes = await fetch(signed.data.signed_url, {
      method: "PUT",
      headers: { "content-type": compressed.type || "application/octet-stream" },
      body: compressed,
    });
    if (!uploadRes.ok) throw new Error("upload_failed");
    const fileMeta = await postJson("/api/cleanidex/files", {
      file_path: signed.data.file_path,
      file_type: "work_photo",
      mime_type: compressed.type || "application/octet-stream",
      size: compressed.size,
    });
    await postJson("/api/cleanidex/work-photos", {
      work_session_id: workSessionId,
      file_id: fileMeta.data.id,
      zone_id: photoZoneId,
      captured_at: new Date().toISOString(),
    });
    setPhotoFile(null);
    setNotice("작업 사진 업로드 완료");
  }

  async function onIssueLink() {
    if (!workSessionId) return;
    try {
      const json = await postJson("/api/cleanidex/client-confirmations/token", { work_session_id: workSessionId, expires_in_minutes: 1440 });
      setConfirmLinkPath(`/cleanidex/confirm?token=${json.data.token}`);
      setNotice("고객 확인 링크 발급 완료");
      await loadConfirmations();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "발급 실패");
    }
  }

  async function onCreateReport(e: FormEvent) {
    e.preventDefault();
    if (!reportSessionId) return;
    await postJson("/api/cleanidex/reports", { work_session_id: reportSessionId, generated_pdf_file_id: reportFileId || null });
    setNotice("리포트 생성 요청 완료");
    await loadReports();
  }

  async function onOpenReport(report: Report) {
    if (!report.generated_pdf_file_id) return;
    const json = await postJson("/api/cleanidex/files/download-url", { file_id: report.generated_pdf_file_id, expires_in_seconds: 300 });
    window.open(json.data.signed_url, "_blank", "noopener,noreferrer");
  }

  const baseCard = isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white";
  const baseInput = isDark ? "border-slate-600 bg-slate-800 text-slate-100" : "border-slate-300";

  return (
    <div className="relative">
      <div className={`fixed inset-0 -z-10 ${isDark ? "bg-slate-950" : "bg-slate-50"}`} />
      <div className={`mx-auto min-h-[calc(100vh-9rem)] max-w-5xl space-y-5 p-4 ${isDark ? "text-slate-100" : "text-slate-900"}`}>
        <div className={`rounded-xl border p-4 ${baseCard}`}>
          <div className="flex items-center justify-between gap-2">
            <h1 className="text-xl font-bold">Cleanidex 운영 대시보드</h1>
            <button onClick={toggleTheme} className={`rounded px-3 py-1.5 text-xs ${isDark ? "bg-slate-700" : "bg-slate-100"}`}>
              {isDark ? "라이트 모드" : "다크 모드"}
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {(Object.keys(TAB_LABEL) as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  tab === t ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700"
                }`}
              >
                {TAB_LABEL[t]}
              </button>
            ))}
          </div>
          {notice ? <p className="mt-2 text-sm text-emerald-600">{notice}</p> : null}
          {error ? <p className="mt-2 text-sm text-rose-600">{error}</p> : null}
        </div>

        {tab === "settings" ? (
          <div className="grid gap-4 md:grid-cols-2">
            <form onSubmit={onQuickCreateTemplate} className={`rounded-xl border p-4 md:col-span-2 ${baseCard}`}>
              <h2 className="font-semibold">간편 체크리스트 템플릿 생성</h2>
              <p className="mt-1 text-xs text-slate-500">템플릿명 + 항목 줄바꿈만 입력하면 바로 생성됩니다. (기본 옵션: 좋음/미흡)</p>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <input
                  value={quickTemplateName}
                  onChange={(e) => setQuickTemplateName(e.target.value)}
                  placeholder="템플릿명 (예: 주간 정기청소)"
                  className={`w-full rounded border px-3 py-2 text-sm ${baseInput}`}
                />
                <select
                  value={quickTemplateSiteId}
                  onChange={(e) => setQuickTemplateSiteId(e.target.value)}
                  className={`w-full rounded border px-3 py-2 text-sm ${baseInput}`}
                >
                  <option value="">생성 후 바로 연결할 현장(선택)</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={quickTemplateItems}
                onChange={(e) => setQuickTemplateItems(e.target.value)}
                placeholder={"항목을 한 줄씩 입력\n예)\n바닥 청결 상태\n화장실 청결 상태\n쓰레기 배출 완료"}
                rows={5}
                className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
              />
              <button className="mt-2 rounded bg-emerald-600 px-3 py-2 text-sm text-white">간편 생성</button>
            </form>

            <form onSubmit={onCreateClient} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">거래처 생성</h2>
              <input value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="거래처명" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">추가</button>
            </form>
            <form onSubmit={onCreateSite} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">현장 생성</h2>
              <select value={siteClientId} onChange={(e) => setSiteClientId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">거래처 선택</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={siteName} onChange={(e) => setSiteName(e.target.value)} placeholder="현장명" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">추가</button>
            </form>
            <form onSubmit={onCreateContract} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">계약 생성</h2>
              <select value={contractClientId} onChange={(e) => setContractClientId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">거래처 선택</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <select value={contractSiteId} onChange={(e) => setContractSiteId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">현장(선택)</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input
                type="file"
                accept="application/pdf"
                onChange={(e) => setContractPdfFile(e.target.files?.[0] ?? null)}
                className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
              />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">계약 생성</button>
            </form>
            <form onSubmit={onSignContract} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">전자서명 기록</h2>
              <select value={signatureContractId} onChange={(e) => setSignatureContractId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">계약 선택</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.id.slice(0, 8)} / {c.status}</option>)}
              </select>
              <select value={signatureType} onChange={(e) => setSignatureType(e.target.value as "company" | "client")} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="company">업체 서명</option><option value="client">고객 서명</option>
              </select>
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">서명 기록</button>
            </form>
            <form onSubmit={onIssueContractSignRequest} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">계약 전자서명 요청 링크</h2>
              <select value={signRequestContractId} onChange={(e) => setSignRequestContractId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">계약 선택</option>{contracts.map((c) => <option key={c.id} value={c.id}>{c.id.slice(0, 8)} / {c.status}</option>)}
              </select>
              <input value={signRequestRecipientName} onChange={(e) => setSignRequestRecipientName(e.target.value)} placeholder="수신자 이름(선택)" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <input value={signRequestRecipientContact} onChange={(e) => setSignRequestRecipientContact(e.target.value)} placeholder="연락처/이메일(선택)" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-indigo-600 px-3 py-2 text-sm text-white">서명요청 링크 발급</button>
              {latestSignRequestPath ? (
                <p className="mt-2 text-xs">
                  링크:{" "}
                  <a href={latestSignRequestPath} target="_blank" rel="noreferrer" className="text-indigo-600 underline">
                    {latestSignRequestPath}
                  </a>
                </p>
              ) : null}
            </form>
            <form onSubmit={onCreatePhotoZone} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">현장별 사진 구역</h2>
              <select value={zoneSiteId} onChange={(e) => setZoneSiteId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">현장 선택</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input value={zoneName} onChange={(e) => setZoneName(e.target.value)} placeholder="대표 구역 1개(선택) 예: 출입구" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <textarea
                value={zoneBulkNames}
                onChange={(e) => setZoneBulkNames(e.target.value)}
                rows={4}
                placeholder={"구역 여러 개를 한 줄씩 입력\n예)\n복도\n화장실\n탕비실"}
                className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}
              />
              <button
                type="button"
                onClick={() => setZoneBulkNames("출입구\n복도\n화장실\n탕비실")}
                className={`mt-2 rounded px-3 py-2 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
              >
                기본 구역 예시 채우기
              </button>
              <button className="mt-2 ml-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">구역 일괄 저장</button>
              <div className="mt-3 rounded border p-2">
                <p className="text-xs font-medium">현재 구역 목록</p>
                {zoneEditorZones.length === 0 ? (
                  <p className="mt-1 text-xs text-slate-500">현장을 선택하면 구역이 표시됩니다.</p>
                ) : (
                  <div className="mt-2 space-y-1">
                    {zoneEditorZones
                      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                      .map((z, idx, arr) => (
                        <div key={z.id} className={`flex items-center justify-between rounded px-2 py-1 ${isDark ? "bg-slate-800/60" : "bg-slate-100"}`}>
                          {editingZoneId === z.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                value={editingZoneName}
                                onChange={(e) => setEditingZoneName(e.target.value)}
                                className={`rounded border px-2 py-1 text-xs ${baseInput}`}
                              />
                              <button
                                type="button"
                                onClick={() => void onSavePhotoZoneName()}
                                className="rounded bg-emerald-600 px-2 py-1 text-[11px] text-white"
                              >
                                저장
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingZoneId("");
                                  setEditingZoneName("");
                                }}
                                className="rounded bg-slate-600 px-2 py-1 text-[11px] text-white"
                              >
                                취소
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs">{z.name}</span>
                          )}
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => onStartEditPhotoZone(z.id, z.name)}
                              className="rounded bg-amber-600 px-2 py-1 text-[11px] text-white"
                            >
                              수정
                            </button>
                            <button
                              type="button"
                              disabled={idx === 0}
                              onClick={() => void onMovePhotoZone(z.id, -1)}
                              className="rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                            >
                              위
                            </button>
                            <button
                              type="button"
                              disabled={idx === arr.length - 1}
                              onClick={() => void onMovePhotoZone(z.id, 1)}
                              className="rounded bg-slate-700 px-2 py-1 text-[11px] text-white disabled:opacity-40"
                            >
                              아래
                            </button>
                            <button
                              type="button"
                              onClick={() => void onDeletePhotoZone(z.id)}
                              className="rounded bg-rose-600 px-2 py-1 text-[11px] text-white"
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </form>
            <form onSubmit={onSetSiteTemplate} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">현장별 체크리스트 템플릿</h2>
              <select value={templateSiteId} onChange={(e) => setTemplateSiteId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">현장 선택</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">템플릿 선택</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {templateId ? (
                <div className={`mt-2 rounded border p-2 text-xs ${isDark ? "border-slate-700 bg-slate-800/50" : "border-slate-200 bg-slate-50"}`}>
                  <p className="font-semibold">템플릿 미리보기</p>
                  {isTemplatePreviewLoading ? <p className="mt-1 text-slate-500">불러오는 중...</p> : null}
                  {!isTemplatePreviewLoading ? (
                    <>
                      <p className="mt-1 text-slate-500">옵션: {templatePreviewOptions.map((o) => o.label).join(" / ") || "-"}</p>
                      <div className="mt-1 space-y-1">
                        {templatePreviewItems.slice(0, 10).map((item, idx) => (
                          <p key={item.id}>{idx + 1}. {item.title}</p>
                        ))}
                        {templatePreviewItems.length > 10 ? <p className="text-slate-500">...외 {templatePreviewItems.length - 10}개</p> : null}
                        {templatePreviewItems.length === 0 ? <p className="text-slate-500">템플릿 항목이 없습니다.</p> : null}
                      </div>
                    </>
                  ) : null}
                </div>
              ) : null}
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">템플릿 저장</button>
            </form>
            <details className={`rounded-xl border p-4 md:col-span-2 ${baseCard}`}>
              <summary className="cursor-pointer text-sm font-semibold">고급 템플릿 설정 (옵션셋/버전/항목)</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
            <form onSubmit={onCreateOptionSet} className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
              <h2 className="font-semibold">옵션셋 생성</h2>
              <input value={optionSetName} onChange={(e) => setOptionSetName(e.target.value)} placeholder="예: 기본 점검 옵션" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">옵션셋 생성</button>
            </form>
            <form onSubmit={onCreateOption} className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
              <h2 className="font-semibold">옵션 추가</h2>
              <select value={newOptionSetId} onChange={(e) => setNewOptionSetId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">옵션셋 선택</option>{optionSets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <input value={newOptionLabel} onChange={(e) => setNewOptionLabel(e.target.value)} placeholder="예: 좋음" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">옵션 추가</button>
            </form>
            <form onSubmit={onCreateTemplate} className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
              <h2 className="font-semibold">템플릿 생성</h2>
              <input value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="예: 사무실 기본 템플릿" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <select value={newTemplateOptionSetId} onChange={(e) => setNewTemplateOptionSetId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">옵션셋 선택</option>{optionSets.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">템플릿 생성</button>
            </form>
            <form onSubmit={onCreateTemplateVersion} className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
              <h2 className="font-semibold">템플릿 버전 생성</h2>
              <select value={versionSourceTemplateId} onChange={(e) => setVersionSourceTemplateId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">원본 템플릿 선택</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input value={versionName} onChange={(e) => setVersionName(e.target.value)} placeholder="새 버전 이름(선택)" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">버전 생성</button>
            </form>
            <form onSubmit={onCreateChecklistItem} className={`rounded-xl border p-4 ${isDark ? "border-slate-700 bg-slate-800/40" : "border-slate-200 bg-slate-50"}`}>
              <h2 className="font-semibold">템플릿 항목 추가</h2>
              <select value={itemTemplateId} onChange={(e) => setItemTemplateId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">템플릿 선택</option>{templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <input value={itemTitle} onChange={(e) => setItemTitle(e.target.value)} placeholder="예: 바닥 청결 상태" className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">항목 추가</button>
            </form>
              </div>
            </details>
          </div>
        ) : null}

        {tab === "work" ? (
          <div className="grid gap-4 md:grid-cols-3">
            <form onSubmit={onStartWork} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">1) 작업 시작</h2>
              <select value={workSiteId} onChange={(e) => setWorkSiteId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">현장 선택</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">세션 생성</button>
            </form>
            <div className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">2) 체크리스트 작성</h2>
              <select value={workSessionId} onChange={(e) => setWorkSessionId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">작업세션 선택</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.work_date} / {s.id.slice(0, 8)}</option>)}
              </select>
              {sessionHasMore ? (
                <button
                  type="button"
                  onClick={() => void loadSessions({ append: true })}
                  className={`mt-2 rounded px-3 py-1.5 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
                >
                  세션 더 보기
                </button>
              ) : null}
              <div className="mt-2 space-y-2">
                {checklistItems.map((item) => (
                  <div key={item.id}>
                    <p className="text-xs">{item.title}</p>
                    <div className="mt-1 flex gap-1">
                      {checklistOptions.map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => onSelectChecklist(item.id, opt.id)}
                          className={`rounded px-2 py-1 text-xs ${checklistMap[item.id] === opt.id ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-100"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <form onSubmit={onUploadPhoto} className={`rounded-xl border p-4 ${baseCard}`}>
              <h2 className="font-semibold">3) 촬영 업로드</h2>
              <select value={photoZoneId} onChange={(e) => setPhotoZoneId(e.target.value)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">사진 구역 선택</option>{photoZones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
              </select>
              <input type="file" accept="image/*" capture="environment" onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)} className={`mt-2 w-full rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="mt-2 rounded bg-slate-900 px-3 py-2 text-sm text-white">업로드</button>
              <p className="mt-2 text-xs text-slate-500">촬영 우선 모드. 일부 기기는 갤러리 노출 가능.</p>
            </form>
            <div className={`rounded-xl border p-4 md:col-span-3 ${baseCard}`}>
              <h2 className="font-semibold">4) 고객확인 발급</h2>
              <button onClick={onIssueLink} disabled={!workSessionId} className="mt-2 rounded bg-emerald-600 px-3 py-2 text-sm text-white disabled:bg-emerald-300">
                확인 링크 발급
              </button>
              {confirmLinkPath ? <p className="mt-2 text-sm">링크: <a className="underline text-emerald-600" href={confirmLinkPath} target="_blank" rel="noreferrer">{confirmLinkPath}</a></p> : null}
            </div>
          </div>
        ) : null}

        {tab === "confirm" ? (
          <div className={`rounded-xl border p-4 ${baseCard}`}>
            <h2 className="font-semibold">확인현황</h2>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmFilter("all")}
                className={`rounded px-2 py-1 text-xs ${confirmFilter === "all" ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-100"}`}
              >
                전체
              </button>
              <button
                type="button"
                onClick={() => setConfirmFilter("opened_pending")}
                className={`rounded px-2 py-1 text-xs ${
                  confirmFilter === "opened_pending" ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-100"
                }`}
              >
                열람 후 미확인
              </button>
              <button
                type="button"
                onClick={() => setConfirmFilter("confirmed")}
                className={`rounded px-2 py-1 text-xs ${confirmFilter === "confirmed" ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700" : "bg-slate-100"}`}
              >
                확인 완료
              </button>
            </div>
            <div className="mt-3 space-y-2">
              {pagedConfirmations.map((row) => (
                <div key={row.id} className={`rounded border px-3 py-2 text-sm ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  세션 {row.work_session_id.slice(0, 8)} / 열람 {row.opened_at ? "완료" : "대기"} / 최종확인 {row.confirmed ? "완료" : "대기"}
                </div>
              ))}
              {!pagedConfirmations.length ? <p className="text-sm text-slate-500">표시할 확인 내역이 없습니다.</p> : null}
              {confirmHasMore ? (
                <button
                  type="button"
                  onClick={() => void loadConfirmations({ append: true, filter: confirmFilter })}
                  className={`rounded px-3 py-1.5 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
                >
                  더 보기
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === "evidence" ? (
          <div className={`rounded-xl border p-4 ${baseCard}`}>
            <h2 className="font-semibold">증거/PDF</h2>
            <form onSubmit={onCreateReport} className="mt-2 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select value={reportSessionId} onChange={(e) => setReportSessionId(e.target.value)} className={`rounded border px-3 py-2 text-sm ${baseInput}`}>
                <option value="">작업세션 선택</option>{sessions.map((s) => <option key={s.id} value={s.id}>{s.work_date} / {s.id.slice(0, 8)}</option>)}
              </select>
              {sessionHasMore ? (
                <button
                  type="button"
                  onClick={() => void loadSessions({ append: true })}
                  className={`rounded px-3 py-2 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
                >
                  세션 더 보기
                </button>
              ) : null}
              <input value={reportFileId} onChange={(e) => setReportFileId(e.target.value)} placeholder="PDF file_id (선택)" className={`rounded border px-3 py-2 text-sm ${baseInput}`} />
              <button className="rounded bg-indigo-600 px-3 py-2 text-sm text-white">PDF 생성 기록</button>
            </form>
            <div className="mt-3 space-y-2">
              {pagedReports.map((r) => (
                <div key={r.id} className={`flex items-center justify-between rounded border px-3 py-2 text-sm ${isDark ? "border-slate-700" : "border-slate-200"}`}>
                  <span>{r.work_session_id.slice(0, 8)} / {new Date(r.generated_at).toLocaleString()}</span>
                  <button disabled={!r.generated_pdf_file_id} onClick={() => onOpenReport(r)} className="rounded bg-slate-900 px-2 py-1 text-xs text-white disabled:bg-slate-400">PDF 열기</button>
                </div>
              ))}
              {reportHasMore ? (
                <button
                  type="button"
                  onClick={() => void loadReports({ append: true })}
                  className={`rounded px-3 py-1.5 text-xs ${isDark ? "bg-slate-700 text-slate-100" : "bg-slate-100 text-slate-700"}`}
                >
                  더 보기
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
