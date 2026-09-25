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
  supabaseUrl: requireEnv("SUPABASE_URL"),
  supabaseAnonKey: requireEnv("SUPABASE_ANON_KEY"),
  cronSecret: process.env.CRON_SECRET ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: requireEnv("BUILT_IN_FORGE_API_URL"),
  forgeApiKey: requireEnv("BUILT_IN_FORGE_API_KEY"),
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  resendFromEmail: process.env.RESEND_FROM_EMAIL ?? "",
  resendWebhookSecret: process.env.RESEND_WEBHOOK_SECRET ?? "",
  replyWebhookSecret: process.env.REPLY_WEBHOOK_SECRET ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePriceStarterMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY ?? "",
  stripePriceStarterYearly: process.env.STRIPE_PRICE_STARTER_YEARLY ?? "",
  stripePriceProMonthly: process.env.STRIPE_PRICE_PRO_MONTHLY ?? "",
  stripePriceProYearly: process.env.STRIPE_PRICE_PRO_YEARLY ?? "",
};

export function validateRequiredEnv(): void {
  const required = ["DATABASE_URL", "JWT_SECRET", "OWNER_OPEN_ID", "PUBLIC_APP_URL", "SUPABASE_URL", "SUPABASE_ANON_KEY"];
  const missing = required.filter((key) => !process.env[key]);
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    missing.push("JWT_SECRET (must be at least 32 characters)");
  }
  if (process.env.PUBLIC_APP_URL) {
    try {
      const url = new URL(process.env.PUBLIC_APP_URL);
      if (!['http:', 'https:'].includes(url.protocol)) missing.push("PUBLIC_APP_URL (must use http or https)");
    } catch {
      missing.push("PUBLIC_APP_URL (must be a valid URL)");
    }
  }
  if (missing.length > 0) {
    console.error(`[ENV] FATAL: Missing required environment variables: ${missing.join(", ")}`);
    console.error("[ENV] Please set these in your .env file or environment.");
    if (process.env.NODE_ENV === "production") {
      process.exit(1);
    }
  }
}
