import crypto from "node:crypto";
import type { Express } from "express";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { billing } from "../drizzle/schema";
import { rateLimit } from "./rateLimit";

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  starter: { monthly: ENV.stripePriceStarterMonthly, yearly: ENV.stripePriceStarterYearly },
  pro: { monthly: ENV.stripePriceProMonthly, yearly: ENV.stripePriceProYearly },
};

function stripeHeaders() {
  if (!ENV.stripeSecretKey) throw new Error("Stripe is not configured: add STRIPE_SECRET_KEY.");
  return { authorization: `Bearer ${ENV.stripeSecretKey}`, "content-type": "application/json" };
}

export async function getBilling(ownerOpenId: string) {
  const db = await getDb();
  if (!db) return { status: "none" as const, stripeCustomerId: null, stripePriceId: null, currentPeriodEnd: null };
  const result = await db.select().from(billing).where(eq(billing.ownerOpenId, ownerOpenId)).limit(1);
  return result[0] ?? { status: "none" as const, stripeCustomerId: null, stripePriceId: null, currentPeriodEnd: null };
}

export async function createCheckoutSession(input: { ownerOpenId: string; plan: string; interval: "monthly" | "yearly"; email: string }) {
  const prices = PLAN_PRICES[input.plan];
  if (!prices) throw new Error(`Unknown plan: ${input.plan}`);
  const priceId = prices[input.interval];
  if (!priceId) throw new Error("Stripe price IDs are not configured for this plan.");
  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: stripeHeaders(),
    body: new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${baseUrl}/onboarding?billing=success`,
      cancel_url: `${baseUrl}/onboarding?billing=cancel`,
      "metadata[ownerOpenId]": input.ownerOpenId,
      "metadata[plan]": input.plan,
      customer_email: input.email,
    }),
  });
  if (!response.ok) throw new Error(`Stripe checkout failed: ${response.status}`);
  const session = await response.json() as { id?: string; url?: string };
  return { sessionId: session.id, url: session.url };
}

export async function createPortalSession(ownerOpenId: string) {
  const customer = await getBilling(ownerOpenId);
  if (!customer.stripeCustomerId) throw new Error("No Stripe customer found. Create a checkout session first.");
  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch("https://api.stripe.com/v1/billing_portal/sessions", {
    method: "POST",
    headers: stripeHeaders(),
    body: new URLSearchParams({ customer: customer.stripeCustomerId, return_url: `${baseUrl}/onboarding` }),
  });
  if (!response.ok) throw new Error(`Stripe portal failed: ${response.status}`);
  const session = await response.json() as { url?: string };
  return { url: session.url };
}

async function upsertBilling(input: { ownerOpenId: string; stripeCustomerId?: string; stripeSubscriptionId?: string; stripePriceId?: string; status: "active" | "trialing" | "past_due" | "canceled" | "none"; currentPeriodEnd?: Date }) {
  const db = await getDb();
  if (!db) return;
  const { ownerOpenId, ...updates } = input;
  await db.insert(billing).values(input).onDuplicateKeyUpdate({ set: { ...updates, updatedAt: new Date() } });
}

function extractOwnerOpenId(metadata: Record<string, string | null> | undefined): string | null {
  return metadata?.ownerOpenId ?? null;
}

export function registerStripeWebhook(app: Express) {
  app.post("/api/webhooks/stripe", rateLimit({ windowMs: 60_000, max: 120, keyPrefix: "webhook:stripe" }), async (req, res) => {
    try {
      const signatureHeader = String(req.headers["stripe-signature"] || "");
      const rawBody = (req as Express.Request & { rawBody?: Buffer }).rawBody;
      if (!signatureHeader || !ENV.stripeWebhookSecret || !rawBody) return res.status(400).json({ error: "Missing Stripe webhook signature or raw body" });
      const parts = Object.fromEntries(signatureHeader.split(",").map((part) => part.split("=", 2))) as Record<string, string>;
      const timestamp = parts.t;
      const signature = parts.v1;
      if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return res.status(400).json({ error: "Invalid or expired Stripe signature" });
      const expectedSig = crypto.createHmac("sha256", ENV.stripeWebhookSecret).update(`${timestamp}.${rawBody.toString("utf8")}`).digest("hex");
      const expected = Buffer.from(expectedSig, "hex");
      const actual = Buffer.from(signature, "hex");
      if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) return res.status(400).json({ error: "Invalid signature" });

      const event = req.body as { type?: string; data?: { object?: Record<string, unknown> } };
      const eventType = event.type;
      const obj = (event.data?.object ?? {}) as Record<string, unknown>;
      const metadata = obj.metadata as Record<string, string | null> | undefined;
      const ownerOpenId = extractOwnerOpenId(metadata);

      if (eventType === "checkout.session.completed" && ownerOpenId) {
        const customerId = String(obj.customer || "");
        const subscriptionId = String(obj.subscription || "");
        await upsertBilling({ ownerOpenId, stripeCustomerId: customerId, stripeSubscriptionId: subscriptionId, status: "active" });
      } else if (eventType === "customer.subscription.updated" && ownerOpenId) {
        const status = String(obj.status || "active") as "active" | "trialing" | "past_due" | "canceled";
        const currentPeriodEnd = obj.current_period_end ? new Date(Number(obj.current_period_end) * 1000) : undefined;
        const items = obj.items as { data?: Array<Record<string, unknown>> } | undefined;
        const firstItem = items?.data?.[0];
        const price = firstItem?.price as Record<string, unknown> | undefined;
        const priceId = price?.id ? String(price.id) : undefined;
        await upsertBilling({ ownerOpenId, status: status === "active" || status === "trialing" ? status : status === "past_due" ? "past_due" : "canceled", currentPeriodEnd, stripePriceId: priceId });
      } else if (eventType === "customer.subscription.deleted" && ownerOpenId) {
        await upsertBilling({ ownerOpenId, status: "canceled" });
      }

      return res.json({ received: true });
    } catch (error) {
      console.error("[Stripe Webhook] Error:", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Webhook error" });
    }
  });
}
