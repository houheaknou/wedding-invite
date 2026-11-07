import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createSession, getCurrentUser } from "@/features/auth/session";
import { appOrigin, googleEnabled, googleProfile, linkSocial, LinkRequiresLogin, SocialIdTaken, userForSocial } from "@/features/auth/social";

/** Google sends the user back here with ?code&state. */
export async function GET(req: NextRequest) {
  const origin = await appOrigin();
  const fail = () => NextResponse.redirect(`${origin}/login?error=google`);
  const store = await cookies();
  const expected = store.get("oauth_state")?.value;
  const linking = store.get("oauth_link")?.value === "1";
  store.delete({ name: "oauth_state", path: "/api/auth/google" });
  store.delete({ name: "oauth_link", path: "/api/auth/google" });

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!googleEnabled() || !code || !state || state !== expected) return fail();

  // Linking from My account: attach this Google account to the signed-in user
  const current = linking ? await getCurrentUser() : null;
  if (current) {
    try {
      await linkSocial(current.id, await googleProfile(code));
      return NextResponse.redirect(`${origin}/account?linked=google`);
    } catch (e) {
      if (!(e instanceof SocialIdTaken)) console.error("[google link]", e);
      return NextResponse.redirect(`${origin}/account?error=${e instanceof SocialIdTaken ? "google_taken" : "google"}`);
    }
  }

  try {
    const userId = await userForSocial(await googleProfile(code));
    await createSession(userId);
  } catch (e) {
    if (e instanceof LinkRequiresLogin) return NextResponse.redirect(`${origin}/login?error=google_link`);
    console.error("[google login]", e);
    return fail();
  }
  return NextResponse.redirect(`${origin}/events`);
}
