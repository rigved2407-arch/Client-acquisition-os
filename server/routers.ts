import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createChatMessage, createChatSession, createLead, createLeadActivity, createAppointment, getActivities, getCalendarConnection, getChatMessages, getChatSession, getLeadById, getLeads, updateChatSession, updateLeadQualification, updateLeadStage } from "./db";
import { createGoogleEvent, getGoogleConnectUrl, listBusyEvents } from "./googleCalendar";
import { ENV } from "./_core/env";

const demoLeads = [
  { id: 101, name: "Avery Cole", email: "avery@coleadvisory.com", company: "Cole Advisory", source: "LinkedIn", goal: "Build a predictable client pipeline", stage: "qualified", score: 92, createdAt: new Date("2026-09-16T14:20:00Z"), lastActivityAt: new Date("2026-09-17T02:40:00Z") },
  { id: 102, name: "Jordan Patel", email: "jordan@northstar.co", company: "Northstar Co.", source: "Referral", goal: "Turn expertise into a premium offer", stage: "booked", score: 88, createdAt: new Date("2026-09-16T10:15:00Z"), lastActivityAt: new Date("2026-09-16T18:30:00Z") },
  { id: 103, name: "Mia Thompson", email: "mia@buildwithmia.com", company: "Build With Mia", source: "Website", goal: "Get consistent discovery calls", stage: "new", score: 74, createdAt: new Date("2026-09-17T01:05:00Z"), lastActivityAt: new Date("2026-09-17T01:05:00Z") },
  { id: 104, name: "Chris Morgan", email: "chris@clearpath.io", company: "Clearpath", source: "Instagram", goal: "Improve close rate without more calls", stage: "nurture", score: 61, createdAt: new Date("2026-09-15T20:10:00Z"), lastActivityAt: new Date("2026-09-16T11:12:00Z") },
  { id: 105, name: "Sam Rivera", email: "sam@riveragrowth.com", company: "Rivera Growth", source: "Workshop", goal: "Launch a group coaching program", stage: "won", score: 96, createdAt: new Date("2026-09-14T16:40:00Z"), lastActivityAt: new Date("2026-09-16T09:20:00Z") },
];

const demoActivities = [
  { id: 1, type: "qualified", title: "Avery Cole was qualified by AI", description: "Strong fit · pipeline goal · 92/100 intent score", createdAt: new Date("2026-09-17T02:40:00Z") },
  { id: 2, type: "booked", title: "Jordan Patel booked a strategy call", description: "Tomorrow at 10:30 AM · Referral", createdAt: new Date("2026-09-16T18:30:00Z") },
  { id: 3, type: "reply", title: "Mia replied to nurture email", description: "Asked about the 90-day implementation sprint", createdAt: new Date("2026-09-17T01:18:00Z") },
  { id: 4, type: "won", title: "Sam Rivera became a client", description: "$4,500 offer · Workshop lead", createdAt: new Date("2026-09-16T09:20:00Z") },
];

function statsFor(items: Array<{ stage: string }>) {
  const booked = items.filter((lead) => lead.stage === "booked").length;
  const qualified = items.filter((lead) => ["qualified", "booked", "won"].includes(lead.stage)).length;
  const won = items.filter((lead) => lead.stage === "won").length;
  return { totalLeads: items.length, qualified, booked, won, qualificationRate: items.length ? Math.round((qualified / items.length) * 100) : 0, bookingRate: qualified ? Math.round((booked / qualified) * 100) : 0, pipelineValue: won * 4500 + booked * 4500 };
}

const leadInput = z.object({
  name: z.string().trim().min(2).max(160),
  email: z.string().trim().email().max(320),
  company: z.string().trim().max(180).optional(),
  goal: z.string().trim().min(10).max(2000),
  source: z.string().trim().max(80).default("Website"),
});

const chatInput = z.object({
  sessionId: z.string().trim().min(8).max(64),
  message: z.string().trim().min(1).max(2000),
});

async function qualifyWithAI(input: z.infer<typeof leadInput>) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You qualify inbound coaching prospects. Score fit and intent from 0 to 100. A qualified prospect has a clear business goal, urgency, and plausible readiness to invest. Use nurture for unclear or low-intent submissions. Never make promises. Return only JSON." },
        { role: "user", content: `Name: ${input.name}\nCompany: ${input.company ?? "Not provided"}\nGoal: ${input.goal}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "inbound_lead_qualification",
          strict: true,
          schema: {
            type: "object",
            properties: {
              score: { type: "integer", description: "Fit and intent score from 0 to 100" },
              stage: { type: "string", enum: ["qualified", "nurture"] },
              summary: { type: "string", description: "One sentence describing the fit" },
              nextStep: { type: "string", description: "One practical next step for the coach" },
            },
            required: ["score", "stage", "summary", "nextStep"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "{}");
    return { score: Math.max(0, Math.min(100, Number(parsed.score) || 0)), stage: parsed.stage === "qualified" ? "qualified" as const : "nurture" as const, summary: String(parsed.summary || "Qualification completed."), nextStep: String(parsed.nextStep || "Review the lead and decide whether to invite them to a call.") };
  } catch {
    return { score: 50, stage: "nurture" as const, summary: "AI qualification was unavailable, so this lead has been safely placed in nurture for review.", nextStep: "Review this lead manually before sending an invitation." };
  }
}

async function replyWithAI(input: { message: string; history: Array<{ role: "user" | "assistant"; content: string }>; profile: { name?: string | null; email?: string | null; company?: string | null; goal?: string | null } }) {
  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "You are CoachFlow, a warm and concise AI concierge for a coaching business. Understand a prospect's goal and collect their name, work email, company or brand, and desired outcome. Ask only one short question at a time. Do not pressure, diagnose, or promise results. Once you have name, valid email, and a clear goal, thank them and say a coach will review their answers. Return only JSON." },
        { role: "user", content: `Known profile: ${JSON.stringify(input.profile)}\nConversation:\n${input.history.map((item) => `${item.role}: ${item.content}`).join("\n")}\nNew message: ${input.message}` },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "concierge_reply",
          strict: true,
          schema: {
            type: "object",
            properties: {
              reply: { type: "string" },
              name: { type: ["string", "null"] },
              email: { type: ["string", "null"] },
              company: { type: ["string", "null"] },
              goal: { type: ["string", "null"] },
              ready: { type: "boolean" },
              score: { type: "integer" },
            },
            required: ["reply", "name", "email", "company", "goal", "ready", "score"],
            additionalProperties: false,
          },
        },
      },
    });
    const content = response.choices?.[0]?.message?.content;
    const parsed = JSON.parse(typeof content === "string" ? content : "{}");
    return { reply: String(parsed.reply || "Thanks for sharing. What would you like to improve first?"), name: parsed.name || null, email: parsed.email || null, company: parsed.company || null, goal: parsed.goal || null, ready: Boolean(parsed.ready), score: Math.max(0, Math.min(100, Number(parsed.score) || 0)) };
  } catch {
    const email = input.message.match(/[\w.+-]+@[\w-]+\.[\w.-]+/)?.[0] ?? null;
    return { reply: email ? "Thanks — I have your email. What is the biggest outcome you want help creating in the next 90 days?" : "I can help with that. What is the biggest outcome you want help creating in the next 90 days?", name: input.profile.name || null, email, company: input.profile.company || null, goal: input.profile.goal || null, ready: false, score: 0 };
  }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  growth: router({
    overview: protectedProcedure.query(async () => {
      const [liveLeads, liveActivities] = await Promise.all([getLeads(), getActivities()]);
      const usingDemo = liveLeads.length === 0;
      const items = usingDemo ? demoLeads : liveLeads;
      const activityItems = usingDemo ? demoActivities : liveActivities;
      return { leads: items, activities: activityItems, stats: statsFor(items), usingDemo };
    }),
    createLead: publicProcedure.input(leadInput).mutation(async ({ input }) => {
      const qualification = await qualifyWithAI(input);
      const leadId = await createLead({ ...input, stage: "new", score: 0 });
      await updateLeadQualification(leadId, qualification.stage, qualification.score);
      await createLeadActivity({ leadId, type: "qualified", title: `${input.name} was qualified by AI`, description: `${qualification.summary} · ${qualification.score}/100 intent score` });
      const lead = await getLeadById(leadId);
      return { success: true, lead, qualification };
    }),
    qualifyLead: publicProcedure.input(z.object({ transcript: z.string().min(10) })).mutation(async ({ input }) => qualifyWithAI({ name: "Prospect", email: "prospect@example.com", goal: input.transcript, source: "Manual test" })),
    chat: publicProcedure.input(chatInput).mutation(async ({ input }) => {
      let session = await getChatSession(input.sessionId);
      if (!session) {
        await createChatSession(input.sessionId);
        session = await getChatSession(input.sessionId);
      }
      if (!session) throw new Error("Could not start chat session");

      const history = await getChatMessages(input.sessionId);
      await createChatMessage({ sessionId: input.sessionId, role: "user", content: input.message });
      const result = await replyWithAI({ message: input.message, history, profile: session });
      const nextProfile = { name: result.name || session.name, email: result.email || session.email, company: result.company || session.company, goal: result.goal || session.goal };
      await updateChatSession(input.sessionId, nextProfile);

      let lead = session.leadId ? await getLeadById(session.leadId) : undefined;
      if (!lead && result.ready && nextProfile.name && nextProfile.email && nextProfile.goal) {
        const leadId = await createLead({ name: nextProfile.name, email: nextProfile.email, company: nextProfile.company || undefined, source: "AI concierge", goal: nextProfile.goal, stage: "new", score: 0 });
        await updateLeadQualification(leadId, "qualified", result.score);
        await createLeadActivity({ leadId, type: "qualified", title: `${nextProfile.name} was qualified by AI concierge`, description: `Conversation captured · ${result.score}/100 intent score` });
        await updateChatSession(input.sessionId, { leadId });
        lead = await getLeadById(leadId);
      }
      await createChatMessage({ sessionId: input.sessionId, role: "assistant", content: result.reply });
      return { reply: result.reply, profile: nextProfile, leadCreated: Boolean(lead && !session.leadId), lead };
    }),
  }),
  calendar: router({
    connect: protectedProcedure.query(({ ctx }) => ({ url: getGoogleConnectUrl(ctx.req, ctx.user.openId) })),
    status: protectedProcedure.query(async ({ ctx }) => ({ connected: Boolean(await getCalendarConnection(ctx.user.openId)) })),
    availability: publicProcedure.input(z.object({ from: z.string().datetime().optional() })).query(async ({ input }) => {
      const ownerOpenId = ENV.ownerOpenId;
      const connection = await getCalendarConnection(ownerOpenId);
      if (!connection) return { connected: false, slots: [] };
      const from = input.from ? new Date(input.from) : new Date(Date.now() + 60 * 60 * 1000);
      const to = new Date(from.getTime() + 14 * 24 * 60 * 60 * 1000);
      const busy = await listBusyEvents(ownerOpenId, from.toISOString(), to.toISOString());
      const slots: Array<{ startsAt: string; endsAt: string; label: string }> = [];
      const cursor = new Date(from);
      cursor.setUTCMinutes(Math.ceil(cursor.getUTCMinutes() / 30) * 30, 0, 0);
      for (let day = 0; day < 14; day++) {
        const date = new Date(cursor);
        date.setUTCDate(cursor.getUTCDate() + day);
        if ([0, 6].includes(date.getUTCDay())) continue;
        for (let hour = 9; hour < 17; hour++) {
          for (const minute of [0, 30]) {
            const startsAt = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), hour, minute));
            const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
            if (startsAt <= from || startsAt >= to) continue;
            const overlaps = busy.some((event) => event.start && event.end && new Date(event.start).getTime() < endsAt.getTime() && new Date(event.end).getTime() > startsAt.getTime());
            if (!overlaps) slots.push({ startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), label: startsAt.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) });
          }
        }
      }
      return { connected: true, slots: slots.slice(0, 24) };
    }),
    book: publicProcedure.input(z.object({ leadId: z.number().int().positive(), startsAt: z.string().datetime(), endsAt: z.string().datetime() })).mutation(async ({ input }) => {
      const lead = await getLeadById(input.leadId);
      if (!lead) throw new Error("Lead not found");
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (startsAt <= new Date() || endsAt <= startsAt || endsAt.getTime() - startsAt.getTime() > 60 * 60 * 1000) throw new Error("Invalid appointment time");
      const event = await createGoogleEvent(ENV.ownerOpenId, { summary: `Strategy call with ${lead.name}`, description: `CoachFlow qualified lead.\nGoal: ${lead.goal || "Not provided"}\nSource: ${lead.source}`, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), attendeeName: lead.name, attendeeEmail: lead.email });
      await createAppointment({ leadId: lead.id, ownerOpenId: ENV.ownerOpenId, provider: "google", providerEventId: event.id, startsAt, endsAt, inviteeName: lead.name, inviteeEmail: lead.email, status: "confirmed" });
      await updateLeadStage(lead.id, "booked");
      await createLeadActivity({ leadId: lead.id, type: "booked", title: `${lead.name} booked a strategy call`, description: `${startsAt.toLocaleString()} · Google Calendar` });
      return { success: true, eventId: event.id, htmlLink: event.htmlLink, hangoutLink: event.hangoutLink, startsAt: startsAt.toISOString() };
    }),
  }),
});

export type AppRouter = typeof appRouter;
