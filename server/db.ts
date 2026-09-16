import { asc, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { activities, Activity, chatMessages, chatSessions, ChatMessage, ChatSession, InsertLead, InsertUser, leads, users } from "../drizzle/schema";
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
