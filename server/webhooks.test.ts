import { describe, expect, it } from "vitest";
import { normalizeFormPayload } from "./webhooks";

describe("form webhook intake", () => {
  it("normalizes nested Typeform-style answers", () => {
    const result = normalizeFormPayload({
      form_response: {
        answers: [
          { field: { ref: "full_name" }, text: "Jamie Lee" },
          { field: { ref: "email" }, email: "jamie@example.com" },
          { field: { ref: "fitness_goal" }, text: "Lose 15 pounds and build a consistent training routine" },
          { field: { ref: "instagram_handle" }, text: "@jamielee" },
          { field: { ref: "consent" }, boolean: true },
        ],
      },
    });
    expect(result.name).toBe("Jamie Lee");
    expect(result.email).toBe("jamie@example.com");
    expect(result.goal).toContain("Lose 15 pounds");
    expect(result.instagramHandle).toBe("@jamielee");
    expect(result.consent).toBe(true);
  });

  it("rejects a lead without contact consent", () => {
    const result = normalizeFormPayload({ name: "Alex", email: "alex@example.com", goal: "Improve my strength", consent: "No" });
    expect(result.consent).toBe(false);
  });
});
