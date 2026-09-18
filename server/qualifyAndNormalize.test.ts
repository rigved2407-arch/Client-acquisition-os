import { describe, expect, it } from "vitest";

describe("normalizeFormPayload edge cases", () => {
  it("handles flat form payloads with all fields", async () => {
    const { normalizeFormPayload } = await import("./webhooks");
    const result = normalizeFormPayload({
      name: "Sarah Connor",
      email: "sarah@example.com",
      phone: "+15559876543",
      company: "FitLife Gym",
      instagramHandle: "@sarahfit",
      goal: "Build muscle mass and compete in fitness competition",
      consent: "Yes, I agree",
      consentText: "I consent to be contacted about coaching",
    });
    expect(result.name).toBe("Sarah Connor");
    expect(result.email).toBe("sarah@example.com");
    expect(result.phone).toBe("+15559876543");
    expect(result.company).toBe("FitLife Gym");
    expect(result.instagramHandle).toBe("@sarahfit");
    expect(result.goal).toContain("Build muscle mass");
    expect(result.consent).toBe(true);
  });

  it("handles nested form payloads with name, email, and goal", async () => {
    const { normalizeFormPayload } = await import("./webhooks");
    const result = normalizeFormPayload({
      name: "Mike Tyson",
      email: "mike@example.com",
      goal: "Train for my first marathon",
      consent: true,
    });
    expect(result.name).toBe("Mike Tyson");
    expect(result.email).toBe("mike@example.com");
    expect(result.goal).toContain("Train for my first marathon");
    expect(result.consent).toBe(true);
  });

  it("treats non-boolean consent as denied", async () => {
    const { normalizeFormPayload } = await import("./webhooks");
    const result = normalizeFormPayload({ name: "Test", email: "test@test.com", goal: "Get fit", consent: false });
    expect(result.consent).toBe(false);
  });

  it("handles consent with truthy string values", async () => {
    const { normalizeFormPayload } = await import("./webhooks");
    const result = normalizeFormPayload({ name: "Test", email: "test@test.com", goal: "Get fit", consent: "agree" });
    expect(result.consent).toBe(true);
  });

  it("captures phone number from form payload", async () => {
    const { normalizeFormPayload } = await import("./webhooks");
    const result = normalizeFormPayload({ name: "Phone Lead", email: "phone@test.com", phone: "+15551112222", goal: "Train for a 5K", consent: true });
    expect(result.phone).toBe("+15551112222");
  });

  it("passes through phone as-is from form payload", async () => {
    const { normalizeFormPayload } = await import("./webhooks");
    const result = normalizeFormPayload({ name: "Messy Phone", email: "messy@test.com", phone: "(555) 123-4567", goal: "Get healthier", consent: true });
    expect(result.phone).toBe("(555) 123-4567");
  });
});

describe("normalizeReplyPayload edge cases", () => {
  it("extracts phone from SMS channel payload", async () => {
    const { normalizeReplyPayload } = await import("./webhooks");
    const result = normalizeReplyPayload({ phone: "+15551234567", text: "Interested in training", channel: "sms" });
    expect(result.phone).toBe("+15551234567");
    expect(result.channel).toBe("sms");
    expect(result.message).toBe("Interested in training");
  });

  it("extracts email from Twilio-style payload", async () => {
    const { normalizeReplyPayload } = await import("./webhooks");
    const result = normalizeReplyPayload({ data: { from: "whatsapp:+15559876543", body: "Hello coach" } });
    expect(result.message).toBe("Hello coach");
  });

  it("defaults message when text is missing", async () => {
    const { normalizeReplyPayload } = await import("./webhooks");
    const result = normalizeReplyPayload({ data: { from: "user@test.com" } });
    expect(result.message).toBe("Inbound reply received");
  });

  it("extracts sender from email field directly", async () => {
    const { normalizeReplyPayload } = await import("./webhooks");
    const result = normalizeReplyPayload({ email: "direct@example.com", text: "Hello" });
    expect(result.email).toBe("direct@example.com");
    expect(result.message).toBe("Hello");
  });

  it("defaults channel to email when not specified", async () => {
    const { normalizeReplyPayload } = await import("./webhooks");
    const result = normalizeReplyPayload({ from: "test@example.com", text: "Hi" });
    expect(result.channel).toBe("email");
  });
});
