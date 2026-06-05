/**
 * Edge middleware용 IP rate limit.
 * UPSTASH_REDIS_REST_* 가 있으면 분산 카운터, 없으면 인스턴스 메모리(폴백).
 */

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

type MemoryEntry = { count: number; resetAt: number };

const memoryStore = new Map<string, MemoryEntry>();

function pruneMemory(now: number): void {
  if (memoryStore.size < 500) return;
  for (const [key, entry] of memoryStore) {
    if (now >= entry.resetAt) memoryStore.delete(key);
  }
}

function checkMemory(key: string, limit: number, windowMs: number, now: number): RateLimitResult {
  pruneMemory(now);
  let entry = memoryStore.get(key);
  if (!entry || now >= entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    memoryStore.set(key, entry);
  }
  entry.count += 1;
  if (entry.count > limit) {
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }
  return { allowed: true };
}

async function upstashIncr(key: string, windowSec: number): Promise<number | null> {
  const base = process.env.UPSTASH_REDIS_REST_URL?.replace(/\/$/, "");
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!base || !token) return null;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  try {
    const incrRes = await fetch(base, {
      method: "POST",
      headers,
      body: JSON.stringify(["INCR", key]),
      signal: AbortSignal.timeout(1500),
    });
    if (!incrRes.ok) return null;
    const incrJson = (await incrRes.json()) as { result?: number };
    const count = incrJson.result;
    if (typeof count !== "number") return null;

    if (count === 1) {
      await fetch(base, {
        method: "POST",
        headers,
        body: JSON.stringify(["EXPIRE", key, windowSec]),
        signal: AbortSignal.timeout(1500),
      });
    }
    return count;
  } catch {
    return null;
  }
}

export async function checkRateLimit(
  bucket: string,
  ip: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const key = `rl:${bucket}:${ip}`;

  const count = await upstashIncr(key, windowSec);
  if (count != null) {
    if (count > limit) {
      return { allowed: false, retryAfterSec: windowSec };
    }
    return { allowed: true };
  }

  return checkMemory(key, limit, windowMs, Date.now());
}
