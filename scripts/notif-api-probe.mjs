/**
 * 임시 사용자로 로그인 → 쿠키를 모아 /api/notifications GET (Next 라우트) 호출.
 * 실행: node --env-file=.env.local scripts/notif-api-probe.mjs
 * 서버: npm run dev (기본 3001)
 */
import { createServerClient } from "@supabase/ssr";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const port = process.env.NOTIF_PROBE_PORT ?? "3001";
const base = `http://127.0.0.1:${port}`;

if (!url || !anon) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / ANON_KEY 필요");
  process.exit(1);
}

const store = new Map();

function getAll() {
  return Array.from(store.entries()).map(([name, value]) => ({ name, value }));
}

function setAll(list) {
  for (const { name, value } of list) {
    if (value) store.set(name, value);
    else store.delete(name);
  }
}

const supabase = createServerClient(url, anon, {
  cookies: { getAll, setAll },
});

const email = `notif-route-${Date.now()}@example.com`;
const password = "ProbeRouteTest123456!";

const { createClient } = await import("@supabase/supabase-js");
const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY);

const { error: cErr } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});
if (cErr) {
  console.error("createUser", cErr.message);
  process.exit(1);
}

const { data: signData, error: sErr } = await supabase.auth.signInWithPassword({ email, password });
if (sErr) {
  console.error("signIn", sErr.message);
  process.exit(1);
}
const userId = signData.user?.id;
if (!userId) {
  console.error("no user id after signIn");
  process.exit(1);
}

const cookieHeader = getAll()
  .map(({ name, value }) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`)
  .join("; ");

const res = await fetch(`${base}/api/notifications?limit=1`, {
  headers: { Cookie: cookieHeader },
});
const text = await res.text();
console.log("HTTP", res.status);
console.log("BODY", text.slice(0, 500));

await admin.auth.admin.deleteUser(userId);

process.exit(res.status === 200 ? 0 : 1);
