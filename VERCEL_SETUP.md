# Vercel Deployment Setup

## Environment Variables Required

Set these in your Vercel project settings (Settings → Environment Variables):

### Required
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret for application compatibility and any remaining signed data (at least 32 characters)
- `OWNER_OPEN_ID` - The Supabase Auth user UUID for the workspace owner
- `PUBLIC_APP_URL` - Your Vercel deployment URL (for example, `https://your-app.vercel.app`)
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase publishable/anon key
- `VITE_SUPABASE_URL` - Same Supabase project URL, exposed to the browser
- `VITE_SUPABASE_ANON_KEY` - Same Supabase publishable/anon key, exposed to the browser
- `CRON_SECRET` - Long random secret used by the scheduled delivery endpoint

### Optional (for integrations)
- `RESEND_API_KEY` - For email delivery
- `RESEND_FROM_EMAIL` - Sender email address
- `TWILIO_ACCOUNT_SID` - For SMS
- `TWILIO_AUTH_TOKEN` - For SMS
- `TWILIO_FROM_NUMBER` - For SMS
- `GOOGLE_CLIENT_ID` - For Google Calendar
- `GOOGLE_CLIENT_SECRET` - For Google Calendar
- `REPLY_WEBHOOK_SECRET` - For reply webhooks
- `BUILT_IN_FORGE_API_URL` - For LLM
- `BUILT_IN_FORGE_API_KEY` - For LLM

## Supabase Auth Configuration

In Supabase Authentication → URL Configuration, set the Site URL to the deployed HTTPS origin and add these redirect URLs:

```text
https://YOUR-DEPLOYED-DOMAIN/auth/callback
http://localhost:3000/auth/callback
```

The application uses Supabase email magic links. The browser stores the Supabase session and sends its access token to the API as a Bearer token. The server validates the token and maps the Supabase user UUID to the existing `users.openId` field.

## Deployment Steps

1. Create a Supabase project and enable the Email provider.
2. Add the Supabase URL and publishable/anon key to Vercel.
3. Create the first Supabase user and set `OWNER_OPEN_ID` to that user's UUID.
4. Set the remaining required variables.
5. Push code to GitHub.
6. Import the project in Vercel or redeploy the existing project.
7. Verify the `/api/health` endpoint and complete a magic-link login.

## Scheduled delivery

The scheduled endpoint is:

```text
POST /api/scheduled/process-delivery
Authorization: Bearer YOUR_CRON_SECRET
```

Configure the Vercel Cron or external scheduler to send this header. Never place `CRON_SECRET` in browser-visible variables.

## Notes

- The app uses a single serverless function for all API routes.
- Static files are served from `dist/public` via Vercel's CDN.
- The build command is `npx pnpm@10.4.1 build`.
- Do not commit `.env` files, Supabase service-role keys, OAuth secrets, or cron secrets.
