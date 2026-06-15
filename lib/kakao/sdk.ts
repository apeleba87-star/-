const KAKAO_SDK_URL = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.5/kakao.min.js";

type KakaoShareApi = {
  sendDefault: (opts: {
    objectType: string;
    text: string;
    link: { mobileWebUrl: string; webUrl: string };
  }) => void;
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
      script.dataset.kakaoSdk = "1";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("kakao sdk load failed"));
      document.head.appendChild(script);
    });
  }

  return loadPromise;
}

export async function ensureKakaoShareReady(): Promise<boolean> {
  const key = getKakaoJavascriptKey();
  if (!key) return false;

  try {
    await loadKakaoSdkScript();
    const Kakao = window.Kakao;
    if (!Kakao?.Share?.sendDefault) return false;
    if (!Kakao.isInitialized()) Kakao.init(key);
    return true;
  } catch {
    return false;
  }
}

export async function kakaoShareText(params: { text: string; url: string }): Promise<boolean> {
  const ready = await ensureKakaoShareReady();
  if (!ready) return false;

  const Kakao = window.Kakao;
  if (!Kakao?.Share?.sendDefault) return false;

  try {
    Kakao.Share.sendDefault({
      objectType: "text",
      text: params.text,
      link: {
        mobileWebUrl: params.url,
        webUrl: params.url,
      },
    });
    return true;
  } catch {
    return false;
  }
}
