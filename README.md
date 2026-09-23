# CoachFlow Acquisition OS

CoachFlow is a multi-surface acquisition workspace for coaching businesses. It captures inbound leads, qualifies them with AI-assisted scoring, routes prospects to signed booking links, and coordinates calendar and follow-up workflows.

## Local development

1. Copy `.env.example` to `.env` and provide the core development values.
2. Install dependencies with `pnpm install --frozen-lockfile`.
3. Run `pnpm dev`.
4. Run `pnpm check`, `pnpm test`, and `pnpm build` before opening a release PR.

## Production deployment

The repository is configured for Vercel. The build produces the browser bundle in `dist/public` and the serverless entrypoint is `api/index.ts`. Set the required variables in the Vercel project before deploying:

- `DATABASE_URL`
- `JWT_SECRET` (at least 32 characters)
- `OAUTH_SERVER_URL`
- `OWNER_OPEN_ID`
- `VITE_APP_ID`
- `PUBLIC_APP_URL` (the final HTTPS origin)

Optional provider variables enable Resend, Twilio, Google Calendar, built-in AI, and Stripe subscriptions. Use the exact names in `.env.example`; do not commit secrets. Configure Stripe and Resend webhook URLs against the deployed HTTPS origin and keep their signing secrets enabled before enabling real delivery.

## Release checklist

- Apply and verify all Drizzle migrations against the production database.
- Confirm OAuth redirect URLs and `PUBLIC_APP_URL` use the same HTTPS origin.
- Configure a verified sending domain and unsubscribe/reply webhooks before enabling automated outreach.
- Configure Stripe products and price IDs, then test checkout, portal, and subscription webhook events in Stripe test mode.
- Create a test webhook source and submit a consented lead; verify qualification, follow-up scheduling, signed booking, reply pause, and unsubscribe behavior.
- Verify `/api/health` returns `{"status":"ok"}` after deployment.
- Review CI output for typecheck, tests, and production build before promoting a release.

## Data and security notes

Tenant-scoped procedures require an authenticated owner and all signed booking links are time-limited. Webhooks require provider signatures or source tokens, request bodies are capped at 2 MB, and API traffic is rate limited. The in-memory limiter is suitable for a single instance or low-volume deployment; high-volume multi-instance deployments should replace it with a shared Redis-backed limiter before scaling.

## Commercial readiness

The product includes a self-serve onboarding path and Stripe checkout/portal procedures. Pricing copy in onboarding is illustrative until the matching Stripe price IDs are configured. Do not advertise a plan as active until the corresponding Stripe products, taxes, invoices, cancellation flow, support contact, and terms/privacy pages have been reviewed for the target market.
