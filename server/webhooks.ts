import crypto from "node:crypto";
import type { Express } from "express";
import { invokeLLM } from "./_core/llm";
import { createAutomationTask, createLead, createLeadActivity, getLeadByEmail, getWebhookSourceByHash, touchWebhookSource, updateLeadQualification } from "./db";

type NormalizedLead = { name: string; email: string; company?: string; instagramHandle?: string; goal: string; consent: boolean };

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
  const name = valueFor(fields, ["full name", "your name", "name", "first name"]);
  const goal = valueFor(fields, ["goal", "challenge", "help", "what", "outcome", "fitness"]);
  const company = valueFor(fields, ["company", "business", "brand"]) || undefined;
  const instagramHandle = valueFor(fields, ["instagram", "ig handle", "social"]) || undefined;
  const consentValue = valueFor(fields, ["consent", "permission", "agree", "contact"]) || "";
  if (!email || !name || !goal) throw new Error("Form payload must include name, email, and goal fields");
  return { name, email: email.toLowerCase(), company, instagramHandle, goal, consent: !consentValue || ["yes", "true", "1", "agree", "i agree"].some((value) => consentValue.toLowerCase().includes(value)) };
}

async function qualify(input: NormalizedLead) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Qualify a fitness-coaching inbound lead. Return only JSON. Score fit and intent from 0 to 100. Use qualified when the person has a specific goal, clear motivation, and a plausible near-term need. Use nurture when the submission is vague or low-intent." },
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

export function registerWebhookRoutes(app: Express) {
  app.post("/api/webhooks/:token", async (req, res) => {
    try {
      const source = await getWebhookSourceByHash(hashToken(req.params.token));
      if (!source || !source.enabled) return res.status(404).json({ error: "Webhook not found" });
      const input = normalizeFormPayload(req.body);
      if (!input.consent) return res.status(202).json({ ok: true, status: "ignored_without_contact_consent" });
      await touchWebhookSource(source.id);
      const existing = await getLeadByEmail(input.email);
      if (existing) return res.status(200).json({ ok: true, duplicate: true, leadId: existing.id });
      const qualification = await qualify(input);
      const leadId = await createLead({ name: input.name, email: input.email, company: input.company, instagramHandle: input.instagramHandle, source: source.source, goal: input.goal, consentAt: new Date(), stage: "new", score: 0 });
      await updateLeadQualification(leadId, qualification.stage, qualification.score);
      await createLeadActivity({ leadId, type: "webhook", title: `${input.name} entered from ${source.source}`, description: `${qualification.summary} · ${qualification.score}/100 intent score` });
      await createAutomationTask({ leadId, type: "follow_up_email", status: "pending", sendAt: new Date(Date.now() + 5 * 60 * 1000), payload: JSON.stringify({ reason: qualification.stage === "qualified" ? "qualified_lead" : "new_lead", source: source.source }) });
      return res.status(201).json({ ok: true, leadId, stage: qualification.stage, score: qualification.score });
    } catch (error) {
      console.error("[Webhook] Lead intake failed", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Invalid form payload" });
    }
  });
}
