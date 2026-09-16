import crypto from "node:crypto";
import type { Express, Request } from "express";
import { getCalendarConnection, saveCalendarConnection } from "./db";
import { ENV } from "./_core/env";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const CALENDAR_API_URL = "https://www.googleapis.com/calendar/v3";
const CALLBACK_PATH = "/api/calendar/google/callback";
const CALENDAR_SCOPES = ["https://www.googleapis.com/auth/calendar.readonly", "https://www.googleapis.com/auth/calendar.events"];

type GoogleTokens = { access_token: string; refresh_token?: string; expires_in?: number };
type GoogleEvent = { id: string; summary?: string; start?: { dateTime?: string; date?: string }; end?: { dateTime?: string; date?: string } };

function secretKey() {
  if (!ENV.cookieSecret) throw new Error("JWT_SECRET is required for calendar token encryption");
  return crypto.createHash("sha256").update(ENV.cookieSecret).digest();
}

function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", secretKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

function decrypt(value: string) {
  const [ivPart, tagPart, encryptedPart] = value.split(".");
  const decipher = crypto.createDecipheriv("aes-256-gcm", secretKey(), Buffer.from(ivPart, "base64url"));
  decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedPart, "base64url")), decipher.final()]).toString("utf8");
}

function redirectUri(req: Request) {
  const forwardedProto = req.get("x-forwarded-proto") || req.protocol;
  const forwardedHost = req.get("x-forwarded-host") || req.get("host");
  return `${forwardedProto}://${forwardedHost}${CALLBACK_PATH}`;
}

function signState(ownerOpenId: string) {
  const payload = Buffer.from(JSON.stringify({ ownerOpenId, nonce: crypto.randomBytes(16).toString("hex") })).toString("base64url");
  const signature = crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyState(state: string) {
  const [payload, signature] = state.split(".");
  if (!payload || !signature) throw new Error("Invalid calendar OAuth state");
  const expected = crypto.createHmac("sha256", ENV.cookieSecret).update(payload).digest("base64url");
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) throw new Error("Invalid calendar OAuth state");
  const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { ownerOpenId: string };
  if (!parsed.ownerOpenId) throw new Error("Calendar OAuth owner missing");
  return parsed.ownerOpenId;
}

export function getGoogleConnectUrl(req: Request, ownerOpenId: string) {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", redirectUri(req));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("scope", CALENDAR_SCOPES.join(" "));
  url.searchParams.set("state", signState(ownerOpenId));
  return url.toString();
}

async function tokenRequest(body: Record<string, string>) {
  const response = await fetch(GOOGLE_TOKEN_URL, { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams(body) });
  const payload = await response.json() as GoogleTokens & { error?: string; error_description?: string };
  if (!response.ok) throw new Error(payload.error_description || payload.error || "Google token request failed");
  return payload;
}

async function accessTokenFor(ownerOpenId: string) {
  const connection = await getCalendarConnection(ownerOpenId);
  if (!connection) throw new Error("Google Calendar is not connected");
  if (connection.tokenExpiresAt.getTime() > Date.now() + 60_000) return { accessToken: decrypt(connection.accessToken), calendarId: connection.calendarId };
  const tokens = await tokenRequest({ client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", refresh_token: decrypt(connection.refreshToken), grant_type: "refresh_token" });
  await saveCalendarConnection({ ownerOpenId, provider: "google", calendarId: connection.calendarId, calendarName: connection.calendarName, accessToken: encrypt(tokens.access_token), refreshToken: connection.refreshToken, tokenExpiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000) });
  return { accessToken: tokens.access_token, calendarId: connection.calendarId };
}

async function calendarFetch<T>(path: string, accessToken: string, init?: RequestInit) {
  const response = await fetch(`${CALENDAR_API_URL}${path}`, { ...init, headers: { authorization: `Bearer ${accessToken}`, "content-type": "application/json", ...(init?.headers || {}) } });
  const payload = await response.json() as T & { error?: { message?: string } };
  if (!response.ok) throw new Error(payload.error?.message || "Google Calendar request failed");
  return payload;
}

export async function listBusyEvents(ownerOpenId: string, timeMin: string, timeMax: string) {
  const { accessToken, calendarId } = await accessTokenFor(ownerOpenId);
  const params = new URLSearchParams({ timeMin, timeMax, singleEvents: "true", orderBy: "startTime", maxResults: "2500" });
  const payload = await calendarFetch<{ items?: GoogleEvent[] }>(`/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`, accessToken);
  return (payload.items || []).map((event) => ({ id: event.id, summary: event.summary || "Busy", start: event.start?.dateTime || event.start?.date, end: event.end?.dateTime || event.end?.date }));
}

export async function createGoogleEvent(ownerOpenId: string, input: { calendarId?: string; summary: string; description: string; startsAt: string; endsAt: string; attendeeName: string; attendeeEmail: string }) {
  const { accessToken, calendarId } = await accessTokenFor(ownerOpenId);
  const payload = await calendarFetch<{ id: string; htmlLink?: string; hangoutLink?: string }>(`/calendars/${encodeURIComponent(input.calendarId || calendarId)}/events?sendUpdates=all&conferenceDataVersion=1`, accessToken, { method: "POST", body: JSON.stringify({ summary: input.summary, description: input.description, start: { dateTime: input.startsAt }, end: { dateTime: input.endsAt }, attendees: [{ displayName: input.attendeeName, email: input.attendeeEmail }], conferenceData: { createRequest: { requestId: `coachflow-${Date.now()}`, conferenceSolutionKey: { type: "hangoutsMeet" } } } }) });
  return payload;
}

export function registerGoogleCalendarRoutes(app: Express) {
  app.get(CALLBACK_PATH, async (req, res) => {
    try {
      const code = String(req.query.code || "");
      const state = String(req.query.state || "");
      if (!code || !state) throw new Error("Google did not return an authorization code");
      const ownerOpenId = verifyState(state);
      const tokens = await tokenRequest({ code, client_id: process.env.GOOGLE_CLIENT_ID || "", client_secret: process.env.GOOGLE_CLIENT_SECRET || "", redirect_uri: redirectUri(req), grant_type: "authorization_code" });
      if (!tokens.refresh_token) throw new Error("Google did not return a refresh token; revoke the prior CoachFlow grant and reconnect.");
      await saveCalendarConnection({ ownerOpenId, provider: "google", calendarId: "primary", calendarName: "Google Calendar", accessToken: encrypt(tokens.access_token), refreshToken: encrypt(tokens.refresh_token), tokenExpiresAt: new Date(Date.now() + (tokens.expires_in || 3600) * 1000) });
      res.redirect("/?calendar=connected");
    } catch (error) {
      console.error("[Google Calendar] OAuth callback failed", error);
      res.status(400).send("Google Calendar connection failed. Please return to CoachFlow and try again.");
    }
  });
}
