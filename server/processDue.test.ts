import { describe, expect, it, vi, beforeEach } from "vitest";

const mockTasks: Array<{ task: { id: number; leadId: number; type: string; status: string; payload: string | null; attempts: number }; lead: { id: number; name: string; email: string; phone: string | null; consentAt: Date | null; automationPaused: boolean; unsubscribedAt: Date | null } }> = [];

vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  getDeliverySettings: vi.fn().mockResolvedValue({ provider: "none", enabled: false, fromEmail: null }),
  listDueAutomationTasks: vi.fn().mockImplementation(() => Promise.resolve(mockTasks)),
  markAutomationTaskAttempt: vi.fn().mockResolvedValue(undefined),
  markAutomationTaskBlocked: vi.fn().mockResolvedValue(undefined),
  markAutomationTaskFailed: vi.fn().mockResolvedValue(undefined),
  markAutomationTaskSent: vi.fn().mockResolvedValue(undefined),
}));

describe("processDueAutomationTasks", () => {
  beforeEach(() => {
    mockTasks.length = 0;
  });

  it("returns zero summary when delivery provider is disabled", async () => {
    const { processDueAutomationTasks } = await import("./delivery");
    mockTasks.push({
      task: { id: 1, leadId: 1, type: "follow_up_email", status: "pending", payload: JSON.stringify({ channel: "email", body: "Hello" }), attempts: 0 },
      lead: { id: 1, name: "Test", email: "test@test.com", phone: null, consentAt: new Date(), automationPaused: false, unsubscribedAt: null },
    });
    const result = await processDueAutomationTasks("test-owner");
    expect(result.scanned).toBe(1);
    expect(result.blocked).toBe(1);
    expect(result.sent).toBe(0);
  });

  it("blocks tasks for leads without consent", async () => {
    const { processDueAutomationTasks } = await import("./delivery");
    mockTasks.push({
      task: { id: 2, leadId: 2, type: "follow_up_email", status: "pending", payload: JSON.stringify({ channel: "email", body: "Test" }), attempts: 0 },
      lead: { id: 2, name: "No Consent", email: "no@test.com", phone: null, consentAt: null, automationPaused: false, unsubscribedAt: null },
    });
    const result = await processDueAutomationTasks("test-owner");
    expect(result.blocked).toBe(1);
  });

  it("blocks tasks for unsubscribed leads", async () => {
    const { processDueAutomationTasks } = await import("./delivery");
    mockTasks.push({
      task: { id: 3, leadId: 3, type: "follow_up_email", status: "pending", payload: JSON.stringify({ channel: "email", body: "Test" }), attempts: 0 },
      lead: { id: 3, name: "Unsubscribed", email: "unsub@test.com", phone: null, consentAt: new Date(), automationPaused: false, unsubscribedAt: new Date() },
    });
    const result = await processDueAutomationTasks("test-owner");
    expect(result.blocked).toBe(1);
  });

  it("blocks tasks for paused automation", async () => {
    const { processDueAutomationTasks } = await import("./delivery");
    mockTasks.push({
      task: { id: 4, leadId: 4, type: "follow_up_email", status: "pending", payload: JSON.stringify({ channel: "email", body: "Test" }), attempts: 0 },
      lead: { id: 4, name: "Paused", email: "paused@test.com", phone: null, consentAt: new Date(), automationPaused: true, unsubscribedAt: null },
    });
    const result = await processDueAutomationTasks("test-owner");
    expect(result.blocked).toBe(1);
  });

  it("skips task-type channel tasks", async () => {
    const { processDueAutomationTasks } = await import("./delivery");
    mockTasks.push({
      task: { id: 5, leadId: 5, type: "task_reminder", status: "pending", payload: JSON.stringify({ channel: "task", body: "Follow up manually" }), attempts: 0 },
      lead: { id: 5, name: "Task Lead", email: "task@test.com", phone: null, consentAt: new Date(), automationPaused: false, unsubscribedAt: null },
    });
    const result = await processDueAutomationTasks("test-owner");
    expect(result.skipped).toBe(1);
  });

  it("blocks SMS tasks when lead has no phone number", async () => {
    const { processDueAutomationTasks } = await import("./delivery");
    mockTasks.push({
      task: { id: 6, leadId: 6, type: "follow_up_sms", status: "pending", payload: JSON.stringify({ channel: "sms", body: "Hello" }), attempts: 0 },
      lead: { id: 6, name: "No Phone", email: "nophone@test.com", phone: null, consentAt: new Date(), automationPaused: false, unsubscribedAt: null },
    });
    const result = await processDueAutomationTasks("test-owner");
    expect(result.blocked).toBe(1);
  });
});
