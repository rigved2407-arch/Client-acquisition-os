import type { Request, Response, NextFunction } from "express";

type RateLimitEntry = { count: number; resetAt: number };

const store = new Map<string, RateLimitEntry>();

function getBucket(key: string, windowMs: number): RateLimitEntry {
  const now = Date.now();
  const existing = store.get(key);
  if (existing && existing.resetAt > now) return existing;
  const entry: RateLimitEntry = { count: 0, resetAt: now + windowMs };
  store.set(key, entry);
  return entry;
}

export function rateLimit(options: { windowMs?: number; max?: number; keyPrefix?: string } = {}) {
  const windowMs = options.windowMs ?? 60_000;
  const max = options.max ?? 30;
  const prefix = options.keyPrefix ?? "rl";

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${prefix}:${ip}`;
    const bucket = getBucket(key, windowMs);
    bucket.count += 1;

    const remaining = Math.max(0, max - bucket.count);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);
    res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > max) {
      const retryAfter = Math.ceil((bucket.resetAt - Date.now()) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ error: "Too many requests. Please try again later." });
    }
    next();
  };
}

export function cleanupStaleEntries() {
  const now = Date.now();
  const keys: string[] = [];
  store.forEach((entry, key) => {
    if (entry.resetAt <= now) keys.push(key);
  });
  for (const key of keys) store.delete(key);
}

setInterval(cleanupStaleEntries, 5 * 60_000);
