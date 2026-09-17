import { and, asc, desc, eq, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { activities, Activity, appointments, automationTasks, calendarConnections, chatMessages, chatSessions, ChatSession, deliverySettings, followUpSequences, followUpSteps, InsertLead, InsertUser, leads, users, webhookSources } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  values.lastSignedIn ??= new Date();
  updateSet.lastSignedIn ??= new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getLeads(limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(leads).orderBy(desc(leads.lastActivityAt)).limit(limit);
}

export async function getConversionAnalytics() {
  const items = await getLeads(1000);
  const sourceMap = new Map<string, { source: string; leads: number; qualified: number; booked: number; won: number }>();
  for (const lead of items) {
    const row = sourceMap.get(lead.source) ?? { source: lead.source, leads: 0, qualified: 0, booked: 0, won: 0 };
    row.leads += 1;
    if (["qualified", "booked", "won"].includes(lead.stage)) row.qualified += 1;
    if (["booked", "won"].includes(lead.stage)) row.booked += 1;
    if (lead.stage === "won") row.won += 1;
    sourceMap.set(lead.source, row);
  }
  return { total: items.length, qualified: items.filter((lead) => ["qualified", "booked", "won"].includes(lead.stage)).length, booked: items.filter((lead) => ["booked", "won"].includes(lead.stage)).length, won: items.filter((lead) => lead.stage === "won").length, replied: items.filter((lead) => Boolean(lead.replyAt)).length, unsubscribed: items.filter((lead) => Boolean(lead.unsubscribedAt)).length, bySource: Array.from(sourceMap.values()).sort((a, b) => b.leads - a.leads) };
}

export async function getActivities(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(activities).orderBy(desc(activities.createdAt)).limit(limit);
}

export async function createLead(input: InsertLead) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(leads).values(input);
  return Number(result[0].insertId);
}

export async function updateLeadQualification(leadId: number, stage: "new" | "qualified" | "nurture", score: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(leads).set({ stage, score, lastActivityAt: new Date() }).where(eq(leads.id, leadId));
}

export async function updateLeadStage(leadId: number, stage: "new" | "qualified" | "booked" | "won" | "nurture") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(leads).set({ stage, lastActivityAt: new Date() }).where(eq(leads.id, leadId));
}

export async function recordLeadReply(leadId: number, message: string, channel = "email") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  await db.update(leads).set({ replyAt: now, automationPaused: true, lastActivityAt: now }).where(eq(leads.id, leadId));
  await db.update(automationTasks).set({ status: "cancelled", lastError: `Cancelled after ${channel} reply.`, updatedAt: now }).where(and(eq(automationTasks.leadId, leadId), eq(automationTasks.status, "pending")));
  await db.insert(activities).values({ leadId, type: "reply", title: `${channel === "sms" ? "SMS" : "Email"} reply received`, description: message.slice(0, 500) });
}

export async function unsubscribeLead(leadId: number, reason = "Lead requested no further contact.") {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const now = new Date();
  await db.update(leads).set({ unsubscribedAt: now, automationPaused: true, lastActivityAt: now }).where(eq(leads.id, leadId));
  await db.update(automationTasks).set({ status: "cancelled", lastError: reason, updatedAt: now }).where(and(eq(automationTasks.leadId, leadId), eq(automationTasks.status, "pending")));
  await db.insert(activities).values({ leadId, type: "unsubscribe", title: "Lead unsubscribed", description: reason });
}

export async function pauseLeadAutomation(leadId: number, paused: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(leads).set({ automationPaused: paused, lastActivityAt: new Date() }).where(eq(leads.id, leadId));
  if (paused) await db.update(automationTasks).set({ status: "cancelled", lastError: "Cancelled by operator.", updatedAt: new Date() }).where(and(eq(automationTasks.leadId, leadId), eq(automationTasks.status, "pending")));
  await db.insert(activities).values({ leadId, type: paused ? "automation_paused" : "automation_resumed", title: paused ? "Follow-up automation paused" : "Follow-up automation resumed", description: paused ? "Pending follow-ups were cancelled." : "New follow-ups may be scheduled." });
}

export async function createLeadActivity(input: { leadId: number; type: string; title: string; description: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(activities).values(input);
  return Number(result[0].insertId);
}

export async function getLeadById(leadId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(leads).where(eq(leads.id, leadId)).limit(1);
  return result[0];
}

export type ActivityRecord = Activity;

export async function getChatSession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(chatSessions).where(eq(chatSessions.id, sessionId)).limit(1);
  return result[0];
}

export async function createChatSession(sessionId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(chatSessions).values({ id: sessionId });
}

export async function updateChatSession(sessionId: string, input: Partial<Pick<ChatSession, "leadId" | "name" | "email" | "company" | "goal">>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(chatSessions).set(input).where(eq(chatSessions.id, sessionId));
}

export async function getChatMessages(sessionId: string, limit = 12) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(chatMessages).where(eq(chatMessages.sessionId, sessionId)).orderBy(asc(chatMessages.createdAt)).limit(limit);
}

export async function createChatMessage(input: { sessionId: string; role: "user" | "assistant"; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(chatMessages).values(input);
  return Number(result[0].insertId);
}

export async function getCalendarConnection(ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(calendarConnections).where(eq(calendarConnections.ownerOpenId, ownerOpenId)).limit(1);
  return result[0];
}

export async function saveCalendarConnection(input: typeof calendarConnections.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(calendarConnections).values(input).onDuplicateKeyUpdate({
    set: {
      provider: input.provider,
      calendarId: input.calendarId,
      calendarName: input.calendarName,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      tokenExpiresAt: input.tokenExpiresAt,
      updatedAt: new Date(),
    },
  });
}

export async function createAppointment(input: typeof appointments.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(appointments).values(input);
  return Number(result[0].insertId);
}

export async function getLeadByEmail(email: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(leads).where(eq(leads.email, email)).limit(1);
  return result[0];
}

export async function getLeadByPhone(phone: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(leads).where(eq(leads.phone, phone)).limit(1);
  return result[0];
}

export async function createWebhookSource(input: typeof webhookSources.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(webhookSources).values(input);
  return Number(result[0].insertId);
}

export async function listWebhookSources(ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(webhookSources).where(eq(webhookSources.ownerOpenId, ownerOpenId)).orderBy(desc(webhookSources.createdAt));
}

export async function getWebhookSourceByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(webhookSources).where(eq(webhookSources.tokenHash, tokenHash)).limit(1);
  return result[0];
}

export async function touchWebhookSource(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(webhookSources).set({ lastReceivedAt: new Date() }).where(eq(webhookSources.id, id));
}

export async function createAutomationTask(input: typeof automationTasks.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(automationTasks).values(input);
  return Number(result[0].insertId);
}

export async function listAutomationTasks(limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(automationTasks).orderBy(asc(automationTasks.sendAt)).limit(limit);
}

export async function listDueAutomationTasks(limit = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({ task: automationTasks, lead: leads }).from(automationTasks).innerJoin(leads, eq(automationTasks.leadId, leads.id)).where(and(eq(automationTasks.status, "pending"), lte(automationTasks.sendAt, new Date()))).orderBy(asc(automationTasks.sendAt)).limit(limit);
}

export async function getDeliverySettings(ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.select().from(deliverySettings).where(eq(deliverySettings.ownerOpenId, ownerOpenId)).limit(1);
  return result[0] ?? { ownerOpenId, provider: "none" as const, fromEmail: null, enabled: false };
}

export async function saveDeliverySettings(input: typeof deliverySettings.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(deliverySettings).values(input).onDuplicateKeyUpdate({ set: { provider: input.provider, fromEmail: input.fromEmail ?? null, enabled: input.enabled, updatedAt: new Date() } });
  return getDeliverySettings(input.ownerOpenId);
}

export async function markAutomationTaskBlocked(taskId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(automationTasks).set({ status: "blocked", lastError: reason, updatedAt: new Date() }).where(and(eq(automationTasks.id, taskId), eq(automationTasks.status, "pending")));
}

export async function markAutomationTaskAttempt(taskId: number, attempts: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(automationTasks).set({ attempts, updatedAt: new Date() }).where(and(eq(automationTasks.id, taskId), eq(automationTasks.status, "pending")));
}

export async function markAutomationTaskSent(taskId: number, providerMessageId?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(automationTasks).set({ status: "sent", deliveredAt: new Date(), providerMessageId: providerMessageId ?? null, lastError: null, updatedAt: new Date() }).where(and(eq(automationTasks.id, taskId), eq(automationTasks.status, "pending")));
}

export async function markAutomationTaskFailed(taskId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(automationTasks).set({ status: "failed", lastError: reason, updatedAt: new Date() }).where(and(eq(automationTasks.id, taskId), eq(automationTasks.status, "pending")));
}

export async function listFollowUpSequences(ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(followUpSequences).where(eq(followUpSequences.ownerOpenId, ownerOpenId)).orderBy(desc(followUpSequences.updatedAt));
}

export async function getFollowUpSequence(sequenceId: number, ownerOpenId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const sequence = await db.select().from(followUpSequences).where(eq(followUpSequences.id, sequenceId)).limit(1);
  if (!sequence[0] || sequence[0].ownerOpenId !== ownerOpenId) return undefined;
  const steps = await db.select().from(followUpSteps).where(eq(followUpSteps.sequenceId, sequenceId)).orderBy(asc(followUpSteps.position));
  return { ...sequence[0], steps };
}

export async function listEnabledFollowUpSequences(ownerOpenId: string, trigger: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const sequences = await db.select().from(followUpSequences).where(eq(followUpSequences.ownerOpenId, ownerOpenId)).orderBy(asc(followUpSequences.id));
  const enabled = sequences.filter((sequence) => sequence.enabled && sequence.trigger === trigger);
  return Promise.all(enabled.map(async (sequence) => ({ ...sequence, steps: await db.select().from(followUpSteps).where(eq(followUpSteps.sequenceId, sequence.id)).orderBy(asc(followUpSteps.position)) })));
}

export async function createFollowUpSequence(input: typeof followUpSequences.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(followUpSequences).values(input);
  return Number(result[0].insertId);
}

export async function createFollowUpStep(input: typeof followUpSteps.$inferInsert) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(followUpSteps).values(input);
  return Number(result[0].insertId);
}

export async function setFollowUpSequenceEnabled(sequenceId: number, ownerOpenId: string, enabled: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(followUpSequences).set({ enabled, updatedAt: new Date() }).where(and(eq(followUpSequences.id, sequenceId), eq(followUpSequences.ownerOpenId, ownerOpenId)));
  const sequence = await db.select().from(followUpSequences).where(and(eq(followUpSequences.id, sequenceId), eq(followUpSequences.ownerOpenId, ownerOpenId))).limit(1);
  if (!sequence[0] || sequence[0].ownerOpenId !== ownerOpenId) throw new Error("Sequence not found");
}
