import { ENV } from "./_core/env";

function getSecret(): string {
  const secret = ENV.cookieSecret;
  if (!secret) throw new Error("SIGNING_SECRET is not configured: set JWT_SECRET.");
  return secret;
}

export async function createSignedBookingToken(leadId: number, expiresAtMs: number): Promise<string> {
  const payload = `${leadId}:${expiresAtMs}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return `${payload}.${Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")}`;
}

export async function verifySignedBookingToken(token: string): Promise<{ leadId: number; valid: boolean }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return { leadId: 0, valid: false };
    const [leadIdStr, expiresAtStr, sigHex] = parts;
    const leadId = Number(leadIdStr);
    const expiresAtMs = Number(expiresAtStr);
    if (!leadId || !expiresAtMs) return { leadId: 0, valid: false };
    if (Date.now() > expiresAtMs) return { leadId, valid: false };

    const payload = `${leadIdStr}:${expiresAtStr}`;
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", encoder.encode(getSecret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const expected = Array.from(new Uint8Array(sigBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
    return { leadId, valid: sigHex === expected };
  } catch {
    return { leadId: 0, valid: false };
  }
}

export async function createBookingUrl(leadId: number, baseUrl?: string): Promise<string> {
  const expiresAtMs = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const token = await createSignedBookingToken(leadId, expiresAtMs);
  const base = baseUrl || process.env.PUBLIC_APP_URL || "http://localhost:3000";
  return `${base}/book?token=${token}`;
}
