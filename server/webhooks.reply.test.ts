import { describe, expect, it } from "vitest";
import { normalizeReplyPayload } from "./webhooks";

describe("inbound reply normalization", () => {
  it("extracts sender email and text from a Resend-style nested payload", () => {
    expect(normalizeReplyPayload({ data: { from: "Jordan Coach <jordan@example.com>", text: "Yes, let's talk" } })).toEqual({ email: "jordan@example.com", message: "Yes, let's talk", channel: "email" });
  });

  it("supports SMS channel markers and rejects missing sender", () => {
    expect(normalizeReplyPayload({ sender: "5551234567@example.com", body: "Call me", channel: "sms" }).channel).toBe("sms");
    expect(() => normalizeReplyPayload({ body: "No sender" })).toThrow("sender email");
  });
});
