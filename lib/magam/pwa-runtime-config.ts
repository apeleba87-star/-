/** Vercel/Next 서버 환경변수 → PWA index.html 런타임 주입 */

export type MagamPwaRuntimeConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  shareBaseUrl: string;
};

export function readMagamPwaRuntimeConfig(): MagamPwaRuntimeConfig | null {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    "";
  const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    process.env.SUPABASE_ANON_KEY?.trim() ||
    "";
  const shareBaseUrl = (
    process.env.MAGAM_SHARE_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://cleanidex.co.kr"
  ).replace(/\/+$/, "");

  if (!supabaseUrl || !supabaseAnonKey) return null;

  return { supabaseUrl, supabaseAnonKey, shareBaseUrl };
}

export function buildMagamPwaRuntimeScript(config: MagamPwaRuntimeConfig): string {
  const payload = JSON.stringify({
    supabaseUrl: config.supabaseUrl,
    supabaseAnonKey: config.supabaseAnonKey,
    shareBaseUrl: config.shareBaseUrl,
  });
  return `<script>window.__MAGAM_CONFIG__=${payload};</script>`;
}

export function injectMagamPwaRuntimeConfig(html: string): string {
  const config = readMagamPwaRuntimeConfig();
  if (!config) return html;
  const script = buildMagamPwaRuntimeScript(config);
  if (html.includes("flutter_bootstrap.js")) {
    return html.replace(
      '<script src="flutter_bootstrap.js"',
      `${script}\n  <script src="flutter_bootstrap.js"`
    );
  }
  return `${script}\n${html}`;
}
