import crypto from "node:crypto";
import type { Express } from "express";
import { invokeLLM } from "./_core/llm";
import { createAutomationTask, createLead, createLeadActivity, getLeadByEmail, getLeadByPhone, getWebhookSourceByHash, listEnabledFollowUpSequences, pauseLeadAutomation, recordLeadReply, touchWebhookSource, unsubscribeLead, updateLeadQualification } from "./db";
import { ENV } from "./_core/env";
import { rateLimit } from "./rateLimit";

type NormalizedLead = { name: string; email: string; phone?: string; company?: string; instagramHandle?: string; goal: string; consent: boolean; consentText?: string };

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function flattenPayload(payload: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  const visit = (value: unknown, hint = "") => {
    if (Array.isArray(value)) return value.forEach((item) => visit(item, hint));
    if (!value || typeof value !== "object") {
      if (hint && value !== undefined && value !== null) result[hint.toLowerCase()] = String(value);
      return;
    }
    const record = value as Record<string, unknown>;
    const fieldRef = record.field && typeof record.field === "object" && typeof (record.field as Record<string, unknown>).ref === "string" ? String((record.field as Record<string, unknown>).ref) : "";
    const localHint = fieldRef ? `${hint} ${fieldRef}`.trim() : hint;
    for (const [key, child] of Object.entries(record)) {
      if (key === "field") continue;
      if (key === "answers" || key === "fields" || key === "questions") visit(child, hint);
      else visit(child, localHint ? `${localHint} ${key}` : key);
    }
  };
  visit(payload);
  return result;
}

function valueFor(fields: Record<string, string>, candidates: string[]) {
  const entry = Object.entries(fields).find(([key, value]) => candidates.some((candidate) => key.includes(candidate)) && value.trim());
  return entry?.[1]?.trim();
}

export function normalizeFormPayload(payload: unknown): NormalizedLead {
  const fields = flattenPayload(payload);
  const email = valueFor(fields, ["email", "e-mail"]);
  const phone = valueFor(fields, ["phone", "mobile", "whatsapp", "telephone"]) || undefined;
  const name = valueFor(fields, ["full name", "your name", "name", "first name"]);
  const goal = valueFor(fields, ["goal", "challenge", "help", "what", "outcome", "fitness"]);
  const company = valueFor(fields, ["company", "business", "brand"]) || undefined;
  const instagramHandle = valueFor(fields, ["instagram", "ig handle", "social"]) || undefined;
  const consentValue = valueFor(fields, ["consent", "permission", "agree", "contact"]) || "";
  if (!email || !name || !goal) throw new Error("Form payload must include name, email, and goal fields");
  return { name, email: email.toLowerCase(), phone, company, instagramHandle, goal, consent: !consentValue || ["yes", "true", "1", "agree", "i agree"].some((value) => consentValue.toLowerCase().includes(value)), consentText: consentValue || undefined };
}

async function qualify(input: NormalizedLead) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Qualify a fitness-coaching inbound lead. Score fit and intent from 0 to 100. Use qualified when the person has a specific transformation goal (weight loss, muscle gain, athletic performance, habit change), clear motivation, and a plausible near-term need. Use nurture when the submission is vague, low-intent, or lacks a concrete goal. Consider past attempts, timeline urgency, and readiness to invest. Never make promises. Return only JSON." },
        { role: "user", content: JSON.stringify(input) },
      ],
      response_format: { type: "json_schema", json_schema: { name: "form_lead_qualification", strict: true, schema: { type: "object", properties: { score: { type: "integer" }, stage: { type: "string", enum: ["qualified", "nurture"] }, summary: { type: "string" } }, required: ["score", "stage", "summary"], additionalProperties: false } } },
    });
    const parsed = JSON.parse(typeof response.choices?.[0]?.message?.content === "string" ? response.choices[0].message.content : "{}");
    return { score: Math.max(0, Math.min(100, Number(parsed.score) || 0)), stage: parsed.stage === "qualified" ? "qualified" as const : "nurture" as const, summary: String(parsed.summary || "Lead qualification completed.") };
  } catch {
    return { score: 50, stage: "nurture" as const, summary: "AI qualification was unavailable; the lead is queued for manual review." };
  }
}

export function createWebhookToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export function tokenHash(token: string) {
  return hashToken(token);
}

export function normalizeReplyPayload(payload: unknown) {
  const body = (payload && typeof payload === "object" ? payload : {}) as Record<string, unknown>;
  const nested = (body.data && typeof body.data === "object" ? body.data : body) as Record<string, unknown>;
  const from = String(nested.from || nested.sender || nested.email || nested.replyTo || "");
  const email = from.match(/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/)?.[0]?.toLowerCase();
  const phone = String(nested.phone || (email ? "" : from)).replace(/[^+\d]/g, "");
  const message = String(nested.text || nested.body || nested.content || nested.message || "Inbound reply received").trim();
  const channel = String(nested.channel || "email").toLowerCase() === "sms" ? "sms" as const : "email" as const;
  if (!email && phone.length < 7) throw new Error("Reply payload must include a sender email or phone number");
  return { email, phone: phone || undefined, message, channel };
}

export function registerWebhookRoutes(app: Express) {
  app.post("/api/webhooks/replies", rateLimit({ windowMs: 60_000, max: 60, keyPrefix: "webhook:reply" }), async (req, res) => {
    try {
      if (!ENV.replyWebhookSecret) return res.status(503).json({ error: "Reply webhook is not configured" });
      const provided = String(req.header("x-coachflow-webhook-secret") || req.header("authorization") || "").replace(/^Bearer\s+/i, "");
      const expected = Buffer.from(ENV.replyWebhookSecret);
      const actual = Buffer.from(provided);
      if (actual.length !== expected.length || !crypto.timingSafeEqual(actual, expected)) return res.status(401).json({ error: "Invalid webhook signature" });
      const { email, phone, message, channel } = normalizeReplyPayload(req.body);
      const lead = email ? await getLeadByEmail(email) : phone ? await getLeadByPhone(phone) : undefined;
      if (!lead) return res.status(202).json({ ok: true, ignored: "sender_not_in_pipeline" });
      if (/\b(stop|unsubscribe|remove me|do not contact|don't contact)\b/i.test(message)) {
        await unsubscribeLead(lead.id, "Unsubscribe request received in inbound reply.");
        return res.status(200).json({ ok: true, leadId: lead.id, automation: "stopped", unsubscribed: true });
      }
      await recordLeadReply(lead.id, message, channel);
      return res.status(200).json({ ok: true, leadId: lead.id, automation: "paused" });
    } catch (error) {
      console.error("[Webhook] Reply processing failed", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid reply payload" });
    }
  });
  app.post("/api/webhooks/resend", async (req, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const eventType = String(body.type || "");
      const data = (body.data && typeof body.data === "object" ? body.data : {}) as Record<string, unknown>;
      if (!["email.bounced", "email.complained", "email.opened", "email.clicked"].includes(eventType)) {
        return res.status(200).json({ ok: true, ignored: eventType });
      }
      const email = String(data.email || data.to || "").toLowerCase();
      if (!email) return res.status(200).json({ ok: true, ignored: "no_email" });
      const lead = await getLeadByEmail(email);
      if (!lead) return res.status(200).json({ ok: true, ignored: "lead_not_found" });
      if (eventType === "email.bounced") {
        await pauseLeadAutomation(lead.id, true);
        await createLeadActivity({ ownerOpenId: lead.ownerOpenId, leadId: lead.id, type: "email_bounced", title: "Email bounced", description: `Email ${email} bounced during delivery` });
        return res.status(200).json({ ok: true, leadId: lead.id, action: "automation_paused" });
      }
      if (eventType === "email.complained") {
        await unsubscribeLead(lead.id, "Email complaint received via Resend webhook");
        return res.status(200).json({ ok: true, leadId: lead.id, action: "unsubscribed" });
      }
      await createLeadActivity({ ownerOpenId: lead.ownerOpenId, leadId: lead.id, type: eventType === "email.opened" ? "email_opened" : "email_clicked", title: eventType === "email.opened" ? "Email opened" : "Email link clicked", description: `Resend webhook: ${eventType}` });
      return res.status(200).json({ ok: true, leadId: lead.id, action: "activity_recorded" });
    } catch (error) {
      console.error("[Webhook] Resend processing failed", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid Resend payload" });
    }
  });

  app.post("/api/webhooks/:token", rateLimit({ windowMs: 60_000, max: 30, keyPrefix: "webhook:form" }), async (req, res) => {
    try {
      const source = await getWebhookSourceByHash(hashToken(req.params.token));
      if (!source || !source.enabled) return res.status(404).json({ error: "Webhook not found" });
      const input = normalizeFormPayload(req.body);
      if (!input.consent) return res.status(202).json({ ok: true, status: "ignored_without_contact_consent" });
      await touchWebhookSource(source.id);
      const existing = await getLeadByEmail(input.email);
      if (existing) return res.status(200).json({ ok: true, duplicate: true, leadId: existing.id });
      const qualification = await qualify(input);
      const leadId = await createLead({ name: input.name, email: input.email, phone: input.phone, company: input.company, instagramHandle: input.instagramHandle, source: source.source, goal: input.goal, consentAt: new Date(), consentSource: source.source, consentText: input.consentText, ownerOpenId: source.ownerOpenId, stage: "new", score: 0 });
      await updateLeadQualification(leadId, qualification.stage, qualification.score);
      await createLeadActivity({ ownerOpenId: source.ownerOpenId, leadId, type: "webhook", title: `${input.name} entered from ${source.source}`, description: `${qualification.summary} · ${qualification.score}/100 intent score` });
      const trigger = qualification.stage === "qualified" ? "qualified" : "new_lead";
      const sequences = await listEnabledFollowUpSequences(source.ownerOpenId, trigger);
      const steps = sequences.flatMap((sequence) => sequence.steps.map((step) => ({ ...step, sequenceName: sequence.name })));
      if (steps.length) {
        for (const step of steps) {
          await createAutomationTask({ leadId, type: `${step.sequenceName}:${step.channel}`, status: "pending", sendAt: new Date(Date.now() + step.delayMinutes * 60 * 1000), payload: JSON.stringify({ sequenceName: step.sequenceName, subject: step.subject, body: step.body, channel: step.channel, source: source.source }) });
        }
      } else {
        await createAutomationTask({ leadId, type: "follow_up_sms", status: "pending", sendAt: new Date(Date.now() + 5 * 60 * 1000), payload: JSON.stringify({ channel: "sms", reason: trigger, source: source.source }) });
      }
      return res.status(201).json({ ok: true, leadId, stage: qualification.stage, score: qualification.score });
    } catch (error) {
      console.error("[Webhook] Lead intake failed", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid form payload" });
    }
  });


}
