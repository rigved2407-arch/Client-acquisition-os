import { z } from "zod";
import { invokeLLM } from "./_core/llm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createLead, createLeadActivity, getActivities, getLeadById, getLeads, updateLeadQualification } from "./db";

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
  }),
});

export type AppRouter = typeof appRouter;
