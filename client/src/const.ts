import { OAUTH_STATE_COOKIE, encodeOAuthState } from "@shared/const";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

// Start the Manus OAuth login. Call this from an event handler or effect at the
// moment you want to navigate, e.g. `onClick={() => startLogin()}`.
//
// It has SIDE EFFECTS — it mints a one-time nonce, writes the __Host- state
// cookie, and navigates immediately — so the cookie nonce always matches the
// `state` it sends. Do NOT call it during render (no `href={startLogin()}` /
// `loginUrl={...}`): each call overwrites the cookie, so a stray render-phase
// call would desync it from an in-flight login and the callback would reject it
// with "invalid oauth state". It returns void by design, so there is no URL to
// stash across renders.
export const startLogin = () => {
  const oauthPortalUrl = String(import.meta.env.VITE_OAUTH_PORTAL_URL || "").trim();
  const appId = String(import.meta.env.VITE_APP_ID || "").trim();
  if (!oauthPortalUrl || !appId) {
    const missing = [!oauthPortalUrl && "VITE_OAUTH_PORTAL_URL", !appId && "VITE_APP_ID"].filter(Boolean).join(" and ");
    const message = `Sign-in is not configured. Set ${missing} in the production build environment and redeploy.`;
    console.error(`[Auth] ${message}`);
    window.alert(message);
    return;
  }
  const redirectUri = `${window.location.origin}/api/oauth/callback`;

  const nonce = crypto.randomUUID();
  document.cookie = `${OAUTH_STATE_COOKIE}=${nonce}; Path=/; Max-Age=600; SameSite=None; Secure`;
  const state = encodeOAuthState({ redirectUri, nonce });

  let url: URL;
  try {
    url = new URL(`${oauthPortalUrl.replace(/\/$/, "")}/app-auth`);
  } catch (error) {
    console.error("[Auth] Invalid VITE_OAUTH_PORTAL_URL", error);
    window.alert("Sign-in is unavailable because the OAuth portal URL is invalid.");
    return;
  }
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  window.location.href = url.toString();
};
