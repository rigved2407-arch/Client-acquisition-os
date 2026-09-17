import { describe, expect, it } from "vitest";
import { normalizeReplyPayload } from "./webhooks";

describe("inbound reply normalization", () => {
  it("extracts sender email and text from a Resend-style nested payload", () => {
    expect(normalizeReplyPayload({ data: { from: "Jordan Coach <jordan@example.com>", text: "Yes, let's talk" } })).toEqual({ email: "jordan@example.com", phone: undefined, message: "Yes, let's talk", channel: "email" });
  });

  it("supports SMS channel markers and rejects missing sender", () => {
    expect(normalizeReplyPayload({ sender: "5551234567", body: "Call me", channel: "sms" })).toMatchObject({ phone: "5551234567", channel: "sms" });
    expect(() => normalizeReplyPayload({ body: "No sender" })).toThrow("email or phone");
  });
});
