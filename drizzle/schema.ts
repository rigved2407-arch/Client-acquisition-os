import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const leads = mysqlTable("leads", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  company: varchar("company", { length: 180 }),
  instagramHandle: varchar("instagramHandle", { length: 120 }),
  source: varchar("source", { length: 80 }).notNull(),
  goal: text("goal"),
  consentAt: timestamp("consentAt"),
  stage: mysqlEnum("stage", ["new", "qualified", "booked", "won", "nurture"]).default("new").notNull(),
  score: int("score").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastActivityAt: timestamp("lastActivityAt").defaultNow().notNull(),
});

export const activities = mysqlTable("activities", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const chatSessions = mysqlTable("chatSessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  leadId: int("leadId"),
  name: varchar("name", { length: 160 }),
  email: varchar("email", { length: 320 }),
  company: varchar("company", { length: 180 }),
  goal: text("goal"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  sessionId: varchar("sessionId", { length: 64 }).notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const calendarConnections = mysqlTable("calendarConnections", {
  id: int("id").autoincrement().primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull().unique(),
  provider: varchar("provider", { length: 40 }).notNull().default("google"),
  calendarId: varchar("calendarId", { length: 320 }).notNull().default("primary"),
  calendarName: varchar("calendarName", { length: 180 }),
  accessToken: text("accessToken").notNull(),
  refreshToken: text("refreshToken").notNull(),
  tokenExpiresAt: timestamp("tokenExpiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const appointments = mysqlTable("appointments", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  provider: varchar("provider", { length: 40 }).notNull().default("google"),
  providerEventId: varchar("providerEventId", { length: 320 }).notNull(),
  startsAt: timestamp("startsAt").notNull(),
  endsAt: timestamp("endsAt").notNull(),
  inviteeName: varchar("inviteeName", { length: 160 }).notNull(),
  inviteeEmail: varchar("inviteeEmail", { length: 320 }).notNull(),
  status: mysqlEnum("status", ["confirmed", "cancelled"]).default("confirmed").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const webhookSources = mysqlTable("webhookSources", {
  id: int("id").autoincrement().primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  name: varchar("name", { length: 120 }).notNull(),
  source: varchar("source", { length: 80 }).notNull().default("Form webhook"),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  enabled: boolean("enabled").default(true).notNull(),
  lastReceivedAt: timestamp("lastReceivedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const automationTasks = mysqlTable("automationTasks", {
  id: int("id").autoincrement().primaryKey(),
  leadId: int("leadId").notNull(),
  type: varchar("type", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["pending", "sent", "blocked", "cancelled", "failed"]).default("pending").notNull(),
  sendAt: timestamp("sendAt").notNull(),
  payload: text("payload"),
  attempts: int("attempts").default(0).notNull(),
  lastError: text("lastError"),
  deliveredAt: timestamp("deliveredAt"),
  providerMessageId: varchar("providerMessageId", { length: 320 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const deliverySettings = mysqlTable("deliverySettings", {
  id: int("id").autoincrement().primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull().unique(),
  provider: mysqlEnum("provider", ["none", "resend", "gmail"]).default("none").notNull(),
  fromEmail: varchar("fromEmail", { length: 320 }),
  enabled: boolean("enabled").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const followUpSequences = mysqlTable("followUpSequences", {
  id: int("id").autoincrement().primaryKey(),
  ownerOpenId: varchar("ownerOpenId", { length: 64 }).notNull(),
  name: varchar("name", { length: 160 }).notNull(),
  trigger: varchar("trigger", { length: 80 }).notNull().default("qualified"),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const followUpSteps = mysqlTable("followUpSteps", {
  id: int("id").autoincrement().primaryKey(),
  sequenceId: int("sequenceId").notNull(),
  position: int("position").notNull(),
  delayMinutes: int("delayMinutes").notNull().default(0),
  channel: mysqlEnum("channel", ["email", "sms", "task"]).default("email").notNull(),
  subject: varchar("subject", { length: 220 }),
  body: text("body").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Lead = typeof leads.$inferSelect;
export type InsertLead = typeof leads.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type InsertActivity = typeof activities.$inferSelect;
export type ChatSession = typeof chatSessions.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type Appointment = typeof appointments.$inferSelect;
export type WebhookSource = typeof webhookSources.$inferSelect;
export type AutomationTask = typeof automationTasks.$inferSelect;
export type DeliverySettings = typeof deliverySettings.$inferSelect;
export type FollowUpSequence = typeof followUpSequences.$inferSelect;
export type FollowUpStep = typeof followUpSteps.$inferSelect;
