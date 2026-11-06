import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { createSession } from "@/lib/auth";
import { appOrigin, googleEnabled, googleProfile, userForSocial } from "@/lib/social-auth";

/** Google sends the user back here with ?code&state. */
export async function GET(req: NextRequest) {
  const origin = await appOrigin();
  const fail = () => NextResponse.redirect(`${origin}/login?error=google`);
  const store = await cookies();
  const expected = store.get("oauth_state")?.value;
  store.delete({ name: "oauth_state", path: "/api/auth/google" });

  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  if (!googleEnabled() || !code || !state || state !== expected) return fail();

  try {
    const userId = await userForSocial(await googleProfile(code));
    await createSession(userId);
  } catch (e) {
    console.error("[google login]", e);
    return fail();
  }
  return NextResponse.redirect(`${origin}/events`);
}
