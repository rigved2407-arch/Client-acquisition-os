import { describe, expect, it } from "vitest";

describe("Google Calendar OAuth configuration", () => {
  it("recognizes the configured OAuth client at Google’s token endpoint", async () => {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    expect(clientId).toBeTruthy();
    expect(clientSecret).toBeTruthy();

    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId!,
        client_secret: clientSecret!,
        grant_type: "authorization_code",
        code: "coachflow-credential-check",
        redirect_uri: "https://3000-irzrkbu6w5at3p6zlcc9b-a955a62c.sg2.manus.computer/api/calendar/google/callback",
      }),
    });
    const payload = await response.json() as { error?: string };
    expect(response.status).toBe(400);
    expect(payload.error).not.toBe("invalid_client");
  }, 15000);
});
