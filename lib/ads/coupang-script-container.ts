/** 쿠팡 파트너스 스크립트가 지정 컨테이너 안에만 렌더되도록 보정 */

export function coupangAdContainerId(slotKey: string): string {
  const safe = slotKey.replace(/[^a-zA-Z0-9_-]/g, "_");
  return `coupang-ad-${safe}`;
}

const COUPANG_G_JS = "https://ads-partners.coupang.com/g.js";

export function isCoupangPartnersScript(scriptContent: string): boolean {
  return /ads-partners\.coupang\.com\/g\.js|PartnersCoupang\.G/i.test(scriptContent);
}

/** PartnersCoupang.G({...}) 설정 객체 추출 */
export function extractCoupangGConfig(scriptContent: string): Record<string, unknown> | null {
  const match = scriptContent.match(/PartnersCoupang\.G\s*\(\s*(\{[\s\S]*?\})\s*\)/i);
  if (!match?.[1]) return null;
  try {
    return JSON.parse(match[1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractCoupangWidgetId(scriptContent: string): string | null {
  const config = extractCoupangGConfig(scriptContent);
  if (config?.id != null) return String(config.id);
  const m = scriptContent.match(/["']?id["']?\s*:\s*(\d+)/i);
  return m?.[1] ?? null;
}

/** PartnersCoupang.G JSON에 container(슬롯 div id)를 주입 */
export function patchCoupangScriptContent(scriptContent: string, containerId: string): string {
  const trimmed = scriptContent.trim();
  if (!trimmed || !/PartnersCoupang\.G\s*\(/i.test(trimmed)) return trimmed;

  return trimmed.replace(
    /(?:new\s+)?PartnersCoupang\.G\s*\(\s*(\{[\s\S]*?\})\s*\)/gi,
    (_full, objLiteral) => {
      if (/container\s*:/i.test(objLiteral)) {
        const replaced = objLiteral.replace(
          /container\s*:\s*['"][^'"]*['"]/gi,
          `container:"${containerId}"`
        );
        return `new PartnersCoupang.G(${replaced})`;
      }
      const inner = objLiteral.slice(1, -1).trim();
      return `new PartnersCoupang.G({container:"${containerId}"${inner ? `,${inner}` : ""}})`;
    }
  );
}

type PartnersCoupangGlobal = {
  G: (config: Record<string, unknown>) => unknown;
};

function getPartnersCoupang(): PartnersCoupangGlobal | null {
  if (typeof window === "undefined") return null;
  const w = window as Window & { PartnersCoupang?: PartnersCoupangGlobal };
  return w.PartnersCoupang ?? null;
}

function appendExternalScript(src: string): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();

  const existing = document.querySelector(`script[src="${src}"]`);
  if (existing) return waitForPartnersCoupang(12000).then(() => undefined);

  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

/** g.js 로드 후 PartnersCoupang.G 사용 가능할 때까지 대기 */
export function waitForPartnersCoupang(maxMs = 12000): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);

  return new Promise((resolve) => {
    const deadline = Date.now() + maxMs;
    const tick = () => {
      if (getPartnersCoupang()?.G) {
        resolve(true);
        return;
      }
      if (Date.now() > deadline) {
        resolve(false);
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

/** @deprecated waitForPartnersCoupang 사용 */
export function ensureCoupangGJsLoaded(): Promise<void> {
  return appendExternalScript(COUPANG_G_JS).then(() => waitForPartnersCoupang(12000)).then(() => undefined);
}

function invokePartnersCoupangG(mountEl: HTMLElement, config: Record<string, unknown>): void {
  const PC = getPartnersCoupang();
  if (!PC?.G) return;

  const base = { ...config };
  delete base.container;

  const optsList: Record<string, unknown>[] = [
    { ...base, container: mountEl },
    { ...base, container: mountEl.id },
    { ...base, container: `#${mountEl.id}` },
    base,
  ];

  for (const opts of optsList) {
    try {
      const G = PC.G as unknown as new (o: Record<string, unknown>) => unknown;
      new G(opts);
      return;
    } catch {
      try {
        PC.G(opts);
        return;
      } catch {
        // try next
      }
    }
  }
}

function appendInlineScript(code: string, mountEl: HTMLElement): void {
  const parent = mountEl.parentElement;
  if (!parent) return;
  const script = document.createElement("script");
  script.textContent = code;
  script.setAttribute("data-coupang-inline", mountEl.id);
  parent.insertBefore(script, mountEl.nextSibling);
}

/** 쿠팡이 body 등에 붙인 iframe·래퍼를 슬롯 mount로 이동 */
export function reparentCoupangIframeToContainer(
  containerId: string,
  widgetId?: string | null
): boolean {
  const container = document.getElementById(containerId);
  if (!container) return false;

  if (container.querySelector("iframe, a[href*='coupang'], img[src*='coupang']")) return true;

  const nodes: HTMLElement[] = [];

  if (widgetId) {
    document.querySelectorAll<HTMLElement>(`iframe[id^="${widgetId}"]`).forEach((el) => nodes.push(el));
    document.querySelectorAll<HTMLElement>(`div[id^="${widgetId}"]`).forEach((el) => nodes.push(el));
  }

  if (nodes.length === 0) {
    document.querySelectorAll<HTMLIFrameElement>("iframe").forEach((el) => {
      const src = el.getAttribute("src") ?? "";
      if (/coupang|ads-partners|partners\.coupang/i.test(src)) nodes.push(el);
    });
  }

  for (const node of nodes) {
    const otherRoot = node.closest(".coupang-partners-slot-root");
    if (otherRoot && otherRoot !== container) continue;
    if (container.contains(node)) return true;

    let target: HTMLElement = node;
    const parent = node.parentElement;
    if (parent && parent !== document.body && parent !== document.documentElement) {
      const onlyCoupang =
        parent.querySelectorAll("iframe, a[href*='coupang']").length <= 2 &&
        parent.id !== containerId;
      if (onlyCoupang) target = parent;
    }

    try {
      container.appendChild(target);
      return true;
    } catch {
      // try next
    }
  }

  return false;
}

export type CoupangReparentHandle = { disconnect: () => void };

/** iframe 생성·이동을 감시하며 슬롯 안으로 옮김 */
export function watchCoupangReparent(
  containerId: string,
  widgetId: string | null,
  maxMs = 12000
): CoupangReparentHandle {
  const tryMove = () => reparentCoupangIframeToContainer(containerId, widgetId);

  if (tryMove()) return { disconnect: () => undefined };

  const timers = [80, 200, 500, 1000, 2000, 4000, 8000].map((ms) =>
    window.setTimeout(tryMove, ms)
  );

  const observer = new MutationObserver(() => {
    if (tryMove()) observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const stopTimer = window.setTimeout(() => {
    observer.disconnect();
  }, maxMs);

  return {
    disconnect: () => {
      observer.disconnect();
      window.clearTimeout(stopTimer);
      timers.forEach((t) => window.clearTimeout(t));
    },
  };
}

/**
 * 쿠팡 파트너스 HTML 스크립트를 마운트 (티스토리 방식: g.js → G() → iframe reparent).
 */
export async function mountCoupangPartnersScript(
  scriptContent: string,
  containerId: string,
  mountEl: HTMLElement
): Promise<CoupangReparentHandle> {
  const patched = patchCoupangScriptContent(scriptContent, containerId);
  const sandbox = document.createElement("div");
  sandbox.innerHTML = patched;
  const scriptEls = Array.from(sandbox.querySelectorAll("script"));

  for (const old of scriptEls) {
    const src = old.getAttribute("src")?.trim();
    if (src) await appendExternalScript(src);
  }

  if (!scriptEls.some((s) => s.getAttribute("src")?.includes("coupang"))) {
    await appendExternalScript(COUPANG_G_JS);
  }

  await waitForPartnersCoupang(12000);

  const config = extractCoupangGConfig(scriptContent);
  if (config) {
    invokePartnersCoupangG(mountEl, config);
    await new Promise((r) => window.setTimeout(r, 400));
  }

  if (!mountEl.querySelector("iframe")) {
    for (const old of scriptEls) {
      if (old.getAttribute("src")) continue;
      const code = old.textContent?.trim();
      if (code) appendInlineScript(code, mountEl);
    }
  }

  const widgetId = extractCoupangWidgetId(scriptContent);
  return watchCoupangReparent(containerId, widgetId);
}

/** @deprecated mountCoupangPartnersScript 사용 */
export function renderCoupangPartnersWidget(
  mountEl: HTMLElement,
  config: Record<string, unknown>
): void {
  invokePartnersCoupangG(mountEl, config);
}

/** @deprecated reparentCoupangIframeToContainer 사용 */
export function reparentCoupangWidgetsToContainer(containerId: string): void {
  reparentCoupangIframeToContainer(containerId, null);
}

/** @deprecated patchCoupangScriptContent 사용 */
export function wrapCoupangScriptForContainer(scriptContent: string, containerId: string): string {
  return patchCoupangScriptContent(scriptContent, containerId);
}
