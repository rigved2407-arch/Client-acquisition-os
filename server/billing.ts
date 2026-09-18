import type { Express } from "express";
import { eq } from "drizzle-orm";
import { ENV } from "./_core/env";
import { getDb } from "./db";
import { billing } from "../drizzle/schema";

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  starter: { monthly: "price_starter_monthly", yearly: "price_starter_yearly" },
  pro: { monthly: "price_pro_monthly", yearly: "price_pro_yearly" },
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
  const baseUrl = process.env.PUBLIC_APP_URL || "http://localhost:3000";
  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: stripeHeaders(),
    body: new URLSearchParams({
      mode: "subscription",
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": "1",
      success_url: `${baseUrl}/settings?billing=success`,
      cancel_url: `${baseUrl}/settings?billing=cancel`,
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
    body: new URLSearchParams({ customer: customer.stripeCustomerId, return_url: `${baseUrl}/settings` }),
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
  app.post("/api/webhooks/stripe", async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];
      if (!sig || !ENV.stripeWebhookSecret) return res.status(400).json({ error: "Missing stripe-signature" });
      const body = JSON.stringify(req.body);
      const timestamp = req.headers["stripe-timestamp"] as string;
      const payload = `${timestamp}.${body}`;
      const encoder = new TextEncoder();
      const key = await crypto.subtle.importKey("raw", encoder.encode(ENV.stripeWebhookSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
      const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
      const expectedSig = Array.from(new Uint8Array(signatureBuffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
      if (sig !== `t=${expectedSig}`) return res.status(400).json({ error: "Invalid signature" });

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
        const priceId = Array.isArray(obj.items) && obj.items[0] ? String((obj.items[0] as Record<string, unknown>).price || "") : undefined;
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
