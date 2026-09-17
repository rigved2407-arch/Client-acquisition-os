import { relations } from "drizzle-orm";
import {
  users,
  leads,
  activities,
  chatSessions,
  chatMessages,
  calendarConnections,
  appointments,
  webhookSources,
  automationTasks,
  deliverySettings,
  followUpSequences,
  followUpSteps,
} from "./schema";

export const leadRelations = relations(leads, ({ many }) => ({
  activities: many(activities),
  appointments: many(appointments),
  automationTasks: many(automationTasks),
  chatSessions: many(chatSessions),
}));

export const activityRelations = relations(activities, ({ one }) => ({
  lead: one(leads, {
    fields: [activities.leadId],
    references: [leads.id],
  }),
}));

export const chatSessionRelations = relations(chatSessions, ({ one, many }) => ({
  lead: one(leads, {
    fields: [chatSessions.leadId],
    references: [leads.id],
  }),
  messages: many(chatMessages),
}));

export const chatMessageRelations = relations(chatMessages, ({ one }) => ({
  session: one(chatSessions, {
    fields: [chatMessages.sessionId],
    references: [chatSessions.id],
  }),
}));

export const calendarConnectionRelations = relations(calendarConnections, ({ one }) => ({
  user: one(users, {
    fields: [calendarConnections.ownerOpenId],
    references: [users.openId],
  }),
}));

export const appointmentRelations = relations(appointments, ({ one }) => ({
  lead: one(leads, {
    fields: [appointments.leadId],
    references: [leads.id],
  }),
  owner: one(users, {
    fields: [appointments.ownerOpenId],
    references: [users.openId],
  }),
}));

export const webhookSourceRelations = relations(webhookSources, ({ one }) => ({
  owner: one(users, {
    fields: [webhookSources.ownerOpenId],
    references: [users.openId],
  }),
}));

export const automationTaskRelations = relations(automationTasks, ({ one }) => ({
  lead: one(leads, {
    fields: [automationTasks.leadId],
    references: [leads.id],
  }),
}));

export const deliverySettingsRelations = relations(deliverySettings, ({ one }) => ({
  owner: one(users, {
    fields: [deliverySettings.ownerOpenId],
    references: [users.openId],
  }),
}));

export const followUpSequenceRelations = relations(followUpSequences, ({ one, many }) => ({
  owner: one(users, {
    fields: [followUpSequences.ownerOpenId],
    references: [users.openId],
  }),
  steps: many(followUpSteps),
}));

export const followUpStepRelations = relations(followUpSteps, ({ one }) => ({
  sequence: one(followUpSequences, {
    fields: [followUpSteps.sequenceId],
    references: [followUpSequences.id],
  }),
}));
