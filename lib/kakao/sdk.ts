import { getMagamShareBaseUrl } from "@/lib/magam/share-url";

const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";

export type KakaoFeedShareInput = {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  buttonTitle?: string;
};

type KakaoShareApi = {
  sendDefault: (opts: Record<string, unknown>) => void;
  sendScrap: (opts: { requestUrl: string }) => void;
};

type KakaoGlobal = {
  init: (key: string) => void;
  isInitialized: () => boolean;
  Share: KakaoShareApi;
};

declare global {
  interface Window {
    Kakao?: KakaoGlobal;
  }
}

let loadPromise: Promise<void> | null = null;

export function getKakaoJavascriptKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim();
  return key || undefined;
}

export function defaultKakaoShareImageUrl(): string {
  return `${getMagamShareBaseUrl()}/magam/opengraph-image`;
}

function loadKakaoSdkScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("window unavailable"));
  }
  if (window.Kakao?.Share?.sendDefault) {
    return Promise.resolve();
  }

  if (!loadPromise) {
    loadPromise = new Promise((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-kakao-sdk="1"]');
      if (existing) {
        if (window.Kakao?.Share?.sendDefault) {
          resolve();
          return;
        }
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener("error", () => reject(new Error("kakao sdk load failed")), {
          once: true,
        });
        return;
      }

      const script = document.createElement("script");
      script.src = KAKAO_SDK_URL;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.dataset.kakaoSdk = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("kakao sdk load failed"));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

function initKakaoIfNeeded(): boolean {
  const key = getKakaoJavascriptKey();
  const Kakao = window.Kakao;
  if (!key || !Kakao?.Share?.sendDefault) return false;

  try {
    if (!Kakao.isInitialized()) {
      Kakao.init(key);
    }
    return Kakao.isInitialized();
  } catch {
    return false;
  }
}

/** SDK 스크립트 로드 + init (페이지 진입 시 미리 호출) */
export async function ensureKakaoShareReady(): Promise<boolean> {
  if (!getKakaoJavascriptKey()) return false;

  try {
    await loadKakaoSdkScript();
    return initKakaoIfNeeded();
  } catch {
    return false;
  }
}

export function isKakaoSdkShareReady(): boolean {
  return initKakaoIfNeeded();
}

/** 클릭 핸들러 안에서 동기 호출 — 피커가 열리려면 await 전에 호출하는 것이 안전 */
export function kakaoShareFeedSync(input: KakaoFeedShareInput): boolean {
  if (!isKakaoSdkShareReady()) return false;

  const Kakao = window.Kakao;
  if (!Kakao?.Share?.sendDefault) return false;

  const link = {
    mobileWebUrl: input.url,
    webUrl: input.url,
  };

  try {
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: input.title,
        description: input.description,
        imageUrl: input.imageUrl ?? defaultKakaoShareImageUrl(),
        link,
      },
      buttons: [
        {
          title: input.buttonTitle ?? "공고 보기",
          link,
        },
      ],
    });
    return true;
  } catch {
    return false;
  }
}

export function kakaoShareScrapSync(url: string): boolean {
  if (!isKakaoSdkShareReady()) return false;

  const Kakao = window.Kakao;
  if (!Kakao?.Share?.sendScrap) return false;

  try {
    Kakao.Share.sendScrap({ requestUrl: url });
    return true;
  } catch {
    return false;
  }
}

export async function kakaoShareFeed(input: KakaoFeedShareInput): Promise<boolean> {
  if (kakaoShareFeedSync(input)) return true;
  const ready = await ensureKakaoShareReady();
  if (!ready) return false;
  return kakaoShareFeedSync(input);
}
