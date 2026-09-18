function requireEnv(name: string, fallback = ""): string {
  const value = process.env[name] ?? fallback;
  if (!value && process.env.NODE_ENV === "production") {
    console.warn(`[ENV] WARNING: ${name} is not set. Some features may not work.`);
  }
  return value;
}

export const ENV = {
  appId: requireEnv("VITE_APP_ID"),
  cookieSecret: requireEnv("JWT_SECRET"),
  databaseUrl: requireEnv("DATABASE_URL"),
  oAuthServerUrl: requireEnv("OAUTH_SERVER_URL"),
  ownerOpenId: requireEnv("OWNER_OPEN_ID"),
  ownerName: process.env.OWNER_NAME ?? "",
  publicAppUrl: requireEnv("PUBLIC_APP_URL"),
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: requireEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: requireEnv("BUILT_IN_FORGE_API_KEY"),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "",
  replyWebhookSecret: process.env.REPLY_WEBHOOK_SECRET ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
};

export function validateRequiredEnv(): void {
  const required = ["DATABASE_URL", "JWT_SECRET", "OAUTH_SERVER_URL", "OWNER_OPEN_ID", "VITE_APP_ID"];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error(`[ENV] FATAL: Missing required environment variables: ${missing.join(", ")}`);
    console.error("[ENV] Please set these in your .env file or environment.");
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}
