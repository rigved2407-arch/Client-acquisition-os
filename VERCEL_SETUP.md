# Vercel Deployment Setup

## Environment Variables Required

Set these in your Vercel project settings (Settings → Environment Variables):

### Required
- `DATABASE_URL` - MySQL connection string
- `JWT_SECRET` - Secret for session cookies
- `OAUTH_SERVER_URL` - OAuth server URL
- `OWNER_OPEN_ID` - Your user's open ID
- `VITE_APP_ID` - App ID for OAuth
- `VITE_OAUTH_PORTAL_URL` - Browser-facing OAuth portal URL used by the Sign in button

### Optional (for integrations)
- `PUBLIC_APP_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
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

## Deployment Steps

1. Push code to GitHub
2. Import project in Vercel dashboard
3. Set environment variables
4. Deploy

## Notes

- The app uses a single serverless function for all API routes
- Static files are served from `dist/public` via Vercel's CDN
- The build command is `npx pnpm@10.4.1 build`
