import { supabase } from "@/lib/supabase";

export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/** Send a Supabase magic-link email for dashboard access. */
export const startLogin = async () => {
  const email = window.prompt("Enter your email to receive a sign-in link:")?.trim();
  if (!email) return;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });

  if (error) {
    console.error("[Supabase] Login failed", error);
    window.alert(error.message);
    return;
  }

  window.alert("Check your email for the sign-in link.");
};
