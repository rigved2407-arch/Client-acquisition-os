import { ENV } from "./_core/env";
import type { Express, Request, Response } from "express";
import { sdk } from "./_core/sdk";
import { getDeliverySettings, listDueAutomationTasks, markAutomationTaskAttempt, markAutomationTaskBlocked, markAutomationTaskFailed, markAutomationTaskSent } from "./db";

type DeliverySummary = { scanned: number; sent: number; blocked: number; failed: number; skipped: number };

type TaskPayload = { channel?: "email" | "sms" | "task"; subject?: string | null; body?: string; sequenceName?: string };

function parsePayload(value: string | null): TaskPayload {
  if (!value) return {};
  try { return JSON.parse(value) as TaskPayload; } catch { return {}; }
}

function renderTemplate(value: string, lead: { id: number; name: string; email: string }) {
  const baseUrl = process.env.PUBLIC_APP_URL || "";
  return value.replaceAll("{{name}}", lead.name).replaceAll("{{booking_link}}", `${baseUrl}/book?leadId=${lead.id}`).replaceAll("{{coach_name}}", ENV.ownerName || "Your coach");
}

async function sendWithResend(input: { to: string; from: string; subject: string; text: string }) {
  if (!ENV.resendApiKey) throw new Error("Resend is not configured: add RESEND_API_KEY to the project secrets.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${ENV.resendApiKey}`, "content-type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!response.ok) throw new Error(`Resend returned ${response.status}: ${(await response.text()).slice(0, 300)}`);
  const result = await response.json() as { id?: string };
  return result.id;
}

export async function processDueAutomationTasks(ownerOpenId = ENV.ownerOpenId): Promise<DeliverySummary> {
  const settings = await getDeliverySettings(ownerOpenId);
  const due = await listDueAutomationTasks();
  const summary: DeliverySummary = { scanned: due.length, sent: 0, blocked: 0, failed: 0, skipped: 0 };

  for (const item of due) {
    const payload = parsePayload(item.task.payload);
    const channel = payload.channel || (item.task.type.endsWith(":email") ? "email" : item.task.type.endsWith(":sms") ? "sms" : "task");
    if (channel === "task") { summary.skipped += 1; continue; }
    if (item.lead.automationPaused) {
      await markAutomationTaskBlocked(item.task.id, "Delivery blocked: follow-up automation is paused for this lead.");
      summary.blocked += 1;
      continue;
    }
    if (!item.lead.consentAt) {
      await markAutomationTaskBlocked(item.task.id, "Delivery blocked: lead consent is missing.");
      summary.blocked += 1;
      continue;
    }
    if (!settings.enabled || settings.provider === "none") {
      await markAutomationTaskBlocked(item.task.id, "Delivery blocked: no provider is enabled. Connect Resend or Gmail first.");
      summary.blocked += 1;
      continue;
    }
    if (settings.provider === "gmail" || channel === "sms") {
      await markAutomationTaskBlocked(item.task.id, channel === "sms" ? "SMS delivery requires a configured SMS provider." : "Gmail delivery adapter is not enabled yet.");
      summary.blocked += 1;
      continue;
    }
    const attempts = item.task.attempts + 1;
    await markAutomationTaskAttempt(item.task.id, attempts);
    try {
      const body = renderTemplate(payload.body || "Thanks for your interest. A coach will be in touch shortly.", item.lead);
      const subject = renderTemplate(payload.subject || "Your next step", item.lead);
      const providerId = await sendWithResend({ to: item.lead.email, from: settings.fromEmail || ENV.resendFromEmail || "onboarding@resend.dev", subject, text: body });
      await markAutomationTaskSent(item.task.id, providerId);
      summary.sent += 1;
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Delivery provider failed.";
      if (attempts >= 3) await markAutomationTaskFailed(item.task.id, reason);
      summary.failed += 1;
    }
  }
  return summary;
}

export function registerDeliveryRoutes(app: Express) {
  app.post("/api/scheduled/process-delivery", async (req: Request, res: Response) => {
    try {
      const user = await sdk.authenticateRequest(req);
      if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
      const summary = await processDueAutomationTasks(ENV.ownerOpenId);
      return res.json({ ok: true, taskUid: user.taskUid, summary });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return res.status(500).json({ error: message, timestamp: new Date().toISOString() });
    }
  });
}
